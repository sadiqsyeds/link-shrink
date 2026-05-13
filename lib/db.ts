import clientPromise from "./mongodb";

const DB_NAME = "link-shrink";

export async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export async function getLinksCollection() {
  const db = await getDb();
  return db.collection("links");
}

export async function getClicksCollection() {
  const db = await getDb();
  return db.collection("clicks");
}

export async function getUsersCollection() {
  const db = await getDb();
  return db.collection("users");
}

export function dbErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Database error.";
  const e = err as Record<string, unknown>;
  const message = (e.message as string | undefined) ?? "";

  if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
    return "Cannot reach the database. Check your MONGODB_URI.";
  }
  if (message.includes("11000")) {
    return "A link with this short code already exists. Please try again.";
  }
  if (message.includes("timeout")) {
    return "Database request timed out. Please try again.";
  }
  return "An unexpected database error occurred.";
}
