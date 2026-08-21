import nodemailer from 'nodemailer';
import { getEncryptedEnv } from './secretsEncryption.js';

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER } = process.env;
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
    subject: 'Quick thing before you get started',
    html: `
      <div style="background-color: #f4f4f5; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 14px;">
              <tr>
                <td width="52" height="52" align="center" valign="middle" style="width: 52px; height: 52px; background-color: #eef2ff; border-radius: 14px;">
                  <img src="https://i.ibb.co.com/Jw9s29HN/envelope.png" alt="envelope" width="24" height="24" style="display:block; border:0;" />
                </td>
              </tr>
            </table>
            <h1 style="font-size: 21px; font-weight: 700; margin: 0; color: #18181b;">Confirm it's you</h1>
          </div>

          <div style="background-color: #ffffff; border-radius: 16px; padding: 32px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04);">
            <p style="font-size: 15px; line-height: 1.65; color: #27272a; margin: 0 0 16px;">
              Thanks for signing up. Before we let you in, we just need to check that this
              email actually belongs to you — takes two seconds and keeps your account safer
              down the road.
            </p>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${verifyUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 13px 30px; border-radius: 10px;">
                Verify my email
              </a>
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #52525b; margin: 0 0 20px;">
              Once that's done, you'll have full access, a working way to recover your account
              if you ever get locked out, and you'll be flagged as a verified member.
            </p>

            <p style="font-size: 13px; line-height: 1.6; color: #71717a; margin: 0 0 6px;">
              If the button won't cooperate, copy this link into your browser instead:
            </p>
            <p style="font-size: 13px; line-height: 1.6; word-break: break-all; margin: 0 0 20px;">
              <a href="${verifyUrl}" style="color: #4f46e5;">${verifyUrl}</a>
            </p>

            <div style="border-top: 1px solid #e4e4e7; padding-top: 16px;">
              <p style="font-size: 12.5px; line-height: 1.6; color: #71717a; margin: 0 0 8px;">
                Heads up, this link expires in 24 hours. If you miss the window, just grab a new
                one from the sign-in page.
              </p>
              <p style="font-size: 12.5px; line-height: 1.6; color: #a1a1aa; margin: 0; font-style: italic;">
                Didn't sign up for this? You can ignore this email — nothing happens and no
                account gets created.
              </p>
            </div>
          </div>

          <p style="font-size: 12px; color: #a1a1aa; text-align: center; margin-top: 24px; line-height: 1.6;">
            This is an automated email, so replies won't reach anyone.<br/>
            Need help? Our support team is around.
          </p>
        </div>
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
      <div style="background-color: #f4f4f5; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 14px;">
              <tr>
                <td width="52" height="52" align="center" valign="middle" style="width: 52px; height: 52px; background-color: #fee2e2; border-radius: 14px;">
                  <img src="https://i.ibb.co.com/DfFxC6KR/lock.png" alt="lock" width="24" height="24" style="display:block; border:0;" />
                </td>
              </tr>
            </table>
            <h1 style="font-size: 21px; font-weight: 700; margin: 0; color: #18181b;">Let's get you back in</h1>
          </div>

          <div style="background-color: #ffffff; border-radius: 16px; padding: 32px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04);">
            <p style="font-size: 15px; line-height: 1.65; color: #27272a; margin: 0 0 16px;">
              Someone asked to reset the password on this account. If that was you, click below
              and you'll be set in under a minute. If it wasn't, you can just ignore this.
            </p>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 13px 30px; border-radius: 10px;">
                Set a new password
              </a>
            </div>

            <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 14px 18px; margin: 0 0 20px;">
              <p style="font-size: 13px; line-height: 1.6; color: #9a3412; margin: 0;">
                While you're in there — pick something you haven't reused elsewhere, and turn on
                two-factor authentication if you haven't already. Small effort, real difference.
              </p>
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #71717a; margin: 0 0 6px;">
              Button not working? Paste this link into your browser:
            </p>
            <p style="font-size: 13px; line-height: 1.6; word-break: break-all; margin: 0 0 20px;">
              <a href="${resetUrl}" style="color: #dc2626;">${resetUrl}</a>
            </p>

            <div style="border-top: 1px solid #e4e4e7; padding-top: 16px;">
              <p style="font-size: 12.5px; line-height: 1.6; color: #71717a; margin: 0 0 8px;">
                This link is only good for 1 hour. If it's expired by the time you get to it,
                head back to the login page and request a fresh one.
              </p>
              <p style="font-size: 12.5px; line-height: 1.6; color: #a1a1aa; margin: 0; font-style: italic;">
                Didn't request this? Your password hasn't changed and your account is still safe.
                If it still feels off, changing your password and checking recent logins doesn't hurt.
              </p>
            </div>
          </div>

          <p style="font-size: 12px; color: #a1a1aa; text-align: center; margin-top: 24px; line-height: 1.6;">
            This is an automated email, so replies won't reach anyone.<br/>
            Need help? Our support team is around.
          </p>
        </div>
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
    subject: 'New sign-in on your account',
    html: `
      <div style="background-color: #f4f4f5; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 14px;">
              <tr>
                <td width="52" height="52" align="center" valign="middle" style="width: 52px; height: 52px; background-color: #f0fdf4; border-radius: 14px;">
                  <img src="https://i.ibb.co.com/Y4Nks9g1/shield.png" alt="shield" width="24" height="24" style="display:block; border:0;" />
                </td>
              </tr>
            </table>
            <h1 style="font-size: 21px; font-weight: 700; margin: 0; color: #18181b;">Was this you?</h1>
          </div>

          <div style="background-color: #ffffff; border-radius: 16px; padding: 32px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04);">
            <p style="font-size: 15px; line-height: 1.65; color: #27272a; margin: 0 0 16px;">Hi ${displayName},</p>
            <p style="font-size: 15px; line-height: 1.65; color: #27272a; margin: 0 0 16px;">
              Your account was just signed into with an email and password. We send this every
              time it happens, just so nothing slips past you.
            </p>

            <div style="background-color: #f8fafc; border-radius: 10px; padding: 16px 18px; margin: 0 0 20px;">
              <p style="font-size: 13px; font-weight: 600; color: #3f3f46; margin: 0 0 4px;">Sign-in time</p>
              <p style="font-size: 14px; color: #18181b; margin: 0;">${loginTime} (WIB)</p>
            </div>

            <p style="font-size: 15px; line-height: 1.65; color: #27272a; margin: 0 0 16px;">
              If that was you, great — nothing else to do here.
            </p>

            <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 14px 18px; margin: 0 0 20px;">
              <p style="font-size: 13px; line-height: 1.6; color: #9a3412; margin: 0;">
                Doesn't ring a bell? Someone else might have your password. Change it now, check
                if you've reused it anywhere, and switch on two-factor authentication if you haven't.
              </p>
            </div>

            <p style="font-size: 12.5px; line-height: 1.6; color: #71717a; margin: 0;">
              General rule: a unique password for every account (a password manager makes this
              painless), and stay wary of anyone asking you to "confirm" your password outside
              of this app.
            </p>
          </div>

          <p style="font-size: 12px; color: #a1a1aa; text-align: center; margin-top: 24px; line-height: 1.6;">
            This is an automated security notice, so replies won't reach anyone.<br/>
            Need help? Our support team is around.
          </p>
        </div>
      </div>
    `,
  });
}
