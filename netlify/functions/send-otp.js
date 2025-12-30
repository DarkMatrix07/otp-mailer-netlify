const nodemailer = require('nodemailer');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Cache-Control': 'no-store',
};

const buildOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

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
  const from = process.env.SMTP_FROM || `FoodExpress <${smtpUser || 'no-reply@foodexpress.local'}>`;

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
  const subject = 'FoodExpress registration OTP';
  const text = `Hi ${safeName},\n\nYour FoodExpress OTP is ${otp}. It expires in ${Math.round(
    ttlSeconds / 60,
  )} minutes.\n\nIf you did not request this, you can ignore this email.`;
  const html = `
    <p>Hi ${safeName},</p>
    <p>Your FoodExpress OTP is <strong>${otp}</strong>.</p>
    <p>It expires in ${Math.round(ttlSeconds / 60)} minutes.</p>
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
