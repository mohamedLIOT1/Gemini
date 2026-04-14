import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });
dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = Number(process.env.PORT) || 3000;
  const OWNER_USERNAME = (process.env.OWNER_USERNAME || 'MoHamed').toLowerCase();
  const EMAIL_NOTIFICATIONS_ENABLED = process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true';
  const OWNER_EMAIL_TO = process.env.OWNER_EMAIL_TO;

  let emailTransporter: nodemailer.Transporter | null = null;

  const getEmailTransporter = () => {
    if (emailTransporter) return emailTransporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('Email notifications are enabled, but SMTP credentials are incomplete.');
      return null;
    }

    emailTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    return emailTransporter;
  };

  const sendOwnerJoinEmail = async (joinedUsername: string, roomId: string) => {
    if (!EMAIL_NOTIFICATIONS_ENABLED || !OWNER_EMAIL_TO) return;
    if (joinedUsername.trim().toLowerCase() === OWNER_USERNAME) return;

    const transporter = getEmailTransporter();
    if (!transporter) return;

    const from = process.env.SMTP_FROM || 'Gemini Alerts <no-reply@gemini.local>';
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

    await transporter.sendMail({
      from,
      to: OWNER_EMAIL_TO,
      subject: 'Gemini Alert: User joined your room',
      text: `${joinedUsername} joined room ${roomId} at ${new Date().toISOString()}.\n\nOpen app: ${appUrl}`,
    });
  };

  // Track users in rooms: { roomId: { socketId: username } }
  const roomUsers: Record<string, Record<string, string>> = {};

  // AI Proxy Endpoint (kept on /api/gemini for frontend compatibility)
  app.post('/api/gemini', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });

      const model = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || `http://localhost:${PORT}`,
          'X-Title': 'Geminay'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        const message = data?.error?.message || 'OpenRouter request failed';
        return res.status(response.status).json({ error: message });
      }

      const text = data?.choices?.[0]?.message?.content;
      if (!text) return res.status(500).json({ error: 'No response text from model' });
      res.json({ text });
    } catch (error: any) {
      console.error('AI Proxy Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Socket.io Logic
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (data: { roomId: string, username: string }) => {
      const { roomId, username } = data;
      socket.join(roomId);
      
      if (!roomUsers[roomId]) {
        roomUsers[roomId] = {};
      }
      roomUsers[roomId][socket.id] = username;

      console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);
      
      // Broadcast updated user list to the room
      io.to(roomId).emit('room-users', Object.values(roomUsers[roomId]));
      void sendOwnerJoinEmail(username, roomId).catch((error) => {
        console.error('Join email notification failed:', error);
      });
    });

    socket.on('send-message', (data) => {
      const username = roomUsers[data.roomId]?.[socket.id] || 'Anonymous';
      io.to(data.roomId).emit('receive-message', {
        id: Math.random().toString(36).substring(7),
        text: data.text,
        senderId: socket.id,
        senderName: username,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing', (data) => {
      socket.to(data.roomId).emit('user-typing', { userId: socket.id });
    });

    socket.on('stop-typing', (data) => {
      socket.to(data.roomId).emit('user-stop-typing', { userId: socket.id });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Find which room the user was in and remove them
      for (const roomId in roomUsers) {
        if (roomUsers[roomId][socket.id]) {
          const username = roomUsers[roomId][socket.id];
          delete roomUsers[roomId][socket.id];
          
          // If room is empty, delete it
          if (Object.keys(roomUsers[roomId]).length === 0) {
            delete roomUsers[roomId];
          } else {
            // Otherwise broadcast updated list
            io.to(roomId).emit('room-users', Object.values(roomUsers[roomId]));
          }
          break;
        }
      }
    });
  });

  // Vite Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
