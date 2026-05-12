import nodemailer from "nodemailer";
import { env } from "@/config/env.js";

export const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.MAIL_USER,
    pass: env.MAIL_APP_PASS,
  },
});
