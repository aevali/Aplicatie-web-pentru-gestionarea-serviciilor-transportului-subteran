const pool = require('./db');

async function run() {
    try {
        console.log('Dropping "inchisa" column from statii...');
        await pool.query('ALTER TABLE statii DROP COLUMN inchisa;');
        console.log('Success!');
    } catch (e) {
        if (e.code === '42703') {
            console.log('Column does not exist.');
        } else {
            console.error('Error:', e.message);
        }
    } finally {
        pool.end();
    }
}
run();
