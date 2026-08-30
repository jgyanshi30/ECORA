import { ConsoleEmailProvider } from "./console-provider";
import { ResendEmailProvider } from "./resend-provider";
import type { EmailProvider } from "./types";

export type { EmailMessage, EmailProvider } from "./types";

let cached: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;

  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Ecora <no-reply@ecora.example>";

  cached = apiKey ? new ResendEmailProvider(apiKey, from) : new ConsoleEmailProvider();
  return cached;
}
