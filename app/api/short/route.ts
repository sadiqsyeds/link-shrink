import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { nanoid } from 'nanoid';

// Database connection
async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

// Handle GET request (fetch all links)
export async function GET() {
  try {
    const connection = await getConnection();
    const [rows] = await connection.query('SELECT * FROM links_master');
    await connection.end();

    return NextResponse.json({ links: rows });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handle POST request (shorten URL)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { longUrl } = body;

    if (!longUrl || typeof longUrl !== 'string') {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const connection = await getConnection();

    // Generate a short URL
    const shortUrl = nanoid(8);

    // Insert into database
    await connection.query('INSERT INTO links_master (long_link, short_link) VALUES (?, ?)', [longUrl, shortUrl]);
    await connection.end();

    return NextResponse.json({
      longUrl,
      shortUrl
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
