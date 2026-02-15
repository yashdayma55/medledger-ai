import { Resend } from "resend";
import { getResendApiKey, getResendFrom, getResendTo, isDevOverrideActive } from "./resend-config";

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  expiryMinutes: number
): Promise<{ success: boolean; error?: string }> {
  const apiKey = getResendApiKey(to);
  if (!apiKey) {
    console.error("RESEND_API_KEY (or RESEND_API_KEY_2 for secondary email) is not set");
    return { success: false, error: "Email service not configured" };
  }

  const resend = new Resend(apiKey);
  const sendTo = getResendTo(to);
  const devNote = isDevOverrideActive()
    ? `<p style="color: #94a3b8; font-size: 12px;">[Dev] Actual recipient for this link: ${to}</p>`
    : "";

  const { error } = await resend.emails.send({
    from: getResendFrom(to),
    to: [sendTo],
    subject: "Reset your password – MedLedger-AI",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Reset your password</h2>
        <p>You requested a password reset for your MedLedger-AI account. Click the link below to set a new password:</p>
        <p style="margin: 24px 0;">
          <a href="${resetLink}" style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Reset password</a>
        </p>
        <p style="color: #64748b;">This link expires in ${expiryMinutes} minutes. If you didn't request this, you can ignore this email.</p>
        ${devNote}
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
