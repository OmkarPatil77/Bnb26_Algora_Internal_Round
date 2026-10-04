import mongoose from "mongoose";
import { config } from "./config.js";
import { Session } from "./models/Session.js";
import { Learner } from "./models/Learner.js";
import { AttemptLog } from "./models/AttemptLog.js";

async function main() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(config.mongoUri);
  
  const host = mongoose.connection.host || "Atlas Cluster";
  const dbName = mongoose.connection.name || "bnb-algora";
  console.log(`Connected to MongoDB Atlas: host=${host}, database=${dbName}`);

  console.log("\nEnsuring collections and indexes in database:", dbName);

  // 1. Sessions collection & indexes
  await Session.createIndexes();
  console.log("✓ 'sessions' collection and indexes created/verified");

  // 2. Learners collection & indexes
  await Learner.createIndexes();
  console.log("✓ 'learners' collection and indexes created/verified");

  // 3. AttemptLogs collection & indexes
  await AttemptLog.createIndexes();
  console.log("✓ 'attemptlogs' collection and indexes created/verified");

  // List collections in database to confirm
  const db = mongoose.connection.db;
  if (db) {
    const collections = await db.listCollections().toArray();
    console.log("\nCollections currently in Atlas database:", collections.map(c => c.name));
  }

  await mongoose.disconnect();
  console.log("\nDatabase initialization complete!");
}

main().catch((err) => {
  console.error("Atlas connection error:", err);
  process.exit(1);
});
