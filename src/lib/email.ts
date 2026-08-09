import nodemailer from 'nodemailer';
import { getEncryptedEnv } from './secretsEncryption.js';

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER } = process.env;
  // Password SMTP dibaca lewat lapisan enkripsi kedua (lihat secretsEncryption.ts),
  // dengan fallback otomatis ke SMTP_PASS polos kalau versi terenkripsi belum diset.
  const SMTP_PASS = getEncryptedEnv('SMTP_PASS_ENC', 'SMTP_PASS');
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP env vars not set: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Confirm your email to activate your account',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 56px; height: 56px; background-color: #eef2ff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <img src="https://i.ibb.co.com/Jw9s29HN/envelope.png" alt="envelope" width="26" height="26" style="display:block;" />
          </div>
          <h1 style="font-size: 22px; font-weight: 700; margin: 0; color: #111827;">Confirm Your Email Address</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 8px 0 0;">One quick step before you're all set</p>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hi there,</p>
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            Thanks for signing up! We're excited to have you on board. To keep your account
            secure and make sure important notifications reach you, we just need to confirm
            that this email address really belongs to you. It only takes a few seconds.
          </p>
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Click the button below to verify your email and unlock full access to your account:
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
              Verify Email Address
            </a>
          </div>

          <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px;">
            <p style="font-size: 13px; line-height: 1.6; color: #374151; margin: 0; font-weight: 600;">What happens after you verify:</p>
            <ul style="font-size: 13px; line-height: 1.7; color: #4b5563; margin: 8px 0 0; padding-left: 18px;">
              <li>Your account is fully activated, with no restrictions on features</li>
              <li>You'll be able to recover your account if you ever forget your password</li>
              <li>You'll start receiving important updates and notifications about your account</li>
              <li>Your profile will be marked as a verified member</li>
            </ul>
          </div>

          <div style="margin: 0 0 24px;">
            <p style="font-size: 13px; line-height: 1.6; color: #374151; margin: 0 0 8px; font-weight: 600;">Why do we ask for this?</p>
            <p style="font-size: 13px; line-height: 1.6; color: #4b5563; margin: 0;">
              Verifying your email helps us confirm that you're a real person, protects your
              account from being created or accessed by someone else, and makes sure that
              password resets and other important account notices always reach the right inbox.
            </p>
          </div>

          <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">
            Button not working? Copy and paste this link into your browser instead:
          </p>
          <p style="font-size: 13px; line-height: 1.6; word-break: break-all; margin: 0 0 24px;">
            <a href="${verifyUrl}" style="color: #4f46e5;">${verifyUrl}</a>
          </p>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 8px;">
            <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">
              <strong>Heads up:</strong> for your security, this link will expire in 24 hours. If it expires before you get a chance to click it, don't worry — you can simply request a new verification email from the sign-in page.
            </p>
            <p style="font-size: 13px; line-height: 1.6; color: #9ca3af; margin: 0; font-style: italic;">
              Didn't create this account? No action needed — you can safely ignore this email and no account will be created or activated.
            </p>
          </div>
        </div>

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px;">
          This is an automated message, please do not reply directly to this email.<br/>
          Need help? Contact our support team anytime — we're happy to assist.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Reset your password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 56px; height: 56px; background-color: #fee2e2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <img src="https://i.ibb.co.com/DfFxC6KR/lock.png" alt="lock" width="24" height="24" style="display:block;" />
          </div>
          <h1 style="font-size: 22px; font-weight: 700; margin: 0; color: #111827;">Reset Your Password</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 8px 0 0;">Let's get you back into your account</p>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hi there,</p>
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            We received a request to reset the password for your account. No worries — it
            happens to the best of us. Click the button below to choose a new password and
            get back to what you were doing.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
              Reset Password
            </a>
          </div>

          <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px;">
            <p style="font-size: 13px; line-height: 1.6; color: #374151; margin: 0; font-weight: 600;">What to expect next:</p>
            <ol style="font-size: 13px; line-height: 1.7; color: #4b5563; margin: 8px 0 0; padding-left: 18px;">
              <li>Click the "Reset Password" button above</li>
              <li>Choose a new, strong password for your account</li>
              <li>Confirm the new password to complete the reset</li>
              <li>You'll be signed in automatically with your new password</li>
            </ol>
          </div>

          <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px;">
            <p style="font-size: 13px; line-height: 1.6; color: #9a3412; margin: 0;">
              <strong>Security tip:</strong> once you reset your password, we recommend using a
              unique password you don't reuse on any other site, ideally generated by a password
              manager, and enabling two-factor authentication if it's available on your account
              for an extra layer of protection.
            </p>
          </div>

          <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">
            Button not working? Copy and paste this link into your browser instead:
          </p>
          <p style="font-size: 13px; line-height: 1.6; word-break: break-all; margin: 0 0 24px;">
            <a href="${resetUrl}" style="color: #dc2626;">${resetUrl}</a>
          </p>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 8px;">
            <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">
              <strong>Heads up:</strong> for your security, this link will expire in 1 hour. If it expires before you get a chance to use it, just request a new reset link from the login page.
            </p>
            <p style="font-size: 13px; line-height: 1.6; color: #9ca3af; margin: 0; font-style: italic;">
              Didn't request this? Your password is still safe and hasn't been changed. If you're concerned about unusual activity on your account, we recommend changing your password anyway and reviewing your recent sign-in activity.
            </p>
          </div>
        </div>

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px;">
          This is an automated message, please do not reply directly to this email.<br/>
          Need help? Contact our support team anytime — we're happy to assist.
        </p>
      </div>
    `,
  });
}
export async function sendLoginNotificationEmail(to: string, displayName: string) {
  const transporter = getTransporter();
  const loginTime = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'New sign-in to your account',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 56px; height: 56px; background-color: #f0fdf4; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <img src="https://i.ibb.co.com/Y4Nks9g1/shield.png" alt="shield" width="24" height="24" style="display:block;" />
          </div>
          <h1 style="font-size: 22px; font-weight: 700; margin: 0; color: #111827;">New Sign-In Detected</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 8px 0 0;">A quick security update about your account</p>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hi ${displayName},</p>
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            We're writing to let you know that your account was just used to sign in with
            an email and password. This is just a routine security notice we send every
            time your account is accessed this way, so you always have visibility into
            what's happening with your account.
          </p>

          <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px;">
            <p style="font-size: 13px; line-height: 1.6; color: #374151; margin: 0 0 4px; font-weight: 600;">Sign-in time</p>
            <p style="font-size: 14px; color: #111827; margin: 0;">${loginTime} (WIB / Jakarta time)</p>
          </div>

          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            If this was you, there's nothing else you need to do — you can safely ignore
            the rest of this email. We just want to keep you in the loop whenever your
            account is accessed.
          </p>

          <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px;">
            <p style="font-size: 13px; line-height: 1.6; color: #9a3412; margin: 0;">
              <strong>Didn't sign in just now?</strong> If you don't recognize this activity,
              someone else may have access to your password. We recommend changing your
              password immediately, reviewing any other accounts where you reuse the same
              password, and enabling extra protections such as two-factor authentication if
              they're available on your account.
            </p>
          </div>

          <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0;">
            As a general habit, it's a good idea to use a strong, unique password for every
            account you own, ideally generated and stored by a password manager, and to stay
            cautious of any messages asking you to "confirm" your password or personal details
            outside of this app.
          </p>
        </div>

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px;">
          This is an automated security notification, please do not reply directly to this email.<br/>
          Need help or have questions? Contact our support team anytime — we're happy to assist.
        </p>
      </div>
    `,
  });
}
