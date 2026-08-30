import { getEmailProvider } from "./index";

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  await getEmailProvider().send({
    to,
    subject: "Verify your Ecora email",
    text: `Confirm your email address: ${verifyUrl}\n\nThis link expires in 24 hours. If you didn't create an Ecora account, ignore this email.`,
    html: `<p>Confirm your email address for Ecora:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours. If you didn't create an Ecora account, ignore this email.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await getEmailProvider().send({
    to,
    subject: "Reset your Ecora password",
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email — your password won't change.`,
    html: `<p>Reset your Ecora password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email — your password won't change.</p>`,
  });
}
