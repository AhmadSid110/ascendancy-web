import { Client, Databases, Account } from 'node-appwrite';
import { cookies } from 'next/headers';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697f306f00366329b3ef';
const API_KEY = process.env.APPWRITE_API_KEY;

export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

  const session = (await cookies()).get('a_session_' + PROJECT_ID);

  if (!session || !session.value) {
    throw new Error('No session');
  }

  client.setSession(session.value);

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
