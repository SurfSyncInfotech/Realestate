import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import logger from "../config/logger.js";

// Sends email through SMTP when SMTP_HOST/USER/PASSWORD are configured in
// backend/.env. Without them nothing is sent and callers are told why, so the
// admin screen can say "saved in the customer's dashboard, email not configured".
export function createMailer() {
  const configured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
  let transport;
  const getTransport = () =>
    (transport ??= nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === "true",
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    }));

  return {
    configured,
    async send({ to, subject, text, html }) {
      if (!configured) return { sent: false, reason: "Email is not configured on the server." };
      try {
        await getTransport().sendMail({ from: env.MAIL_FROM || env.SMTP_USER, to, subject, text, html });
        return { sent: true };
      } catch (error) {
        logger.warn({ err: error }, "Email could not be sent");
        return { sent: false, reason: "The email server rejected the message." };
      }
    },
  };
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function replyEmail({ name, body, propertyTitle, dashboardUrl }) {
  const subject = propertyTitle ? `Re: your enquiry about ${propertyTitle}` : "A reply from Estate & Co.";
  const text = `Hello ${name},\n\n${body}\n\nYou can view the conversation and your visits here: ${dashboardUrl}\n\nEstate & Co.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222">
    <h2 style="color:#1f4035">Estate &amp; Co.</h2>
    <p>Hello ${escapeHtml(name)},</p>
    <p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(body)}</p>
    <p><a href="${dashboardUrl}" style="background:#1f4035;color:#fff;padding:12px 22px;border-radius:24px;text-decoration:none;display:inline-block">View conversation</a></p>
    <p style="color:#777;font-size:13px">You are receiving this because you sent an enquiry to Estate &amp; Co.</p></div>`;
  return { subject, text, html };
}
