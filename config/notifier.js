require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * Generates a premium responsive HTML email wrapper.
 * @param {string} title - Main header of the message
 * @param {string} bodyHtml - Main content of the email (HTML formatted)
 * @param {string} [ctaText] - Action button text
 * @param {string} [ctaUrl] - Action button link
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
      This is an automated notification from the FoundIt Campus Lost & Found Portal.<br>
      &copy; 2026 FoundIt. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends an email notification.
 * If SMTP credentials are configured in .env, it sends a real email.
 * Otherwise, it simulates sending by logging a bright green message to the console.
 * 
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} text - Plain text message body
 * @param {string} [html] - Optional HTML message body
 */
async function sendNotification(to, subject, text, html) {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM || '"Campus Lost & Found" <noreply@campusfoundit.com>';

  // Generate responsive HTML layout if not explicitly provided
  const finalHtml = html || getEmailHtmlTemplate(subject, text.replace(/\n/g, '<br>'));

  if (host && port && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(port),
        secure: parseInt(port) === 465, // true for 465, false for other ports
        auth: {
          user: user,
          pass: pass,
        },
      });

      await transporter.sendMail({
        from: from,
        to: to,
        subject: subject,
        text: text,
        html: finalHtml,
      });
      console.log(`✅ [Email] Real email alert successfully sent to ${to}`);
    } catch (err) {
      console.error(`❌ [Email] Failed to send real email:`, err.message);
    }
  } else {
    // SIMULATION MODE (logs to console in bright green)
    console.log('\n\x1b[32m%s\x1b[0m', `=====================================================`);
    console.log('\x1b[32m%s\x1b[0m', `✉️ [SIMULATED EMAIL ALERTS - DEMO MODE]`);
    console.log('\x1b[32m%s\x1b[0m', `To: ${to}`);
    console.log('\x1b[32m%s\x1b[0m', `Subject: ${subject}`);
    console.log('\x1b[32m%s\x1b[0m', `Message: "${text}"`);
    console.log('\x1b[32m%s\x1b[0m', `=====================================================\n`);
  }
}

module.exports = { sendNotification, getEmailHtmlTemplate };
