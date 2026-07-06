const pool = require('./db');

async function run() {
    try {
        console.log('Adding "inchisa" column to statii...');
        await pool.query('ALTER TABLE statii ADD COLUMN inchisa BOOLEAN NOT NULL DEFAULT FALSE');
        console.log('Success!');
    } catch (e) {
        if (e.code === '42701') {
            console.log('Column already exists.');
        } else {
            console.error('Error:', e.message);
        }
    } finally {
        pool.end();
    }
}
run();
