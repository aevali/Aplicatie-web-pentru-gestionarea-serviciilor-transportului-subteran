const pool = require('../db');

async function run() {
    try {
        // Adauga coloana pasaport
        await pool.query(`ALTER TABLE tourist_passes ADD COLUMN IF NOT EXISTS pasaport VARCHAR(20) NOT NULL DEFAULT ''`);
        console.log('✅ Coloana pasaport adaugata!');

        // Sterge duplicate (pastreaza primul pass per email)
        const r = await pool.query(`DELETE FROM tourist_passes WHERE id_pass NOT IN (SELECT MIN(id_pass) FROM tourist_passes GROUP BY email)`);
        console.log('✅ Duplicate sterse:', r.rowCount);

        pool.end();
    } catch (e) {
        console.error('❌', e.message);
        pool.end();
        process.exit(1);
    }
}

run();
