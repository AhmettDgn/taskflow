/**
 * App-wide Telegram admin gating.
 *
 * TaskFlow has no global "owner" role (only per-team roles), so the shared bot
 * setup is restricted to an email allowlist configured via the
 * `TELEGRAM_ADMIN_EMAILS` env var (comma-separated). When the var is empty no
 * one can configure the bot through the UI — the deployment must rely on the
 * `TELEGRAM_BOT_TOKEN` env fallback instead.
 */
export function getTelegramAdminEmails(): string[] {
  return (process.env.TELEGRAM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isTelegramAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = getTelegramAdminEmails();
  return allowlist.includes(email.trim().toLowerCase());
}
