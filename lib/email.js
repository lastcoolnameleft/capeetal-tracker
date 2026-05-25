const sgMail = require('@sendgrid/mail');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@capeetaltracker.com';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  if (!SENDGRID_API_KEY) {
    console.log(`[DEV] Password reset link for ${toEmail}: ${resetUrl}`);
    return;
  }

  const msg = {
    to: toEmail,
    from: FROM_EMAIL,
    subject: 'Reset your Ca-PEE-tal Tracker password',
    text: `You requested a password reset. Click this link to reset your password (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #e0b336;">Ca-PEE-tal Tracker</h2>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #e0b336; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reset Password</a>
        </p>
        <p style="font-size: 0.85em; color: #666;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Password reset email sent to ${toEmail}`);
  } catch (err) {
    console.error('SendGrid error:', err.message);
    throw new Error('Failed to send reset email');
  }
}

module.exports = { sendPasswordResetEmail };
