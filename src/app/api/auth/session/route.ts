import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSessionClient } from '@/lib/appwrite-server';

export async function GET() {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { secret } = await req.json();

    if (!secret) {
      return NextResponse.json({ error: 'Session secret is required' }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697e89ff001ad611e97a';
    const cookieName = `a_session_${projectId}`;

    const response = NextResponse.json({ success: true });
    
    // Set the session cookie on the local domain
    (await cookies()).set(cookieName, secret, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697e89ff001ad611e97a';
  const cookieName = `a_session_${projectId}`;
  
  (await cookies()).delete(cookieName);
  
  return NextResponse.json({ success: true });
}
