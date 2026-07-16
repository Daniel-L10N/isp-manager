const { Client, LocalAuth } = require("whatsapp-web.js");
const express = require("express");
const cors = require("cors");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const SESSION_DIR = path.join(__dirname, ".wwebjs_auth");

// WhatsApp client with local auth (persists session)
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
    executablePath: "/usr/bin/chromium",
  },
});

let isReady = false;
let qrCode = null;
let clientInfo = null;

// Events
client.on("qr", (qr) => {
  console.log("QR CODE RECEIVED");
  qrCode = qr;
  isReady = false;
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("WhatsApp Client READY!");
  isReady = true;
  qrCode = null;
  clientInfo = client.info;
  console.log("Logged in as:", clientInfo?.pushname);
  console.log("Phone:", clientInfo?.wid?.user);
});

client.on("authenticated", () => {
  console.log("Authenticated successfully");
});

client.on("auth_failure", (msg) => {
  console.error("Auth failure:", msg);
  isReady = false;
});

client.on("disconnected", (reason) => {
  console.log("Disconnected:", reason);
  isReady = false;
  qrCode = null;
});

// Initialize client
client.initialize();

// ===== API ROUTES =====

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    whatsapp: isReady ? "connected" : "disconnected",
    client: clientInfo?.pushname || null,
    phone: clientInfo?.wid?.user || null,
  });
});

// Get QR code
app.get("/qr", (req, res) => {
  if (isReady) {
    return res.json({ status: "connected", message: "Already authenticated" });
  }
  if (qrCode) {
    return res.json({ status: "qr", qr: qrCode });
  }
  return res.json({ status: "loading", message: "Waiting for QR code..." });
});

// Get connection status
app.get("/status", (req, res) => {
  res.json({
    isReady,
    hasQR: !!qrCode,
    client: clientInfo?.pushname || null,
    phone: clientInfo?.wid?.user || null,
  });
});

// Send message
app.post("/send", async (req, res) => {
  const { phone, message } = req.body;

  if (!isReady) {
    return res.status(503).json({ error: "WhatsApp not connected" });
  }

  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message required" });
  }

  try {
    // Format phone: remove +, spaces, dashes. Add @c.us suffix
    let chatId = phone.replace(/[^0-9]/g, "");
    if (!chatId.endsWith("@c.us")) {
      chatId = chatId + "@c.us";
    }

    const result = await client.sendMessage(chatId, message);
    console.log("Message sent to:", phone);
    res.json({ success: true, id: result.id });
  } catch (err) {
    console.error("Send error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Send bulk messages
app.post("/send-bulk", async (req, res) => {
  const { messages } = req.body; // [{ phone, message }]

  if (!isReady) {
    return res.status(503).json({ error: "WhatsApp not connected" });
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  const results = [];
  for (const { phone, message } of messages) {
    try {
      let chatId = phone.replace(/[^0-9]/g, "");
      if (!chatId.endsWith("@c.us")) {
        chatId = chatId + "@c.us";
      }
      const result = await client.sendMessage(chatId, message);
      results.push({ phone, success: true, id: result.id });
      // Delay between messages to avoid rate limiting
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      results.push({ phone, success: false, error: err.message });
    }
  }

  res.json({ results });
});

// Logout / disconnect
app.post("/logout", async (req, res) => {
  try {
    await client.logout();
    isReady = false;
    qrCode = null;
    clientInfo = null;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restart client
app.post("/restart", async (req, res) => {
  try {
    await client.destroy();
    isReady = false;
    qrCode = null;
    clientInfo = null;
    client.initialize();
    res.json({ success: true, message: "Restarting..." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("WhatsApp Service running on port " + PORT);
  console.log("Waiting for WhatsApp connection...");
});

// Serve QR page
app.get("/", (req, res) => {
  res.sendFile(require('path').join(__dirname, 'qr-page.html'));
});
