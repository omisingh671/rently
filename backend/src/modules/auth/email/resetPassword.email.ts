import { env } from "@/config/env.js";
import { mailer } from "@/common/email/mailer.js";

export async function sendResetPasswordEmail(
  to: string,
  token: string,
  options: { appUrl?: string } = {},
) {
  const appUrl = options.appUrl ?? env.FRONTEND_URL;
  const resetUrl = `${appUrl}/reset-password/${token}`;

  if (env.NODE_ENV === "test" || to.endsWith(".test")) {
    return;
  }

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
