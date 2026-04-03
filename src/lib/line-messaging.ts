import { messagingApi } from "@line/bot-sdk";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

export async function pushMessage(lineUserId: string, text: string) {
  await client.pushMessage({
    to: lineUserId,
    messages: [{ type: "text", text }],
  });
}
