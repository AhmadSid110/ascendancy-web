const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697e89ff001ad611e97a')
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
const SECRETS_COLL = process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID || 'user_secrets';
const CHAT_COLL = process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID || 'chat_history';

async function addIndexes() {
    if (!process.env.APPWRITE_API_KEY) {
        console.error("Error: APPWRITE_API_KEY is missing in .env.local");
        return;
    }

    console.log(`Adding indexes to database: ${DB_ID}...`);

    // Index for user_secrets
    try {
        console.log(`Adding index to ${SECRETS_COLL}...`);
        await databases.createIndex(
            DB_ID, 
            SECRETS_COLL, 
            'userId_index', 
            'key', 
            ['userId'], 
            ['asc']
        );
        console.log(" - Added userId index to user_secrets");
    } catch (e) {
        console.log(` - ${e.message}`);
    }

    try {
        await databases.createIndex(
            DB_ID, 
            SECRETS_COLL, 
            'keyName_index', 
            'key', 
            ['keyName'], 
            ['asc']
        );
        console.log(" - Added keyName index to user_secrets");
    } catch (e) {
        console.log(` - ${e.message}`);
    }

    // Index for chat_history
    try {
        console.log(`Adding index to ${CHAT_COLL}...`);
        await databases.createIndex(
            DB_ID, 
            CHAT_COLL, 
            'userId_index', 
            'key', 
            ['userId'], 
            ['asc']
        );
        console.log(" - Added userId index to chat_history");
    } catch (e) {
        console.log(` - ${e.message}`);
    }

    console.log("Index creation complete.");
}

addIndexes().catch(console.error);
