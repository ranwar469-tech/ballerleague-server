import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import app from './app.js';
import { connectMongo } from './config/mongodb.js';
import { assertAuthConfig } from './middleware/auth.js';

dotenv.config();

const PORT = Number(process.env.PORT || 5000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../dist');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

async function start() {
  try {
    assertAuthConfig();
    await connectMongo();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Server failed to start:', error);
    process.exit(1);
  }
}

start();
