import { getEmailProvider } from "./index";

/**
 * Best-effort — callers must wrap this in try/catch and log rather than
 * throw. Unlike the auth emails (verification/reset, where a failed send
 * should surface to the caller), a failed update email must never roll back
 * or fail the admin/system mutation that triggered it.
 */
export async function sendComplaintUpdateEmail(to: string, complaintNumber: string, message: string, trackUrl: string): Promise<void> {
  await getEmailProvider().send({
    to,
    subject: `Update on your Ecora report ${complaintNumber}`,
    text: `${message}\n\nTrack your report: ${trackUrl}`,
    html: `<p>${message}</p><p>Track your report: <a href="${trackUrl}">${complaintNumber}</a></p>`,
  });
}
