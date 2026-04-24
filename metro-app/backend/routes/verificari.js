const express = require('express');
const path    = require('path');
const fs      = require('fs');
const pool    = require('../db');
const { verificaToken, verificaAngajat } = require('../middleware/auth');

const router = express.Router();

// Toate rutele necesită autentificare angajat (sau admin)
router.use(verificaToken, verificaAngajat);

// ── GET /api/verificari ─ lista cereri (cu filtrare opțională pe status) ──
router.get('/', async (req, res) => {
    const { status } = req.query; // in_asteptare | aprobata | respinsa | (gol = toate)
    const statusuriValide = ['in_asteptare', 'aprobata', 'respinsa'];

    try {
        let query, params;

        if (status && statusuriValide.includes(status)) {
            query = `
                SELECT cr.id_cerere, cr.tip_solicitat, cr.cale_document,
                       cr.status, cr.motiv_respingere, cr.created_at, cr.updated_at,
                       c.nume, c.prenume, c.email, c.tip AS tip_calator,
                       a.prenume AS angajat_prenume, a.nume AS angajat_nume
                FROM cereri_reducere cr
                JOIN calatori c ON c.id_calator = cr.id_calator
                LEFT JOIN angajati a ON a.id_angajat = cr.id_angajat
                WHERE cr.status = $1
                ORDER BY cr.created_at DESC`;
            params = [status];
        } else {
            query = `
                SELECT cr.id_cerere, cr.tip_solicitat, cr.cale_document,
                       cr.status, cr.motiv_respingere, cr.created_at, cr.updated_at,
                       c.nume, c.prenume, c.email, c.tip AS tip_calator,
                       a.prenume AS angajat_prenume, a.nume AS angajat_nume
                FROM cereri_reducere cr
                JOIN calatori c ON c.id_calator = cr.id_calator
                LEFT JOIN angajati a ON a.id_angajat = cr.id_angajat
                ORDER BY
                    CASE cr.status WHEN 'in_asteptare' THEN 0 WHEN 'respinsa' THEN 1 ELSE 2 END,
                    cr.created_at DESC`;
            params = [];
        }

        const r = await pool.query(query, params);
        res.json(r.rows);
    } catch (err) {
        console.error('GET /verificari:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

// ── GET /api/verificari/:id/document ─ descarcă un document ──────────
// ?index=0 (buletin, implicit) sau ?index=1 (legitimație)
router.get('/:id/document', async (req, res) => {
    const { id }    = req.params;
    const idx       = parseInt(req.query.index ?? '0', 10);
    try {
        const r = await pool.query(
            'SELECT cale_document FROM cereri_reducere WHERE id_cerere = $1',
            [id]
        );
        if (r.rows.length === 0)
            return res.status(404).json({ mesaj: 'Cererea nu a fost găsită.' });

        // Suport pentru format JSON array și format vechi (string simplu)
        let caleRelativa;
        try {
            const parsed = JSON.parse(r.rows[0].cale_document);
            const list   = Array.isArray(parsed) ? parsed : [parsed];
            caleRelativa = list[idx] ?? list[0];
        } catch {
            caleRelativa = r.rows[0].cale_document;
        }

        const caleFisier = path.join(__dirname, '..', 'uploads', caleRelativa);
        if (!fs.existsSync(caleFisier))
            return res.status(404).json({ mesaj: 'Fișierul nu mai există pe server.' });

        res.sendFile(caleFisier);
    } catch (err) {
        console.error('GET /verificari/:id/document:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

// ── PUT /api/verificari/:id ─ aprobă sau respinge ──────────────────────
router.put('/:id', async (req, res) => {
    const { id }              = req.params;
    const { actiune, motiv }  = req.body; // actiune: 'aproba' | 'respinge'
    const idAngajat           = req.angajat.id;

    if (!['aproba', 'respinge'].includes(actiune))
        return res.status(400).json({ mesaj: 'Acțiune invalidă. Folosiți "aproba" sau "respinge".' });
    if (actiune === 'respinge' && (!motiv || !motiv.trim()))
        return res.status(400).json({ mesaj: 'Motivul respingerii este obligatoriu.' });

    const statusNou = actiune === 'aproba' ? 'aprobata' : 'respinsa';

    try {
        const r = await pool.query(
            `UPDATE cereri_reducere
             SET status = $1,
                 motiv_respingere = $2,
                 id_angajat = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id_cerere = $4
             RETURNING id_cerere, status, motiv_respingere, updated_at`,
            [statusNou, actiune === 'respinge' ? motiv.trim() : null, idAngajat, id]
        );

        if (r.rows.length === 0)
            return res.status(404).json({ mesaj: 'Cererea nu a fost găsită.' });

        res.json({ mesaj: `Cererea a fost ${statusNou === 'aprobata' ? 'aprobată' : 'respinsă'}.`, cerere: r.rows[0] });
    } catch (err) {
        console.error('PUT /verificari/:id:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

module.exports = router;
