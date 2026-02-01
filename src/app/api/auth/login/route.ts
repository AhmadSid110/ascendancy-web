import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite-server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Use Admin Client to create a session (this returns a session object with a secret)
    // Wait, createAdminClient uses an API KEY. 
    // Actually, we should just use a regular Client on the server side to perform the login.
    
    const { account } = await createAdminClient();
    // No, admin client can't create a session for a user using email/password and get a session secret easily in one go that works for session set.
    
    // Better: 
    const { Client, Account } = require('node-appwrite');
    const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
    
    const tempAccount = new Account(client);
    const session = await tempAccount.createEmailPasswordSession(email, password);

    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
    const cookieName = `a_session_${projectId}`;

    (await cookies()).set(cookieName, session.secret, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true, user: session });
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
