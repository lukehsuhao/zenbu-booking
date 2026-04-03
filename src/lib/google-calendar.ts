import { google } from "googleapis";
import { prisma } from "./prisma";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(providerId: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.freebusy",
    ],
    state: providerId,
  });
}

export async function handleCallback(code: string, providerId: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      calendarId: "primary",
    },
  });
}

async function getAuthenticatedClient(providerId: string) {
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
  });

  if (!provider.googleAccessToken) {
    throw new Error("Provider has not connected Google Calendar");
  }

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: provider.googleAccessToken,
    refresh_token: provider.googleRefreshToken,
    expiry_date: provider.googleTokenExpiry?.getTime(),
  });

  client.on("tokens", async (tokens) => {
    await prisma.provider.update({
      where: { id: providerId },
      data: {
        googleAccessToken: tokens.access_token ?? provider.googleAccessToken,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : provider.googleTokenExpiry,
      },
    });
  });

  return client;
}

export async function createCalendarEvent(
  providerId: string,
  params: {
    summary: string;
    description: string;
    startTime: string;
    endTime: string;
    attendeeEmail?: string;
    reminderMinutes: number[];
  }
) {
  const authClient = await getAuthenticatedClient(providerId);
  const calendar = google.calendar({ version: "v3", auth: authClient });

  const event = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.startTime, timeZone: "Asia/Taipei" },
      end: { dateTime: params.endTime, timeZone: "Asia/Taipei" },
      attendees: params.attendeeEmail ? [{ email: params.attendeeEmail }] : [],
      conferenceData: {
        createRequest: {
          requestId: `booking-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: params.reminderMinutes.map((minutes) => ({
          method: "email" as const,
          minutes,
        })),
      },
    },
  });

  return {
    eventId: event.data.id!,
    meetUrl: event.data.conferenceData?.entryPoints?.[0]?.uri || null,
  };
}

export async function deleteCalendarEvent(providerId: string, eventId: string) {
  const authClient = await getAuthenticatedClient(providerId);
  const calendar = google.calendar({ version: "v3", auth: authClient });

  await calendar.events.delete({
    calendarId: "primary",
    eventId,
  });
}

export async function getFreeBusy(
  providerId: string,
  date: string
): Promise<{ start: string; end: string }[]> {
  const authClient = await getAuthenticatedClient(providerId);
  const calendar = google.calendar({ version: "v3", auth: authClient });

  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
  });

  const timeMin = `${date}T00:00:00+08:00`;
  const timeMax = `${date}T23:59:59+08:00`;

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      timeZone: "Asia/Taipei",
      items: [{ id: provider.calendarId || "primary" }],
    },
  });

  const busy = res.data.calendars?.[provider.calendarId || "primary"]?.busy || [];
  return busy.map((b) => ({ start: b.start!, end: b.end! }));
}
