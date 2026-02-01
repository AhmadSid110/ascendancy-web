import { Client, Databases, Account } from 'node-appwrite';
import { cookies } from 'next/headers';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697e89ff001ad611e97a';
const API_KEY = process.env.APPWRITE_API_KEY;

export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

  // Check for session cookie
  const session = (await cookies()).get('a_session_' + PROJECT_ID);

  if (session && session.value) {
    client.setSession(session.value);
  } else {
    // If no cookie, we might have a JWT in the headers
    // Note: This requires the caller to pass the headers or we use a different approach.
    // In Next.js App Router, we can read headers() here!
    const { headers } = await import('next/headers');
    const jwt = (await headers()).get('x-appwrite-jwt');
    if (jwt) {
        client.setJWT(jwt);
    } else {
        throw new Error('No session or JWT found');
    }
  }

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
  };
}

export async function createAdminClient() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

  if (API_KEY) {
    client.setKey(API_KEY);
  }

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
  };
}

// Client for login/signup (unauthenticated server-side)
export async function createClient() {
    return new Client()
      .setEndpoint(ENDPOINT)
      .setProject(PROJECT_ID);
}
