export interface Env {
  API_URL: string;
  CRON_SECRET: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const response = await fetch(`${env.API_URL}/api/cron/reminders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CRON_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();
    console.log(`Cron executed: sent ${(result as { sent: number }).sent} reminders`);
  },
};
