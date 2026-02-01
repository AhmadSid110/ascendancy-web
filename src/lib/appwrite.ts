import { Client, Account, Databases } from 'appwrite';

export const client = new Client();

client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'ascendancy');

export const account = new Account(client);
export const databases = new Databases(client);

// Database/Collection Constants
export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'main';
export const CHAT_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID || 'chat_history';
