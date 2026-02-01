const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697e89ff001ad611e97a')
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
const SECRETS_COLL_ID = process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID || 'user_secrets';

async function checkCollection() {
    try {
        const collection = await databases.getCollection(DB_ID, SECRETS_COLL_ID);
        console.log('Collection Attributes:', JSON.stringify(collection.attributes, null, 2));
        console.log('Collection Indexes:', JSON.stringify(collection.indexes, null, 2));
        
        const docs = await databases.listDocuments(DB_ID, SECRETS_COLL_ID);
        console.log('Total Documents:', docs.total);
        console.log('Documents:', JSON.stringify(docs.documents.map(d => ({ userId: d.userId, keyName: d.keyName, id: d.$id })), null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkCollection();
