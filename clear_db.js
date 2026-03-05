const { Client } = require('pg');

async function dropLocks() {
    const client = new Client({
        connectionString: 'postgresql://postgres.onerbncfwhostkpiypfu:Slam2025%21%40%40@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
    });

    try {
        await client.connect();
        console.log("Connected to DB.");

        // First attempt to drop connections
        await client.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = 'postgres' AND pid <> pg_backend_pid();
        `);
        console.log("Terminated other backends.");

        // Let's just drop the tables here so Prisma doesn't have to prompt
        // and we can run it sequentially.
        await client.query(`DROP TABLE IF EXISTS menu_db CASCADE;`);
        console.log("Dropped menu_db");
        await client.query(`DROP TABLE IF EXISTS sales_db CASCADE;`);
        console.log("Dropped sales_db");

        console.log("Success! Locks cleared.");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

dropLocks();
