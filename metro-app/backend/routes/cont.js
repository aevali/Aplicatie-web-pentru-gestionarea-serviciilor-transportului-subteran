const express   = require('express');
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');
const bcrypt    = require('bcrypt');
const pool      = require('../db');
const { verificaToken, verificaCalator } = require('../middleware/auth');

const router = express.Router();

// ── Configurare Multer ──
const uploadDir = path.join(__dirname, '..', 'uploads', 'documente');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ts  = Date.now();
        const rnd = Math.floor(Math.random() * 1000);  // evita coliziuni la upload simultan
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `calator_${req.user.id}_${ts}_${rnd}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per fisier
    fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Tip fișier nepermis. Sunt acceptate: JPG, PNG, PDF.'));
    },
});

// Helper: sterge fisierele dintr-un cale_document (string JSON sau string simplu)
function stergeDocumente(caleDocument) {
    try {
        const cai = JSON.parse(caleDocument);
        const list = Array.isArray(cai) ? cai : [caleDocument];
        list.forEach(c => {
            const f = path.join(__dirname, '..', 'uploads', c);
            if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch (_) {}
        });
    } catch {
        // format vechi (string simplu)
        const f = path.join(__dirname, '..', 'uploads', caleDocument);
        if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch (_) {}
    }
}

// Toate rutele necesită autentificare calator
router.use(verificaToken, verificaCalator);

// ── GET /api/cont/profil ──────────────────────────────────────────────
router.get('/profil', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT id_calator, nume, prenume, email, tip, created_at
             FROM calatori WHERE id_calator = $1`,
            [req.user.id]
        );
        if (r.rows.length === 0)
            return res.status(404).json({ mesaj: 'Utilizatorul nu a fost găsit.' });
        res.json(r.rows[0]);
    } catch (err) {
        console.error('GET /cont/profil:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

// ── GET /api/cont/verificare ─ status cerere activă ──────────────────
router.get('/verificare', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT id_cerere, tip_solicitat, cale_document, status,
                    motiv_respingere, created_at, updated_at
             FROM cereri_reducere
             WHERE id_calator = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [req.user.id]
        );
        if (r.rows.length === 0) return res.json({ cerere: null });
        res.json({ cerere: r.rows[0] });
    } catch (err) {
        console.error('GET /cont/verificare:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

// ── POST /api/cont/documente ─ upload documente (1–2 fisiere) ─────────
router.post('/documente', upload.array('documente', 2), async (req, res) => {
    const files = req.files ?? [];
    if (files.length === 0) {
        return res.status(400).json({ mesaj: 'Niciun fișier nu a fost trimis.' });
    }

    const cai = files.map(f => `documente/${f.filename}`);
    const caleDocument = JSON.stringify(cai); // e.g. ["documente/f1.jpg","documente/f2.pdf"]

    try {
        // Dacă există o cerere anterioară, ștergem fișierele vechi și înregistrarea
        const existenta = await pool.query(
            `SELECT id_cerere, cale_document FROM cereri_reducere
             WHERE id_calator = $1 ORDER BY created_at DESC LIMIT 1`,
            [req.user.id]
        );

        if (existenta.rows.length > 0) {
            const vechi = existenta.rows[0];
            stergeDocumente(vechi.cale_document);
            await pool.query('DELETE FROM cereri_reducere WHERE id_cerere = $1', [vechi.id_cerere]);
        }

        // Obține tipul calatorului
        const calatorRes = await pool.query(
            'SELECT tip FROM calatori WHERE id_calator = $1',
            [req.user.id]
        );
        const tipSolicitat = calatorRes.rows[0]?.tip ?? 'adult';

        // Inserează cerere nouă cu cale JSON
        const r = await pool.query(
            `INSERT INTO cereri_reducere (id_calator, tip_solicitat, cale_document, status)
             VALUES ($1, $2, $3, 'in_asteptare')
             RETURNING id_cerere, tip_solicitat, cale_document, status, created_at`,
            [req.user.id, tipSolicitat, caleDocument]
        );

        const nrDoc = cai.length;
        res.status(201).json({
            cerere: r.rows[0],
            mesaj: `${nrDoc === 1 ? 'Documentul a fost trimis' : `Cele ${nrDoc} documente au fost trimise`} cu succes. Vei fi notificat după verificare.`,
        });
    } catch (err) {
        console.error('POST /cont/documente:', err.message);
        // Curata fisierele deja uploadate
        cai.forEach(c => {
            const f = path.join(__dirname, '..', 'uploads', c);
            if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch (_) {}
        });
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

// ── POST /api/cont/schimba-parola ─────────────────────────────────────
router.post('/schimba-parola', async (req, res) => {
    const { parola_veche, parola_noua, confirmare } = req.body;

    if (!parola_veche || !parola_noua || !confirmare)
        return res.status(400).json({ mesaj: 'Toate câmpurile sunt obligatorii.' });
    if (parola_noua !== confirmare)
        return res.status(400).json({ mesaj: 'Parolele noi nu coincid.' });
    if (parola_noua.length < 8)
        return res.status(400).json({ mesaj: 'Parola nouă trebuie să aibă minim 8 caractere.' });

    try {
        const r = await pool.query(
            'SELECT parola FROM calatori WHERE id_calator = $1',
            [req.user.id]
        );
        if (r.rows.length === 0)
            return res.status(404).json({ mesaj: 'Utilizatorul nu a fost găsit.' });

        const ok = await bcrypt.compare(parola_veche, r.rows[0].parola);
        if (!ok)
            return res.status(401).json({ mesaj: 'Parola actuală este incorectă.' });

        const hash = await bcrypt.hash(parola_noua, 10);
        await pool.query(
            'UPDATE calatori SET parola = $1 WHERE id_calator = $2',
            [hash, req.user.id]
        );
        res.json({ mesaj: 'Parola a fost schimbată cu succes.' });
    } catch (err) {
        console.error('POST /cont/schimba-parola:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

module.exports = router;
