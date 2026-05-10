const nodemailer = require('nodemailer');

const SUBJECT = 'Projects Tracker – Password Reset';
const APP_NAME = 'Projects Tracker';

function buildMail(to, resetUrl) {
  const from = process.env.SMTP_FROM || 'no-reply@projectstracker.local';
  return {
    from: `"${APP_NAME}" <${from}>`,
    to,
    subject: SUBJECT,
    text: `You requested a password reset.\n\nClick the link below (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `
      <p>You requested a password reset for your <strong>${APP_NAME}</strong> account.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none">Reset Password</a></p>
      <p style="color:#6b7280;font-size:13px">This link expires in 1 hour. If you did not request this, ignore this email.</p>
    `,
  };
}

async function sendPasswordReset(to, resetUrl) {
  const host = process.env.SMTP_HOST;

  // No SMTP configured — log to console only
  if (!host) {
    console.log(`[email] Password reset for ${to}: ${resetUrl}`);
    return;
  }

  // Ethereal mode — create a throwaway test account and log the preview URL
  if (host === 'ethereal') {
    const testAccount = await nodemailer.createTestAccount();
    const transport = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    const info = await transport.sendMail(buildMail(to, resetUrl));
    console.log(`[email] Ethereal preview: ${nodemailer.getTestMessageUrl(info)}`);
    return;
  }

  // Real SMTP
  const transport = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transport.sendMail(buildMail(to, resetUrl));
}

module.exports = { sendPasswordReset };
