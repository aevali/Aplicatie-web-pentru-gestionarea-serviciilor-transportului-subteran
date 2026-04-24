const express = require('express');
const pool    = require('../db');
const { verificaToken, verificaAngajat } = require('../middleware/auth');

const router = express.Router();

// Toate rutele necesită autentificare angajat/admin
// Notă: verificaAngajat permite și admin (tip_cont === 'angajat' cu rol admin)
router.use(verificaToken);
router.use((req, res, next) => {
    if (req.user?.tip_cont !== 'angajat') {
        return res.status(403).json({ mesaj: 'Acces refuzat. Doar angajați/admini.' });
    }
    next();
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/notificari
   Returnează toate notificările (cele mai recente primele)
───────────────────────────────────────────────────────────────────────────── */
router.get('/', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT n.id_notificare, n.mesaj, n.tip, n.citita, n.created_at,
                    c.prenume, c.nume
             FROM notificari n
             LEFT JOIN calatori c ON c.id_calator = n.id_calator
             ORDER BY n.created_at DESC
             LIMIT 100`
        );
        res.json({ notificari: r.rows });
    } catch (err) {
        console.error('GET /notificari:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/notificari/numar-necitite
   Returnează numărul de notificări necitite (pentru badge)
───────────────────────────────────────────────────────────────────────────── */
router.get('/numar-necitite', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT COUNT(*) AS numar FROM notificari WHERE citita = FALSE`
        );
        res.json({ numar: parseInt(r.rows[0].numar, 10) });
    } catch (err) {
        console.error('GET /notificari/numar-necitite:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUT /api/notificari/:id/citita
   Marchează o notificare ca citită
───────────────────────────────────────────────────────────────────────────── */
router.put('/:id/citita', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(
            `UPDATE notificari SET citita = TRUE WHERE id_notificare = $1`,
            [id]
        );
        res.json({ mesaj: 'Notificare marcată ca citită.' });
    } catch (err) {
        console.error('PUT /notificari/:id/citita:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUT /api/notificari/marcheaza-toate
   Marchează toate notificările ca citite
───────────────────────────────────────────────────────────────────────────── */
router.put('/marcheaza-toate/citite', async (req, res) => {
    try {
        await pool.query(`UPDATE notificari SET citita = TRUE WHERE citita = FALSE`);
        res.json({ mesaj: 'Toate notificările au fost marcate ca citite.' });
    } catch (err) {
        console.error('PUT /notificari/marcheaza-toate:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

module.exports = router;
