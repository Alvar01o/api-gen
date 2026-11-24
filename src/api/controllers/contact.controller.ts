import { Request, Response } from 'express';
import nodemailer from 'nodemailer';

const TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? 'alvar01omer@gmail.com';

/** Escape HTML special chars to prevent XSS / email header injection */
function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function contactHandler(req: Request, res: Response) {
  const { name, email, subject, message } = req.body as {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
  };

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    res.status(400).json({ error: 'name, email and message are required' });
    return;
  }

  if (!EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: 'invalid email address' });
    return;
  }

  const safeName    = escHtml(name.trim());
  const safeEmail   = escHtml(email.trim());
  const safeSubject = subject?.trim() ? escHtml(subject.trim()) : '';
  const safeMessage = escHtml(message.trim());

  try {
    const transporter = createTransport();

    await transporter.sendMail({
      from: `"api-dyn contact" <${process.env.SMTP_USER}>`,
      to: TO_EMAIL,
      replyTo: email.trim(),
      subject: safeSubject ? `[api-dyn] ${safeSubject}` : `[api-dyn] New message from ${safeName}`,
      text: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:8px;">
          <h2 style="margin:0 0 16px;color:#0f172a;font-size:1.25rem;">New contact message — api-dyn</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <tr><td style="padding:6px 0;color:#64748b;font-size:0.875rem;width:80px;">Name</td><td style="padding:6px 0;color:#0f172a;font-size:0.875rem;">${safeName}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:0.875rem;">Email</td><td style="padding:6px 0;font-size:0.875rem;"><a href="mailto:${safeEmail}" style="color:#2563eb;">${safeEmail}</a></td></tr>
            ${safeSubject ? `<tr><td style="padding:6px 0;color:#64748b;font-size:0.875rem;">Subject</td><td style="padding:6px 0;color:#0f172a;font-size:0.875rem;">${safeSubject}</td></tr>` : ''}
          </table>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:16px;">
            <p style="margin:0;color:#334155;font-size:0.875rem;line-height:1.6;white-space:pre-wrap;">${safeMessage}</p>
          </div>
        </div>
      `,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[contact] failed to send email:', err);
    res.status(500).json({ error: 'failed to send email' });
  }
}
