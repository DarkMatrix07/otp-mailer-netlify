# FoodExpress OTP mailer (Netlify)

This folder is a standalone Netlify Functions service that:
1) Sends a 6-digit OTP email
2) Returns the OTP in the response (for testing only)

## Deploy on Netlify
1. Create a new Netlify site.
2. Set **Base directory** to `otp-mailer-netlify`.
3. Build command: none (leave blank).
4. Publish directory: `public`.
5. Functions directory: `netlify/functions`.

## Environment variables (Netlify -> Site settings -> Environment variables)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE` (`true` for port 465)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `RETURN_OTP` (`true` for now, set to `false` in production)

## Endpoint
`POST /.netlify/functions/send-otp`

### Sample request
```json
{
  "email": "user@example.com",
  "name": "User",
  "ttlSeconds": 300
}
```

### Sample response (with RETURN_OTP=true)
```json
{
  "ok": true,
  "expiresAt": "2025-01-01T12:00:00.000Z",
  "otp": "123456"
}
```

## Notes
- Returning the OTP is only for testing. Turn it off before production.
