const express = require('express');
const pool    = require('../db');
const { verificaToken, verificaAngajat, verificaAdmin, verificaCalator } = require('../middleware/auth');

const router = express.Router();

// Toate rutele necesită autentificare
router.use(verificaToken);

/* ─────────────────────────────────────────────────────────────────────────────
   INIT: Crează tabela anunturi_citite dacă nu există
───────────────────────────────────────────────────────────────────────────── */
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS anunturi_citite (
                id_calator  INT NOT NULL REFERENCES calatori(id_calator),
                id_anunt    INT NOT NULL REFERENCES anunturi(id_anunt) ON DELETE CASCADE,
                citit_la    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_calator, id_anunt)
            )
        `);
    } catch (err) {
        console.error('anunturi_citite init:', err.message);
    }
})();

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/anunturi
   Returnează toate anunțurile (cele mai recente primele)
   Dacă e călător, include și dacă a citit fiecare anunț
───────────────────────────────────────────────────────────────────────────── */
router.get('/', async (req, res) => {
    try {
        const isCalator = req.user?.tip_cont === 'calator';
        const idCalator = req.user?.id;

        let query;
        let params = [];

        if (isCalator && idCalator) {
            query = `
                SELECT a.id_anunt, a.titlu, a.continut, a.nivel_importanta, a.creat, a.id_angajat,
                       ang.prenume AS autor_prenume, ang.nume AS autor_nume,
                       CASE WHEN ac.id_calator IS NOT NULL THEN true ELSE false END AS citit
                FROM anunturi a
                LEFT JOIN angajati ang ON ang.id_angajat = a.id_angajat
                LEFT JOIN anunturi_citite ac ON ac.id_anunt = a.id_anunt AND ac.id_calator = $1
                ORDER BY a.creat DESC
                LIMIT 100
            `;
            params = [idCalator];
        } else {
            query = `
                SELECT a.id_anunt, a.titlu, a.continut, a.nivel_importanta, a.creat, a.id_angajat,
                       ang.prenume AS autor_prenume, ang.nume AS autor_nume
                FROM anunturi a
                LEFT JOIN angajati ang ON ang.id_angajat = a.id_angajat
                ORDER BY a.creat DESC
                LIMIT 100
            `;
        }

        const r = await pool.query(query, params);
        res.json({ anunturi: r.rows });
    } catch (err) {
        console.error('GET /anunturi:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/anunturi/necitite
   Returnează nr. anunțuri necitite de călătorul curent (pentru badge topbar)
───────────────────────────────────────────────────────────────────────────── */
router.get('/necitite', verificaCalator, async (req, res) => {
    try {
        const idCalator = req.user.id;
        const r = await pool.query(
            `SELECT COUNT(*) AS numar
             FROM anunturi a
             WHERE NOT EXISTS (
                 SELECT 1 FROM anunturi_citite ac
                 WHERE ac.id_anunt = a.id_anunt AND ac.id_calator = $1
             )`,
            [idCalator]
        );
        res.json({ numar: parseInt(r.rows[0].numar, 10) });
    } catch (err) {
        console.error('GET /anunturi/necitite:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/anunturi
   Creează un anunț nou (doar admin)
───────────────────────────────────────────────────────────────────────────── */
router.post('/', verificaAngajat, verificaAdmin, async (req, res) => {
    const { titlu, continut, nivel_importanta } = req.body;
    const idAngajat = req.user.id;

    if (!titlu?.trim() || !continut?.trim()) {
        return res.status(400).json({ mesaj: 'Titlul și conținutul sunt obligatorii.' });
    }

    const nivel = ['info', 'important', 'urgent'].includes(nivel_importanta) ? nivel_importanta : 'info';

    try {
        const r = await pool.query(
            `INSERT INTO anunturi (titlu, continut, nivel_importanta, id_angajat)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [titlu.trim(), continut.trim(), nivel, idAngajat]
        );

        // Fetch cu join autor
        const full = await pool.query(
            `SELECT a.*, ang.prenume AS autor_prenume, ang.nume AS autor_nume
             FROM anunturi a
             LEFT JOIN angajati ang ON ang.id_angajat = a.id_angajat
             WHERE a.id_anunt = $1`,
            [r.rows[0].id_anunt]
        );

        res.status(201).json(full.rows[0]);
    } catch (err) {
        console.error('POST /anunturi:', err.message);
        res.status(500).json({ mesaj: 'Eroare la crearea anunțului.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUT /api/anunturi/:id
   Editează un anunț existent (doar admin)
───────────────────────────────────────────────────────────────────────────── */
router.put('/:id', verificaAngajat, verificaAdmin, async (req, res) => {
    const { id } = req.params;
    const { titlu, continut, nivel_importanta } = req.body;

    if (!titlu?.trim() || !continut?.trim()) {
        return res.status(400).json({ mesaj: 'Titlul și conținutul sunt obligatorii.' });
    }

    const nivel = ['info', 'important', 'urgent'].includes(nivel_importanta) ? nivel_importanta : 'info';

    try {
        const r = await pool.query(
            `UPDATE anunturi SET titlu = $1, continut = $2, nivel_importanta = $3
             WHERE id_anunt = $4
             RETURNING *`,
            [titlu.trim(), continut.trim(), nivel, id]
        );

        if (r.rowCount === 0) {
            return res.status(404).json({ mesaj: 'Anunțul nu a fost găsit.' });
        }

        const full = await pool.query(
            `SELECT a.*, ang.prenume AS autor_prenume, ang.nume AS autor_nume
             FROM anunturi a
             LEFT JOIN angajati ang ON ang.id_angajat = a.id_angajat
             WHERE a.id_anunt = $1`,
            [id]
        );

        res.json(full.rows[0]);
    } catch (err) {
        console.error('PUT /anunturi/:id:', err.message);
        res.status(500).json({ mesaj: 'Eroare la editarea anunțului.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/anunturi/:id
   Șterge un anunț (doar admin)
───────────────────────────────────────────────────────────────────────────── */
router.delete('/:id', verificaAngajat, verificaAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const r = await pool.query(
            `DELETE FROM anunturi WHERE id_anunt = $1 RETURNING id_anunt`,
            [id]
        );
        if (r.rowCount === 0) {
            return res.status(404).json({ mesaj: 'Anunțul nu a fost găsit.' });
        }
        res.json({ mesaj: 'Anunț șters cu succes.' });
    } catch (err) {
        console.error('DELETE /anunturi/:id:', err.message);
        res.status(500).json({ mesaj: 'Eroare la ștergerea anunțului.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/anunturi/:id/citit
   Marchează un anunț ca citit pentru călătorul curent
───────────────────────────────────────────────────────────────────────────── */
router.post('/:id/citit', verificaCalator, async (req, res) => {
    const { id } = req.params;
    const idCalator = req.user.id;
    try {
        await pool.query(
            `INSERT INTO anunturi_citite (id_calator, id_anunt)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [idCalator, id]
        );
        res.json({ mesaj: 'Anunț marcat ca citit.' });
    } catch (err) {
        console.error('POST /anunturi/:id/citit:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/anunturi/marcheaza-toate
   Marchează toate anunțurile ca citite pentru călătorul curent
───────────────────────────────────────────────────────────────────────────── */
router.post('/marcheaza-toate', verificaCalator, async (req, res) => {
    const idCalator = req.user.id;
    try {
        await pool.query(
            `INSERT INTO anunturi_citite (id_calator, id_anunt)
             SELECT $1, a.id_anunt FROM anunturi a
             WHERE NOT EXISTS (
                 SELECT 1 FROM anunturi_citite ac
                 WHERE ac.id_anunt = a.id_anunt AND ac.id_calator = $1
             )`,
            [idCalator]
        );
        res.json({ mesaj: 'Toate anunțurile au fost marcate ca citite.' });
    } catch (err) {
        console.error('POST /anunturi/marcheaza-toate:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

module.exports = router;
