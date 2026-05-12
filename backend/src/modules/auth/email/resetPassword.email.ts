import { mailer } from "@/common/email/mailer.js";
import { env } from "@/config/env.js";

export async function sendResetPasswordEmail(to: string, token: string) {
  const resetUrl = `${env.FRONTEND_URL}/reset-password/${token}`;

  await mailer.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: "Reset your Sucasa password",
    html: `
      <p>You requested a password reset.</p>
      <p>
        <a href="${resetUrl}">Reset your password</a>
      </p>
      <p>This link expires in 15 minutes.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });
}
