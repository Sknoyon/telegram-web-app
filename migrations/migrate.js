const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    try {
        console.log('🔄 Starting database migration...');
        
        // Read the schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute the schema
        await pool.query(schema);
        
        console.log('✅ Database migration completed successfully!');
        console.log('📊 Tables created:');
        console.log('   - users');
        console.log('   - products');
        console.log('   - orders');
        console.log('   - order_items');
        console.log('   - invoices');
        console.log('🎯 Sample products inserted');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration };