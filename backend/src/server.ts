import mongoose from "mongoose";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { mlClient } from "./ml/client.js";

async function bootstrap() {
  console.log("Starting Re:Learn Backend Service...");

  // 1. Connect to MongoDB
  try {
    await mongoose.connect(config.mongoUri);
    const host = mongoose.connection.host || "127.0.0.1";
    const dbName = mongoose.connection.name || "relearn";
    console.log(`Connected to MongoDB: host=${host}, database=${dbName}`);
  } catch (err: any) {
    console.warn(`MongoDB connection warning: ${err.message}. Running in volatile mode if db is offline.`);
  }

  // 2. Warm up ML label cache at startup
  try {
    console.log(`Initializing label taxonomy cache from ML service (${config.mlUrl})...`);
    const labels = await mlClient.initLabelsCache();
    console.log(`Cached ${labels.size} misconception labels.`);
  } catch (err: any) {
    console.warn(`Could not preload ML labels: ${err.message}`);
  }

  // 3. Start Express server
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Re:Learn Backend API running on http://127.0.0.1:${config.port}`);
    console.log(`API Base URL: http://127.0.0.1:${config.port}/api`);
  });
}

bootstrap().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
