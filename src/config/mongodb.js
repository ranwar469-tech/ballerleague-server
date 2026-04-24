import mongoose from 'mongoose';
import dns from 'node:dns';

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is required to start the server.');
  }
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  await mongoose.connect(uri);
  console.log("Connected to mongodb");
}

