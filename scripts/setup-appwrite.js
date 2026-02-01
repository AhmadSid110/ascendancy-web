const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function setup() {
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID;
    const collId = process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID;

    try {
        console.log(`Checking database: ${dbId}...`);
        await databases.get(dbId);
        console.log("Database exists.");
    } catch (e) {
        console.log("Database not found, creating...");
        await databases.create(dbId, 'Ascendancy Database');
    }

    try {
        console.log(`Checking collection: ${collId}...`);
        await databases.getCollection(dbId, collId);
        console.log("Collection exists.");
    } catch (e) {
        console.log("Collection not found, creating...");
        await databases.createCollection(dbId, collId, 'User Secrets');
        
        // Add attributes
        console.log("Adding attributes...");
        await databases.createStringAttribute(dbId, collId, 'userId', 255, true);
        await databases.createStringAttribute(dbId, collId, 'keyName', 100, true);
        await databases.createStringAttribute(dbId, collId, 'keyValue', 2048, true);
        
        console.log("Waiting for index propagation...");
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log("Appwrite setup complete!");
}

setup().catch(console.error);
