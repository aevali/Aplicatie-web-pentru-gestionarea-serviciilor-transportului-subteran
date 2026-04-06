const bcrypt = require('bcrypt');
const pool = require('../db');
require('dotenv').config({ path: '../.env' });

// =============================================
// Credentialele primului admin — schimba-le!
// =============================================
const ADMIN = {
    nume: 'Admin',
    prenume: 'Principal',
    email: 'admin@metrou.ro',
    parola: 'Admin1234!',
};
// =============================================

const seed = async () => {
    try {
        const existing = await pool.query(
            'SELECT id_angajat FROM angajati WHERE email = $1',
            [ADMIN.email]
        );

        if (existing.rows.length > 0) {
            console.log('⚠️  Admin-ul exista deja. Nu s-a inserat nimic.');
            process.exit(0);
        }

        const parolaHash = await bcrypt.hash(ADMIN.parola, 10);

        await pool.query(
            `INSERT INTO angajati (nume, prenume, email, parola, rol)
             VALUES ($1, $2, $3, $4, 'admin')`,
            [ADMIN.nume, ADMIN.prenume, ADMIN.email, parolaHash]
        );

        console.log('✅ Admin creat cu succes!');
        console.log(`   Email: ${ADMIN.email}`);
        console.log(`   Parola: ${ADMIN.parola}`);
        console.log('   ⚠️  Schimba parola dupa primul login!');
    } catch (err) {
        console.error('❌ Eroare la creare admin:', err.message);
    } finally {
        await pool.end();
    }
};

seed();
