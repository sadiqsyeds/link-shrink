// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { User } from '../../types';

export async function GET() {
  const users: User[] = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' },
  ];
  return NextResponse.json(users);
}
