const { Pool } = require('pg');
require('dotenv').config();

async function testDatabaseConnection() {
    console.log('🔍 Testing Database Connection...');
    
    const databaseUrl = process.env.DATABASE_URL;
    console.log(`🔗 Database URL: ${databaseUrl}`);
    
    if (!databaseUrl || databaseUrl === '${{DATABASE_URL}}') {
        console.error('❌ DATABASE_URL is not properly configured');
        console.log('💡 For local development, you need:');
        console.log('   1. Install PostgreSQL locally');
        console.log('   2. Create a database');
        console.log('   3. Set DATABASE_URL to: postgresql://username:password@localhost:5432/database_name');
        console.log('   4. Or use a cloud database service');
        return;
    }
    
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 1,
        connectionTimeoutMillis: 5000,
    });
    
    try {
        console.log('📡 Attempting to connect...');
        const client = await pool.connect();
        console.log('✅ Database connection successful!');
        
        // Test a simple query
        const result = await client.query('SELECT NOW() as current_time');
        console.log(`⏰ Database time: ${result.rows[0].current_time}`);
        
        // Check if tables exist
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        if (tablesResult.rows.length > 0) {
            console.log('📋 Existing tables:');
            tablesResult.rows.forEach(row => {
                console.log(`   - ${row.table_name}`);
            });
        } else {
            console.log('⚠️ No tables found - database needs to be migrated');
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error(`   Error: ${error.message}`);
        
        if (error.code) {
            console.error(`   Code: ${error.code}`);
        }
        
        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 This usually means:');
            console.log('   - PostgreSQL is not running');
            console.log('   - Wrong host/port in connection string');
            console.log('   - Firewall blocking the connection');
        }
    } finally {
        await pool.end();
    }
}

testDatabaseConnection().catch(console.error);