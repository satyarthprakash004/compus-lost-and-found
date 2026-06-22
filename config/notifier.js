require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * Generates a premium responsive HTML email wrapper.
 */
function getEmailHtmlTemplate(title, bodyHtml, ctaText, ctaUrl) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .email-container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow: hidden; border: 1px solid #e2e8f0; }
    .email-header { background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 35px 20px; text-align: center; color: #ffffff; }
    .email-header h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
    .email-header h1 span { color: #93c5fd; }
    .email-body { padding: 40px 30px; color: #334155; line-height: 1.6; }
    .email-title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    .email-card { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 22px; margin: 24px 0; font-size: 15px; color: #475569; }
    .btn-container { text-align: center; margin-top: 32px; margin-bottom: 10px; }
    .btn-action { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(37,99,235,0.25); transition: all 0.2s ease; font-size: 15px; }
    .email-footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>Found<span>It</span></h1>
    </div>
    <div class="email-body">
      <h2 class="email-title">${title}</h2>
      <div class="email-card">
        ${bodyHtml}
      </div>
      ${ctaText && ctaUrl ? `
      <div class="btn-container">
        <a href="${ctaUrl}" class="btn-action" target="_blank">${ctaText}</a>
      </div>
      ` : ''}
    </div>
    <div class="email-footer">
      This is an automated notification from the FoundIt Campus Lost &amp; Found Portal.<br>
      &copy; 2026 FoundIt. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Creates a fresh nodemailer transporter each time (no caching).
 * Supports Gmail (recommended) and any custom SMTP.
 *
 * Gmail setup:
 *   EMAIL_SERVICE=gmail
 *   EMAIL_USER=you@gmail.com
 *   EMAIL_PASS=your-16-char-app-password   <-- NOT your normal password!
 *   EMAIL_FROM="FoundIt Campus" <you@gmail.com>
 *
 * Custom SMTP setup (e.g. Brevo, Mailgun, Hostinger):
 *   EMAIL_HOST=smtp.brevo.com
 *   EMAIL_PORT=587
 *   EMAIL_USER=your-smtp-user
 *   EMAIL_PASS=your-smtp-password
 *   EMAIL_FROM="FoundIt Campus" <you@domain.com>
 */
function createTransporter() {
  const service = process.env.EMAIL_SERVICE; // e.g. "gmail"
  const host    = process.env.EMAIL_HOST;
  const port    = process.env.EMAIL_PORT;
  const user    = process.env.EMAIL_USER;
  const pass    = process.env.EMAIL_PASS;

  if (!user || !pass) return null;

  // Gmail shortcut — no need for host/port when service=gmail
  if (service && service.toLowerCase() === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  // Custom SMTP (Brevo, Mailgun, Hostinger, etc.)
  if (host && port) {
    const portNum = parseInt(port, 10);
    return nodemailer.createTransport({
      host,
      port: portNum,
      secure: portNum === 465,       // true only for SSL port 465
      auth: { user, pass },
      tls: { rejectUnauthorized: false }, // avoids self-signed cert errors on shared hosts
    });
  }

  return null;
}

/**
 * Sends an email notification.
 *
 * If EMAIL_USER + EMAIL_PASS (+ EMAIL_SERVICE or EMAIL_HOST + EMAIL_PORT) are
 * set in env vars, it sends a real email.
 * Otherwise it falls back to console simulation (demo mode).
 *
 * @param {string} to       - Recipient email address
 * @param {string} subject  - Email subject line
 * @param {string} text     - Plain-text fallback body
 * @param {string} [html]   - HTML body (optional; auto-generated if omitted)
 */
async function sendNotification(to, subject, text, html) {
  const from = process.env.EMAIL_FROM || '"FoundIt Campus" <noreply@campusfoundit.com>';
  const finalHtml = html || getEmailHtmlTemplate(subject, text.replace(/\n/g, '<br>'));

  const transporter = createTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        replyTo: process.env.EMAIL_USER || from,
        to,
        subject,
        text,
        html: finalHtml,
        headers: {
          'X-Priority': '3',           // Normal priority (not spammy)
          'X-Mailer': 'FoundIt Campus Portal',
          'Precedence': 'bulk',
        },
      });
      console.log(`✅ [Email] Sent to ${to} | MessageId: ${info.messageId}`);
    } catch (err) {
      // Log the full error so Render logs show exactly what went wrong
      console.error(`❌ [Email] Failed to send to ${to}`);
      console.error(`   Code   : ${err.code || 'N/A'}`);
      console.error(`   Message: ${err.message}`);
      if (err.response) console.error(`   SMTP   : ${err.response}`);
      // Re-throw so callers can catch if needed
      throw err;
    }
  } else {
    // SIMULATION MODE — env vars not configured
    console.log('\n\x1b[33m%s\x1b[0m', `⚠️  [Email] SIMULATION MODE — no SMTP credentials in env vars`);
    console.log('\x1b[33m%s\x1b[0m', `   Set EMAIL_SERVICE=gmail + EMAIL_USER + EMAIL_PASS on Render`);
    console.log('\x1b[32m%s\x1b[0m', `=====================================================`);
    console.log('\x1b[32m%s\x1b[0m', `✉️  To      : ${to}`);
    console.log('\x1b[32m%s\x1b[0m', `   Subject : ${subject}`);
    console.log('\x1b[32m%s\x1b[0m', `   Message : ${text}`);
    console.log('\x1b[32m%s\x1b[0m', `=====================================================\n`);
  }
}

module.exports = { sendNotification, getEmailHtmlTemplate };