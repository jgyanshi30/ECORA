import type { EmailMessage, EmailProvider } from "./types";

/**
 * Dev-only fallback used when EMAIL_PROVIDER_API_KEY isn't set (CLAUDE.md
 * §13, resolved 2026-08-29: Resend in production, console-log locally).
 * Never used when a real API key is configured — see lib/email/index.ts.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(
      [
        "\n[dev email — no EMAIL_PROVIDER_API_KEY configured, not actually sent]",
        `To: ${message.to}`,
        `Subject: ${message.subject}`,
        "---",
        message.text,
        "",
      ].join("\n")
    );
  }
}
