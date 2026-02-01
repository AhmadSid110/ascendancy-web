const { Client, Users } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697e89ff001ad611e97a')
    .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(client);

async function check() {
    try {
        const res = await users.list();
        console.log(`Successfully connected. Found ${res.total} users.`);
    } catch (e) {
        console.error("Connection failed:", e.message);
    }
}

check();
