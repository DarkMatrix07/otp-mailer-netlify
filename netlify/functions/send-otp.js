const nodemailer = require('nodemailer');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Cache-Control': 'no-store',
};

const buildOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid JSON body' }),
    };
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const name = String(payload.name || '').trim();
  const ttlSeconds = Number(payload.ttlSeconds || 300);

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Valid email is required' }),
    };
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpSecure =
    typeof process.env.SMTP_SECURE === 'string'
      ? process.env.SMTP_SECURE === 'true'
      : smtpPort === 465;
  const from = process.env.SMTP_FROM || `Dish2Door <${smtpUser || 'no-reply@dish2door.local'}>`;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'SMTP configuration missing' }),
    };
  }

  const otp = buildOtp();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const safeName = name || 'there';
  const safeNameHtml = escapeHtml(safeName);
  const otpHtml = escapeHtml(otp);
  const ttlMinutes = Math.max(1, Math.round(ttlSeconds / 60));
  const subject = 'Dish2Door registration OTP';
  const text = `Hi ${safeName},\n\nUse this Dish2Door OTP to continue: ${otp}\nThis code expires in ${ttlMinutes} minutes.\n\nIf you did not request this, you can ignore this email.\n\n- Dish2Door OTP Service`;
  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:'Segoe UI',Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e7ebf3;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(120deg,#ff7a18,#ff3c5f);padding:28px 32px;color:#ffffff;">
                <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:1.2px;font-weight:700;text-transform:uppercase;opacity:.92;">Dish2Door</p>
                <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;font-weight:700;">Your one-time passcode</h1>
                <p style="margin:0;font-size:14px;line-height:1.6;opacity:.95;">Use this code to complete your sign in securely.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 32px 18px 32px;color:#0f172a;">
                <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;">Hi ${safeNameHtml},</p>
                <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">Here is your Dish2Door OTP. It will expire in <strong>${ttlMinutes} minutes</strong>.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px 0;">
                  <tr>
                    <td align="center" style="padding:18px;border-radius:12px;background:#fff7ed;border:1px dashed #fb923c;">
                      <span style="display:inline-block;font-size:36px;line-height:1;letter-spacing:8px;font-weight:700;color:#9a3412;">${otpHtml}</span>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.7;color:#64748b;">For your security, never share this code with anyone.</p>
                <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">If you did not request this email, you can safely ignore it.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 32px;background:#f8fafc;border-top:1px solid #e7ebf3;color:#64748b;font-size:12px;line-height:1.6;">
                Dish2Door OTP Service
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
      html,
    });
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Failed to send email', error: String(err?.message || err) }),
    };
  }

  const response = { ok: true, expiresAt };
  const returnOtp = (process.env.RETURN_OTP || 'true') === 'true';
  if (returnOtp) {
    response.otp = otp;
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(response),
  };
};
