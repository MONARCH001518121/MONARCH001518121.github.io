const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static website files (HTML, CSS, JS, Media, CAD Files, Resume)
app.use(express.static(path.join(__dirname)));

// Ensure Data Directory Exists for local persistence
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

// Helper functions for persistent data
function getMessages() {
  if (!fs.existsSync(MESSAGES_FILE)) return [];
  try {
    const raw = fs.readFileSync(MESSAGES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function saveMessages(messages) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

function getStats() {
  const defaultStats = { views: 0, resumeDownloads: 0, messagesSent: 0 };
  if (!fs.existsSync(STATS_FILE)) {
    fs.writeFileSync(STATS_FILE, JSON.stringify(defaultStats, null, 2));
    return defaultStats;
  }
  try {
    const raw = fs.readFileSync(STATS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return defaultStats;
  }
}

function saveStats(stats) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

// Mailer Transporter Factory
function createTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailUser && emailPass) {
    if (process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: process.env.SMTP_SECURE === 'true' || true,
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });
    }

    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
  }

  return null;
}

// Check transporter status on startup
const transporter = createTransporter();
if (transporter) {
  console.log('✅ Real SMTP Email Integration is ACTIVE for: ' + process.env.EMAIL_USER);
} else {
  console.log('ℹ️ EMAIL_PASS not found in .env. Running in Hybrid/Simulation mode (all inquiries stored in data/messages.json).');
}

// --- API ENDPOINTS ---

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    stats: getStats()
  });
});

// 2. GET Stats
app.get('/api/stats', (req, res) => {
  const stats = getStats();
  stats.views += 1;
  saveStats(stats);
  res.json({ success: true, stats });
});

// 3. POST Track Resume Download
app.post('/api/download-resume', (req, res) => {
  const stats = getStats();
  stats.resumeDownloads += 1;
  saveStats(stats);
  res.json({
    success: true,
    message: 'Resume download tracked.',
    totalDownloads: stats.resumeDownloads
  });
});

// 4. POST Submit Contact Form & Send Live Emails
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields (Name, Email, Message).'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.'
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanSubject = (subject || 'Engineering & CAD Inquiry').trim();
    const cleanMessage = message.trim();

    // 1. Create and Save Message Record
    const newMessage = {
      id: 'INQ-' + Date.now(),
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
      timestamp: new Date().toISOString(),
      status: 'received'
    };

    const messages = getMessages();
    messages.unshift(newMessage);
    saveMessages(messages);

    // Update Stats
    const stats = getStats();
    stats.messagesSent += 1;
    saveStats(stats);

    // 2. Send Real Email via SMTP if configured
    const activeTransporter = createTransporter();
    const targetRecipient = process.env.RECIPIENT_EMAIL || 'm.haseebimran518121@gmail.com';

    if (activeTransporter) {
      // (A) Send Notification to M Haseeb Imran
      const adminMailOptions = {
        from: `"AXIS//NULL CAD Portal" <${process.env.EMAIL_USER}>`,
        replyTo: cleanEmail,
        to: targetRecipient,
        subject: `⚡ [CAD Inquiry] ${cleanSubject} — from ${cleanName}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #0a0a0c; color: #f5f5f7; border: 1px solid #ff1e42; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #ff1e42, #b91c1c); padding: 22px 26px; text-align: left;">
              <h2 style="margin: 0; color: #ffffff; font-size: 20px; letter-spacing: 1px;">⚡ NEW CAD PROJECT INQUIRY</h2>
              <p style="margin: 4px 0 0; color: #fee2e2; font-size: 12px; font-family: monospace;">PORTFOLIO DIRECT TRANSMISSION</p>
            </div>

            <div style="padding: 26px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #92929d; width: 130px; font-family: monospace;">CLIENT NAME:</td>
                  <td style="padding: 8px 0; color: #ffffff; font-weight: bold;">${cleanName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #92929d; font-family: monospace;">EMAIL ADDRESS:</td>
                  <td style="padding: 8px 0;"><a href="mailto:${cleanEmail}" style="color: #6de8ed; text-decoration: none; font-weight: bold;">${cleanEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #92929d; font-family: monospace;">SUBJECT:</td>
                  <td style="padding: 8px 0; color: #ff5770; font-weight: bold;">${cleanSubject}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #92929d; font-family: monospace;">RECEIVED ON:</td>
                  <td style="padding: 8px 0; color: #e2e8f0;">${new Date().toLocaleString()}</td>
                </tr>
              </table>

              <div style="background: #17171d; border-left: 4px solid #ff1e42; padding: 18px; border-radius: 4px; margin-top: 10px;">
                <p style="margin: 0 0 8px; color: #92929d; font-size: 11px; font-family: monospace; letter-spacing: 1px;">PROJECT MESSAGE / SPECIFICATIONS:</p>
                <div style="color: #f1f5f9; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${cleanMessage}</div>
              </div>

              <div style="margin-top: 26px; text-align: center;">
                <a href="mailto:${cleanEmail}?subject=Re: ${encodeURIComponent(cleanSubject)}" style="background: #ff1e42; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block; font-size: 13px; font-family: monospace;">REPLY TO CLIENT ↘</a>
              </div>
            </div>

            <div style="background: #060608; padding: 14px 26px; text-align: center; border-top: 1px solid #2c2c35; font-size: 11px; color: #64748b; font-family: monospace;">
              AXIS//NULL SYSTEMS • CAD / PRODUCT / MOTION ARCHIVE
            </div>
          </div>
        `
      };

      // (B) Send Professional Auto-Reply to Client
      const autoReplyOptions = {
        from: `"M Haseeb Imran (CAD Engineer)" <${process.env.EMAIL_USER}>`,
        to: cleanEmail,
        subject: `Inquiry Received: ${cleanSubject} — M Haseeb Imran`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: #0f172a; padding: 24px 28px; color: #ffffff;">
              <h2 style="margin: 0; font-size: 20px; color: #ffffff;">M HASEEB IMRAN</h2>
              <p style="margin: 4px 0 0; color: #ff5770; font-size: 12px; font-family: monospace; letter-spacing: 1px;">MECHANICAL &amp; CAD DESIGN ENGINEER</p>
            </div>

            <div style="padding: 28px; line-height: 1.6; font-size: 14px;">
              <p>Hi <strong>${cleanName}</strong>,</p>
              <p>Thank you for reaching out through my CAD engineering portfolio. I have received your message regarding <strong>"${cleanSubject}"</strong>.</p>

              <div style="background: #f8fafc; border-left: 3px solid #0f172a; padding: 14px; margin: 18px 0; border-radius: 4px; font-size: 13px; color: #475569;">
                <em>"${cleanMessage}"</em>
              </div>

              <p>I am reviewing your engineering requirements and will get back to you with CAD/manufacturing insights shortly.</p>

              <p style="margin-top: 24px;">Best regards,<br>
              <strong>Muhammad Haseeb Imran</strong><br>
              <span style="color: #64748b; font-size: 12px;">Mechanical &amp; CAD Design Engineer</span><br>
              <span style="color: #64748b; font-size: 12px;">WhatsApp: +92 370 0939440 | Email: m.haseebimran518121@gmail.com</span>
              </p>
            </div>
          </div>
        `
      };

      await Promise.allSettled([
        activeTransporter.sendMail(adminMailOptions),
        activeTransporter.sendMail(autoReplyOptions)
      ]);
      console.log(`📧 Live email dispatched to ${targetRecipient} & auto-reply sent to ${cleanEmail}`);
    } else {
      console.log(`💾 [Local Mode] Message from ${cleanName} (${cleanEmail}) safely stored in database (data/messages.json).`);
    }

    res.status(200).json({
      success: true,
      message: 'Your inquiry has been successfully transmitted! You will receive a direct reply shortly.'
    });

  } catch (error) {
    console.error('Error handling contact submission:', error);
    res.status(500).json({
      success: false,
      error: 'An internal error occurred while processing your message. Please try again.'
    });
  }
});

// 5. GET All Messages (Admin View)
app.get('/api/messages', (req, res) => {
  const messages = getMessages();
  res.json({
    success: true,
    total: messages.length,
    messages
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 AXIS//NULL CAD Portfolio Server Active: http://localhost:${PORT}`);
  console.log(`📄 Live Resume: http://localhost:${PORT}/resume.html`);
  console.log(`📁 Inquiries Stored At: ${MESSAGES_FILE}`);
  console.log(`====================================================`);
});
