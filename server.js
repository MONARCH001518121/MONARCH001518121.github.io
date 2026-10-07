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

// Serve static assets (HTML, CSS, JS, Media, CAD Files)
app.use(express.static(path.join(__dirname)));

// Ensure Data Directory Exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

// Helper functions for data persistence
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

// Increment view count on start
const currentStats = getStats();
currentStats.views += 1;
saveStats(currentStats);

// Mailer Transporter Configuration
let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} else {
  // Test fallback transporter (logs email output to console if SMTP not configured)
  console.log('ℹ️ SMTP credentials not detected in .env. Running in simulation mode (messages saved to database).');
}

// --- API ENDPOINTS ---

// 1. GET Stats
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: getStats()
  });
});

// 2. POST Track Resume Download
app.post('/api/download-resume', (req, res) => {
  const stats = getStats();
  stats.resumeDownloads += 1;
  saveStats(stats);
  res.json({
    success: true,
    message: 'Resume download recorded.',
    totalDownloads: stats.resumeDownloads
  });
});

// 3. POST Submit Contact Form
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required fields (Name, Email, Message).'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.'
      });
    }

    // New Message Entry
    const newMessage = {
      id: 'MSG-' + Date.now(),
      name: name.trim(),
      email: email.trim(),
      subject: (subject || 'General Engineering Inquiry').trim(),
      message: message.trim(),
      timestamp: new Date().toISOString(),
      status: 'unread'
    };

    // Save to Database
    const messages = getMessages();
    messages.unshift(newMessage);
    saveMessages(messages);

    // Update Stats
    const stats = getStats();
    stats.messagesSent += 1;
    saveStats(stats);

    // Send Email if transporter available
    if (transporter) {
      const mailOptions = {
        from: `"${name}" <${process.env.EMAIL_USER}>`,
        replyTo: email,
        to: process.env.RECIPIENT_EMAIL || process.env.EMAIL_USER,
        subject: `[Portfolio Inquiry] ${subject || 'New Contact Message'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ff1e42; border-radius: 8px; background: #0a0a0c; color: #f5f5f7;">
            <h2 style="color: #ff1e42; margin-top: 0;">New Inquiry Received — AXIS//NULL Portfolio</h2>
            <p><strong>Sender Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #6de8ed;">${email}</a></p>
            <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
            <hr style="border-color: #2c2c35;" />
            <p><strong>Message:</strong></p>
            <blockquote style="background: #17171d; padding: 15px; border-left: 4px solid #ff1e42; color: #e2e8f0; margin: 0;">
              ${message.replace(/\n/g, '<br>')}
            </blockquote>
            <p style="font-size: 11px; color: #92929d; margin-top: 20px;">Received on ${new Date().toLocaleString()}</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
    } else {
      console.log(`📩 [Simulated Email Sent] From: ${name} (${email}) | Subject: ${subject}`);
    }

    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully! I will respond to your inquiry shortly.'
    });

  } catch (error) {
    console.error('Error handling contact submission:', error);
    res.status(500).json({
      success: false,
      error: 'An internal error occurred while processing your message. Please try again.'
    });
  }
});

// 4. GET Retrieve All Messages (Admin view)
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
  console.log(`🚀 Portfolio Backend Server running at: http://localhost:${PORT}`);
  console.log(`📁 Static files & API active.`);
  console.log(`====================================================`);
});
