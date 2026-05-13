import { MongoClient } from "mongodb";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const client = new MongoClient(process.env.MONGODB_URI);

async function setupIndexes() {
  await client.connect();
  const db = client.db("link-shrink");

  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("links").createIndex({ short_code: 1 }, { unique: true });
  await db.collection("links").createIndex({ long_url: 1 });
  await db.collection("links").createIndex({ user_id: 1 });
  await db.collection("clicks").createIndex({ link_id: 1 });
  await db.collection("clicks").createIndex({ link_id: 1, timestamp: -1 });
  await db.collection("clicks").createIndex({ link_id: 1, visitor_hash: 1, timestamp: -1 });

  console.log("Indexes created successfully.");
  await client.close();
}

setupIndexes().catch((err) => {
  console.error(err);
  process.exit(1);
});
