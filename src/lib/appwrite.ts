import { Client, Account, Databases, Storage } from 'appwrite';

export const client = new Client();

client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697f306f00366329b3ef');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Database/Collection Constants
export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
export const CHAT_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID || 'chat_history';
export const SECRETS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID || 'user_secrets';
export const COUNCIL_CONFIG_COLLECTION_ID = 'council_config';
export const DEBATE_HISTORY_COLLECTION_ID = 'debate_history';
