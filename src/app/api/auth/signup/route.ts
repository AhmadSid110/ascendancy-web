import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/appwrite-server';
import { Account, ID } from 'node-appwrite';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const client = await createClient();
    const account = new Account(client);
    
    // 1. Create User
    await account.create(ID.unique(), email, password, name);
    
    // 2. Create Session
    const session = await account.createEmailPasswordSession(email, password);

    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697e89ff001ad611e97a';
    const cookieName = `a_session_${projectId}`;

    (await cookies()).set(cookieName, session.secret, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true, user: session });
  } catch (error: any) {
    console.error("Signup API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
