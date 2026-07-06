const express = require('express');
const pool    = require('../db');
const { verificaToken, verificaAngajat, verificaAdmin } = require('../middleware/auth');

const router = express.Router();

// Toate rutele necesită admin
router.use(verificaToken, verificaAngajat, verificaAdmin);

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/setari
   Returnează toate setările din tabela setari_aplicatie
───────────────────────────────────────────────────────────────────────────── */
router.get('/', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT cheie, valoare, updated_at
             FROM setari_aplicatie
             ORDER BY cheie`
        );

        // Transformă array-ul în obiect { cheie: valoare }
        const setari = {};
        for (const row of r.rows) {
            setari[row.cheie] = row.valoare;
        }

        res.json({ setari });
    } catch (err) {
        console.error('GET /api/setari:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUT /api/setari
   Body: { setari: { cheie: valoare, cheie2: valoare2, ... } }
   Actualizează (UPSERT) setările primite
───────────────────────────────────────────────────────────────────────────── */
router.put('/', async (req, res) => {
    const { setari } = req.body;

    if (!setari || typeof setari !== 'object' || Object.keys(setari).length === 0) {
        return res.status(400).json({ mesaj: 'Obiectul „setari" este obligatoriu.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const [cheie, valoare] of Object.entries(setari)) {
            // Validare: cheia nu trebuie să fie goală, valoarea trebuie să fie string/număr
            if (!cheie || typeof cheie !== 'string') continue;
            const val = String(valoare).trim();
            if (!val) continue;

            await client.query(
                `INSERT INTO setari_aplicatie (cheie, valoare)
                 VALUES ($1, $2)
                 ON CONFLICT (cheie) DO UPDATE
                 SET valoare = EXCLUDED.valoare,
                     updated_at = CURRENT_TIMESTAMP`,
                [cheie.trim(), val]
            );
        }

        await client.query('COMMIT');

        // Returnează setările actualizate
        const r = await pool.query(
            `SELECT cheie, valoare FROM setari_aplicatie ORDER BY cheie`
        );
        const setariActualizate = {};
        for (const row of r.rows) {
            setariActualizate[row.cheie] = row.valoare;
        }

        res.json({
            mesaj: 'Setările au fost actualizate.',
            setari: setariActualizate,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('PUT /api/setari:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    } finally {
        client.release();
    }
});

module.exports = router;
