const { Client, Databases, Query } = require('node-appwrite');

async function checkConfig() {
    const client = new Client()
        .setEndpoint('https://sgp.cloud.appwrite.io/v1')
        .setProject('697e89ff001ad611e97a')
        .setKey('standard_2c443bca2a51ab9ac67afb4064ec1b65dba6ce57c77d02932d03744d26c7eea40c2940d733a49151c85f2990b1ef1a5145ab0b77d3f20e5b475e856a41a38d18b655a869e8cdc5dd422ee3fb3ec58ca56abcc5bf98b801e1aac42b4c84ae2bb60cda5cedd6231075b767b3c501fceb7681625afd1639c1d9d91c761ed4eda634');

    const databases = new Databases(client);

    try {
        const configs = await databases.listDocuments(
            'ascendancy_db',
            'council_config',
            [Query.equal('configId', 'default')]
        );
        console.log("Council Config Documents:", JSON.stringify(configs.documents, null, 2));
    } catch (e) {
        console.error("Error checking config:", e.message);
    }
}
checkConfig();