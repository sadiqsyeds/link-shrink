import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Function to create a database connection
async function getConnection() {
  try {
    return await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    throw new Error('Database connection error');
  }
}

// Handle GET request for the shortened URL
export async function GET(req, context) {
  const { shortUrl } = context.params;

  if (!shortUrl) {
    return NextResponse.json({ error: 'Short URL is required' }, { status: 400 });
  }

  try {
    const connection = await getConnection();

    // Query the database for the corresponding long URL
    const [rows] = await connection.execute(
      'SELECT long_link FROM links_master WHERE short_link = ? LIMIT 1;',
      [shortUrl]
    );

    await connection.end();

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Short URL not found' }, { status: 404 });
    }

    const longUrl = rows[0].long_link;

    // Redirect the user to the long URL
    return NextResponse.redirect(longUrl);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
