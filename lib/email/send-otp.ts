import { Resend } from "resend";
import { getResendApiKey, getResendFrom, getResendTo, isDevOverrideActive } from "./resend-config";

export async function sendVerificationOtpEmail(
  to: string,
  otp: string,
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
    ? `<p style="color: #94a3b8; font-size: 12px;">[Dev] Actual recipient for this code: ${to}</p>`
    : "";

  const { error } = await resend.emails.send({
    from: getResendFrom(to),
    to: [sendTo],
    subject: "Verify your email – MedLedger-AI",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Verify your email</h2>
        <p>Use this code to verify your email address for MedLedger-AI:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #0d9488;">${otp}</p>
        <p style="color: #64748b;">This code expires in ${expiryMinutes} minutes. Do not share it with anyone.</p>
        <p style="color: #64748b;">If you didn't request this, you can ignore this email.</p>
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
