const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697e89ff001ad611e97a')
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
const SECRETS_COLL_ID = process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID || 'user_secrets';

async function addIndexes() {
    try {
        console.log('Adding index on userId for user_secrets...');
        try {
            await databases.createIndex(
                DB_ID,
                SECRETS_COLL_ID,
                'userId_index',
                'key',
                ['userId'],
                ['asc']
            );
            console.log('Index on userId created.');
        } catch (e) {
            console.log('Index on userId might already exist or error:', e.message);
        }

        console.log('Adding index on keyName for user_secrets...');
        try {
            await databases.createIndex(
                DB_ID,
                SECRETS_COLL_ID,
                'keyName_index',
                'key',
                ['keyName'],
                ['asc']
            );
            console.log('Index on keyName created.');
        } catch (e) {
            console.log('Index on keyName might already exist or error:', e.message);
        }

        console.log('Adding index on userId for chat_history...');
        try {
            await databases.createIndex(
                DB_ID,
                'chat_history',
                'userId_index',
                'key',
                ['userId'],
                ['asc']
            );
            console.log('Index on userId for chat_history created.');
        } catch (e) {
            console.log('Index on userId for chat_history might already exist or error:', e.message);
        }

    } catch (e) {
        console.error('Fatal Error:', e.message);
    }
}

addIndexes();
