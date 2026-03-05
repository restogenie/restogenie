const { Client } = require('pg');

async function dropTargetTables() {
    const client = new Client({
        connectionString: 'postgresql://postgres.onerbncfwhostkpiypfu:Slam2025%21%40%40@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres'
    });

    try {
        await client.connect();
        console.log("Connected to DB via 5432.");

        await client.query(`DROP TABLE IF EXISTS "sales_db" CASCADE;`);
        console.log("Dropped sales_db");

        await client.query(`DROP TABLE IF EXISTS "menu_db" CASCADE;`);
        console.log("Dropped menu_db");

        console.log("Success! Target tables dropped safely.");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

dropTargetTables();
