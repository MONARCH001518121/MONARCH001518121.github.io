# AXIS//NULL CAD Portfolio Backend

Production-ready Node.js backend for M Haseeb Imran's CAD engineering portfolio.

## Features
- Real-time email notifications via Gmail SMTP
- Client auto-reply system
- Message persistence (JSON database)
- Resume download tracking
- Portfolio statistics API

## Deployment

### Render.com Setup

1. **Create Account**: Visit [render.com](https://render.com) and sign up with GitHub
2. **New Web Service**: Click "New +" → "Web Service"
3. **Connect Repository**: Select `MONARCH001518121/MONARCH001518121.github.io`
4. **Configure**:
   - Name: `cad-portfolio-backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: `Free`

5. **Environment Variables** (Add in Render dashboard):
   ```
   PORT=5000
   EMAIL_USER=m.haseebimran518121@gmail.com
   EMAIL_PASS=your_16_digit_google_app_password
   RECIPIENT_EMAIL=m.haseebimran518121@gmail.com
   EMAIL_SERVICE=gmail
   NODE_ENV=production
   ```

6. **Deploy**: Click "Create Web Service"

### Google App Password Setup

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not enabled)
3. Search for **App passwords**
4. Select **Mail** and **Other (Custom name)**: "Portfolio Backend"
5. Copy the 16-digit password (remove spaces)
6. Paste in Render's `EMAIL_PASS` environment variable

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/stats` - Portfolio statistics
- `POST /api/contact` - Submit contact form (sends email + auto-reply)
- `POST /api/download-resume` - Track resume downloads
- `GET /api/messages` - Retrieve all messages (admin)

## Local Development

```bash
npm install
npm run dev
```

Server runs on `http://localhost:5000`

## Frontend Integration

Update your frontend fetch URL from `/api/contact` to:
```
https://your-render-app-name.onrender.com/api/contact
```

---

**Powered by AXIS//NULL SYSTEMS**  
© 2026 M Haseeb Imran — Mechanical & CAD Design Engineer
