require('dotenv').config();
const nodemailer = require('nodemailer');

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

  if (host && port && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(port),
        secure: port == 465, // true for 465, false for other ports
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
        html: html || text.replace(/\n/g, '<br>'),
      });
      console.log(`✅ [Email] Notification sent to ${to}`);
    } catch (err) {
      console.error(`❌ [Email] Failed to send notification:`, err.message);
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

module.exports = { sendNotification };
