const express = require('express');
const pool    = require('../db');
const { verificaToken } = require('../middleware/auth');

const router = express.Router();

// Migrare automată: adaugă coloana last_seen_calator dacă nu există
pool.query(`
    ALTER TABLE tickets_suport
    ADD COLUMN IF NOT EXISTS last_seen_calator TIMESTAMPTZ
`).catch(err => console.error('Migration last_seen_calator:', err.message));

// Toate rutele necesită token
router.use(verificaToken);

/* ─── Helper: inserează notificare globală (pentru angajați/admini) ─── */
async function notifAngajati(mesaj, tip, idCalator = null) {
    try {
        await pool.query(
            `INSERT INTO notificari (mesaj, tip, id_calator) VALUES ($1, $2, $3)`,
            [mesaj, tip, idCalator]
        );
    } catch (e) {
        console.error('notifAngajati error:', e.message);
    }
}

/* ═══════════════════════════════════════════════════════════
   RUTE CĂLĂTOR
═══════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/suport/ticket
   Creează un nou ticket de suport
   Body: { subiect, mesaj }
───────────────────────────────────────────────────────────────────────────── */
router.post('/ticket', async (req, res) => {
    if (req.user?.tip_cont !== 'calator')
        return res.status(403).json({ mesaj: 'Doar călătorii pot deschide tickete.' });

    const { subiect, mesaj } = req.body;
    if (!subiect?.trim() || !mesaj?.trim())
        return res.status(400).json({ mesaj: 'Subiectul și mesajul sunt obligatorii.' });

    const idCalator = req.user.id;
    try {
        // Verifică dacă are deja un ticket deschis sau în lucru
        const existent = await pool.query(
            `SELECT id_ticket FROM tickets_suport
             WHERE id_calator = $1 AND status IN ('deschis','in_lucru')
             LIMIT 1`,
            [idCalator]
        );
        if (existent.rows.length > 0)
            return res.status(409).json({
                mesaj: 'Ai deja un ticket activ. Așteaptă rezolvarea lui înainte să deschizi unul nou.',
                id_ticket: existent.rows[0].id_ticket
            });

        // Crează ticket
        const ticketRes = await pool.query(
            `INSERT INTO tickets_suport (id_calator, subiect)
             VALUES ($1, $2)
             RETURNING id_ticket, subiect, status, created_at`,
            [idCalator, subiect.trim()]
        );
        const ticket = ticketRes.rows[0];

        // Inserează primul mesaj
        await pool.query(
            `INSERT INTO mesaje_ticket (id_ticket, expeditor_tip, expeditor_id, continut)
             VALUES ($1, 'calator', $2, $3)`,
            [ticket.id_ticket, idCalator, mesaj.trim()]
        );

        // Fetch date calator pentru notificare
        const calator = await pool.query(
            `SELECT prenume, nume FROM calatori WHERE id_calator = $1`,
            [idCalator]
        );
        const { prenume, nume } = calator.rows[0] ?? { prenume: 'Călător', nume: '' };

        // Notifică toți angajații
        await notifAngajati(
            `🎫 Ticket nou #${ticket.id_ticket} de la ${prenume} ${nume}: „${subiect.trim()}"`,
            'ticket_nou',
            idCalator
        );

        res.status(201).json({ mesaj: 'Ticket creat cu succes!', ticket });
    } catch (err) {
        console.error('POST /suport/ticket:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/suport/ticket/al-meu
   Returnează ticketul activ al călătorului (dacă există)
───────────────────────────────────────────────────────────────────────────── */
router.get('/ticket/al-meu', async (req, res) => {
    if (req.user?.tip_cont !== 'calator')
        return res.status(403).json({ mesaj: 'Acces refuzat.' });

    const idCalator = req.user.id;
    try {
        const r = await pool.query(
            `SELECT t.id_ticket, t.subiect, t.status, t.rezumat, t.rating,
                    t.created_at, t.updated_at,
                    a.prenume AS angajat_prenume, a.nume AS angajat_nume
             FROM tickets_suport t
             LEFT JOIN angajati a ON a.id_angajat = t.id_angajat
             WHERE t.id_calator = $1
             ORDER BY t.created_at DESC
             LIMIT 10`,
            [idCalator]
        );
        res.json({ tickets: r.rows });
    } catch (err) {
        console.error('GET /suport/ticket/al-meu:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/suport/ticket/:id/mesaje
   Returnează mesajele unui ticket (acces: calator proprietar sau angajat asignat)
───────────────────────────────────────────────────────────────────────────── */
router.get('/ticket/:id/mesaje', async (req, res) => {
    const { id } = req.params;
    const user    = req.user;
    try {
        // Verifică acces
        const ticketRes = await pool.query(
            `SELECT t.*, a.prenume AS angajat_prenume, a.nume AS angajat_nume,
                    c.prenume AS calator_prenume, c.nume AS calator_nume
             FROM tickets_suport t
             LEFT JOIN angajati a ON a.id_angajat = t.id_angajat
             LEFT JOIN calatori c ON c.id_calator = t.id_calator
             WHERE t.id_ticket = $1`,
            [id]
        );
        if (ticketRes.rows.length === 0)
            return res.status(404).json({ mesaj: 'Ticket negăsit.' });

        const ticket = ticketRes.rows[0];

        // Calator poate vedea doar propriul ticket
        if (user.tip_cont === 'calator' && ticket.id_calator !== user.id)
            return res.status(403).json({ mesaj: 'Acces refuzat.' });

        // Angajat poate vedea doar ticketul acceptat de el (sau toate dacă e admin)
        // Permitem angajatilor sa vada mesajele dupa ce accepta

        const mesaje = await pool.query(
            `SELECT m.id_mesaj, m.expeditor_tip, m.expeditor_id, m.continut, m.created_at
             FROM mesaje_ticket m
             WHERE m.id_ticket = $1
             ORDER BY m.created_at ASC`,
            [id]
        );

        res.json({ ticket, mesaje: mesaje.rows });
    } catch (err) {
        console.error('GET /suport/ticket/:id/mesaje:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/suport/ticket/:id/mesaj
   Trimite un mesaj într-un ticket (calator sau angajat)
   Body: { continut }
───────────────────────────────────────────────────────────────────────────── */
router.post('/ticket/:id/mesaj', async (req, res) => {
    const { id }     = req.params;
    const { continut } = req.body;
    const user        = req.user;

    if (!continut?.trim())
        return res.status(400).json({ mesaj: 'Mesajul nu poate fi gol.' });

    try {
        const ticketRes = await pool.query(
            `SELECT * FROM tickets_suport WHERE id_ticket = $1`,
            [id]
        );
        if (ticketRes.rows.length === 0)
            return res.status(404).json({ mesaj: 'Ticket negăsit.' });

        const ticket = ticketRes.rows[0];

        if (['rezolvat', 'inchis'].includes(ticket.status))
            return res.status(400).json({ mesaj: 'Ticket-ul este deja închis. Nu se mai pot trimite mesaje.' });

        // Verifică acces
        if (user.tip_cont === 'calator' && ticket.id_calator !== user.id)
            return res.status(403).json({ mesaj: 'Acces refuzat.' });
        if (user.tip_cont === 'angajat' && ticket.id_angajat !== user.id)
            return res.status(403).json({ mesaj: 'Nu ești angajatul asignat acestui ticket.' });

        const expeditorTip = user.tip_cont === 'calator' ? 'calator' : 'angajat';

        const mesajRes = await pool.query(
            `INSERT INTO mesaje_ticket (id_ticket, expeditor_tip, expeditor_id, continut)
             VALUES ($1, $2, $3, $4)
             RETURNING id_mesaj, expeditor_tip, expeditor_id, continut, created_at`,
            [id, expeditorTip, user.id, continut.trim()]
        );

        // Update timestamp ticket
        await pool.query(
            `UPDATE tickets_suport SET updated_at = CURRENT_TIMESTAMP WHERE id_ticket = $1`,
            [id]
        );

        // Dacă pasagerul trimite mesaj → notificare pentru angajatul asignat
        if (expeditorTip === 'calator' && ticket.id_angajat) {
            const calator = await pool.query(
                `SELECT prenume, nume FROM calatori WHERE id_calator = $1`,
                [ticket.id_calator]
            );
            const { prenume, nume } = calator.rows[0] ?? { prenume: 'Călător', nume: '' };
            await notifAngajati(
                `💬 Mesaj nou în ticket #${id} de la ${prenume} ${nume}`,
                'mesaj_ticket',
                ticket.id_calator
            );
        }

        res.status(201).json({ mesaj: mesajRes.rows[0] });
    } catch (err) {
        console.error('POST /suport/ticket/:id/mesaj:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/suport/ticket/:id/feedback
   Călătorul dă rating (1-5) → ticket devine 'inchis'
   Body: { rating }
───────────────────────────────────────────────────────────────────────────── */
router.post('/ticket/:id/feedback', async (req, res) => {
    if (req.user?.tip_cont !== 'calator')
        return res.status(403).json({ mesaj: 'Acces refuzat.' });

    const { id }     = req.params;
    const { rating } = req.body;
    const idCalator  = req.user.id;

    if (!rating || rating < 1 || rating > 5)
        return res.status(400).json({ mesaj: 'Rating-ul trebuie să fie între 1 și 5.' });

    try {
        const r = await pool.query(
            `UPDATE tickets_suport
             SET rating = $1, status = 'inchis', updated_at = CURRENT_TIMESTAMP
             WHERE id_ticket = $2 AND id_calator = $3 AND status = 'rezolvat'
             RETURNING id_ticket`,
            [rating, id, idCalator]
        );
        if (r.rows.length === 0)
            return res.status(404).json({ mesaj: 'Ticket negăsit sau nu este în starea „rezolvat".' });

        res.json({ mesaj: 'Feedback trimis! Mulțumim pentru evaluare.' });
    } catch (err) {
        console.error('POST /suport/ticket/:id/feedback:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/suport/mesaje-noi
   Badge notificări pentru călător — mesaje noi de la angajat nevăzute de calator
───────────────────────────────────────────────────────────────────────────── */
router.get('/mesaje-noi', async (req, res) => {
    if (req.user?.tip_cont !== 'calator')
        return res.status(403).json({ mesaj: 'Acces refuzat.' });

    const idCalator = req.user.id;
    try {
        const r = await pool.query(
            `SELECT COUNT(*) AS numar
             FROM mesaje_ticket m
             JOIN tickets_suport t ON t.id_ticket = m.id_ticket
             WHERE t.id_calator = $1
               AND m.expeditor_tip = 'angajat'
               AND (t.last_seen_calator IS NULL OR m.created_at > t.last_seen_calator)`,
            [idCalator]
        );
        res.json({ numar: parseInt(r.rows[0].numar, 10) });
    } catch (err) {
        console.error('GET /suport/mesaje-noi:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/suport/ticket/:id/vazut
   Călătorul marchează că a văzut conversația → actualizează last_seen_calator
───────────────────────────────────────────────────────────────────────────── */
router.post('/ticket/:id/vazut', async (req, res) => {
    if (req.user?.tip_cont !== 'calator')
        return res.status(403).json({ mesaj: 'Acces refuzat.' });

    const { id }    = req.params;
    const idCalator = req.user.id;
    try {
        await pool.query(
            `UPDATE tickets_suport
             SET last_seen_calator = CURRENT_TIMESTAMP
             WHERE id_ticket = $1 AND id_calator = $2`,
            [id, idCalator]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /suport/ticket/:id/vazut:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ═══════════════════════════════════════════════════════════
   RUTE ANGAJAT / ADMIN
═══════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/suport/tickets
   Lista tuturor ticketelor (angajat/admin)
   ?status=deschis|in_lucru|rezolvat|inchis
───────────────────────────────────────────────────────────────────────────── */
router.get('/tickets', async (req, res) => {
    if (req.user?.tip_cont !== 'angajat')
        return res.status(403).json({ mesaj: 'Acces refuzat. Doar angajați.' });

    const { status } = req.query;
    const validStatuses = ['deschis', 'in_lucru', 'rezolvat', 'inchis'];

    try {
        let query, params;
        if (status && validStatuses.includes(status)) {
            query = `
                SELECT t.id_ticket, t.subiect, t.status, t.rating, t.created_at, t.updated_at,
                       c.prenume AS calator_prenume, c.nume AS calator_nume, c.email AS calator_email,
                       a.prenume AS angajat_prenume, a.nume AS angajat_nume
                FROM tickets_suport t
                JOIN calatori c ON c.id_calator = t.id_calator
                LEFT JOIN angajati a ON a.id_angajat = t.id_angajat
                WHERE t.status = $1
                ORDER BY t.created_at DESC`;
            params = [status];
        } else {
            query = `
                SELECT t.id_ticket, t.subiect, t.status, t.rating, t.created_at, t.updated_at,
                       c.prenume AS calator_prenume, c.nume AS calator_nume, c.email AS calator_email,
                       a.prenume AS angajat_prenume, a.nume AS angajat_nume
                FROM tickets_suport t
                JOIN calatori c ON c.id_calator = t.id_calator
                LEFT JOIN angajati a ON a.id_angajat = t.id_angajat
                ORDER BY
                    CASE t.status
                        WHEN 'deschis'  THEN 0
                        WHEN 'in_lucru' THEN 1
                        WHEN 'rezolvat' THEN 2
                        ELSE 3
                    END,
                    t.created_at DESC`;
            params = [];
        }

        const r = await pool.query(query, params);
        res.json({ tickets: r.rows });
    } catch (err) {
        console.error('GET /suport/tickets:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/suport/ticket/:id/accepta
   Angajatul acceptă un ticket → status devine 'in_lucru'
───────────────────────────────────────────────────────────────────────────── */
router.post('/ticket/:id/accepta', async (req, res) => {
    if (req.user?.tip_cont !== 'angajat')
        return res.status(403).json({ mesaj: 'Acces refuzat.' });

    const { id }    = req.params;
    const idAngajat = req.user.id;

    try {
        const r = await pool.query(
            `UPDATE tickets_suport
             SET id_angajat = $1, status = 'in_lucru', updated_at = CURRENT_TIMESTAMP
             WHERE id_ticket = $2 AND status = 'deschis'
             RETURNING id_ticket, id_calator`,
            [idAngajat, id]
        );
        if (r.rows.length === 0)
            return res.status(404).json({ mesaj: 'Ticket negăsit sau deja acceptat de alt angajat.' });

        const { id_calator } = r.rows[0];

        // Fetch date angajat
        const angRes = await pool.query(
            `SELECT prenume, nume FROM angajati WHERE id_angajat = $1`,
            [idAngajat]
        );
        const { prenume, nume } = angRes.rows[0] ?? { prenume: 'Angajat', nume: '' };

        // Notifică admin
        await notifAngajati(
            `✅ Angajatul ${prenume} ${nume} a acceptat ticket-ul #${id}`,
            'ticket_acceptat',
            id_calator
        );

        res.json({ mesaj: 'Ticket acceptat! Poți începe conversația cu pasagerul.' });
    } catch (err) {
        console.error('POST /suport/ticket/:id/accepta:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/suport/ticket/:id/rezolva
   Angajatul rezolvă ticket-ul → status devine 'rezolvat'
   Body: { rezumat }
───────────────────────────────────────────────────────────────────────────── */
router.post('/ticket/:id/rezolva', async (req, res) => {
    if (req.user?.tip_cont !== 'angajat')
        return res.status(403).json({ mesaj: 'Acces refuzat.' });

    const { id }      = req.params;
    const { rezumat } = req.body;
    const idAngajat   = req.user.id;

    if (!rezumat?.trim())
        return res.status(400).json({ mesaj: 'Rezumatul este obligatoriu.' });

    try {
        const r = await pool.query(
            `UPDATE tickets_suport
             SET rezumat = $1, status = 'rezolvat', updated_at = CURRENT_TIMESTAMP
             WHERE id_ticket = $2 AND id_angajat = $3 AND status = 'in_lucru'
             RETURNING id_ticket, id_calator`,
            [rezumat.trim(), id, idAngajat]
        );
        if (r.rows.length === 0)
            return res.status(404).json({ mesaj: 'Ticket negăsit sau nu ești angajatul asignat.' });

        const { id_calator } = r.rows[0];

        // Fetch date angajat
        const angRes = await pool.query(
            `SELECT prenume, nume FROM angajati WHERE id_angajat = $1`,
            [idAngajat]
        );
        const { prenume, nume } = angRes.rows[0] ?? { prenume: 'Angajat', nume: '' };

        // Notifică admin cu rezumatul
        await notifAngajati(
            `📋 Ticket #${id} rezolvat de ${prenume} ${nume}. Rezumat: „${rezumat.trim().slice(0, 120)}${rezumat.length > 120 ? '...' : ''}"`,
            'ticket_rezolvat',
            id_calator
        );

        res.json({ mesaj: 'Ticket marcat ca rezolvat! Pasagerul va putea lăsa un feedback.' });
    } catch (err) {
        console.error('POST /suport/ticket/:id/rezolva:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

module.exports = router;
