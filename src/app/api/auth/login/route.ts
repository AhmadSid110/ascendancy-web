import { NextResponse } from 'next/server';
import { createClient } from '@/lib/appwrite-server';
import { cookies } from 'next/headers';
import { Account } from 'node-appwrite';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const client = await createClient();
    const account = new Account(client);
    const session = await account.createEmailPasswordSession(email, password);

    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697f306f00366329b3ef';
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
