const express = require('express');
const bcrypt  = require('bcrypt');
const pool    = require('../db');
const { verificaToken, verificaAngajat } = require('../middleware/auth');

const router = express.Router();

/* ─────────────────────────────────────────────────────────────────────────────
   Prețuri tourist pass (EUR)
───────────────────────────────────────────────────────────────────────────── */
const PRETURI_TOURIST = {
    1: 6.00,
    2: 12.00,
    3: 16.00,
    4: 20.00,
    5: 24.00,
    7: 40.00,
};

const ZILE_VALIDE = Object.keys(PRETURI_TOURIST).map(Number);

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: generare cod de ridicare unic (TR-XXXXXX, 6 chars alfanumerice)
───────────────────────────────────────────────────────────────────────────── */
function genereazaCodRidicare() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // fără I, O, 0, 1 (confuzie)
    let cod = 'TR-';
    for (let i = 0; i < 6; i++) {
        cod += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return cod;
}

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/turisti/register
   Body: { email, parola, zile, id_statie_ridicare, tara, pasaport }
───────────────────────────────────────────────────────────────────────────── */
router.post('/register', async (req, res) => {
    const { email, parola, zile, id_statie_ridicare, tara, pasaport } = req.body;

    // Validări
    if (!email || !parola || !zile || !id_statie_ridicare || !tara || !pasaport) {
        return res.status(400).json({ mesaj: 'All fields are required.' });
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ mesaj: 'Invalid email address.' });
    }

    if (parola.length < 8) {
        return res.status(400).json({ mesaj: 'Password must be at least 8 characters.' });
    }

    const zileNr = parseInt(zile);
    if (!ZILE_VALIDE.includes(zileNr)) {
        return res.status(400).json({ mesaj: 'Invalid number of days.' });
    }

    if (typeof tara !== 'string' || tara.trim().length < 2) {
        return res.status(400).json({ mesaj: 'Please enter a valid country.' });
    }

    if (typeof pasaport !== 'string' || pasaport.trim().length < 4) {
        return res.status(400).json({ mesaj: 'Please enter a valid passport ID (min 4 characters).' });
    }

    try {
        // Verifică dacă email-ul există deja
        const existent = await pool.query(
            `SELECT tp.id_pass, tp.email, tp.zile, tp.pret,
                    tp.cod_ridicare, tp.cod_qr, tp.tara, tp.pasaport,
                    tp.ridicat, tp.data_achizitie,
                    tp.data_activare, tp.data_expirare,
                    tp.parola,
                    s.nume AS statie_nume
             FROM tourist_passes tp
             JOIN statii s ON s.id_statie = tp.id_statie_ridicare
             WHERE tp.email = $1
             ORDER BY tp.data_achizitie DESC
             LIMIT 1`,
            [email]
        );

        if (existent.rows.length > 0) {
            const passExistent = existent.rows[0];
            const parolaCorecta = await bcrypt.compare(parola, passExistent.parola);

            if (!parolaCorecta) {
                return res.status(401).json({ mesaj: 'An account with this email already exists. Incorrect password.' });
            }

            // Parola corectă — returnează pass-ul existent
            const { parola: _, ...passData } = passExistent;
            return res.status(200).json({
                mesaj: 'Welcome back! Here is your existing tourist pass.',
                pass: passData,
            });
        }

        // Verifică stația
        const statieCheck = await pool.query(
            'SELECT id_statie, nume FROM statii WHERE id_statie = $1',
            [id_statie_ridicare]
        );
        if (statieCheck.rows.length === 0) {
            return res.status(404).json({ mesaj: 'Station not found.' });
        }

        const numeStatie = statieCheck.rows[0].nume;

        // Hash parola
        const parolaHash = await bcrypt.hash(parola, 10);

        // Generează cod unic (retry dacă duplicat)
        let codRidicare;
        let tentative = 0;
        while (tentative < 10) {
            codRidicare = genereazaCodRidicare();
            const codExistent = await pool.query(
                'SELECT 1 FROM tourist_passes WHERE cod_ridicare = $1',
                [codRidicare]
            );
            if (codExistent.rows.length === 0) break;
            tentative++;
        }

        if (tentative >= 10) {
            return res.status(500).json({ mesaj: 'Could not generate unique code. Please try again.' });
        }

        const pret = PRETURI_TOURIST[zileNr];

        // Insert
        const r = await pool.query(
            `INSERT INTO tourist_passes
                (email, parola, zile, pret, id_statie_ridicare, cod_ridicare, tara, pasaport)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id_pass, email, zile, pret, id_statie_ridicare,
                       cod_ridicare, cod_qr, tara, pasaport, data_achizitie`,
            [email, parolaHash, zileNr, pret, id_statie_ridicare, codRidicare, tara.trim(), pasaport.trim()]
        );

        const pass = r.rows[0];

        res.status(201).json({
            mesaj: `Tourist pass created successfully!`,
            pass: {
                ...pass,
                statie_nume: numeStatie,
            },
        });

    } catch (err) {
        console.error('POST /api/turisti/register:', err.message);
        res.status(500).json({ mesaj: 'Internal server error.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/turisti/pass/:cod
   Returnează detaliile unui tourist pass după cod_ridicare
───────────────────────────────────────────────────────────────────────────── */
router.get('/pass/:cod', async (req, res) => {
    const { cod } = req.params;

    try {
        const r = await pool.query(
            `SELECT tp.id_pass, tp.email, tp.zile, tp.pret,
                    tp.cod_ridicare, tp.cod_qr, tp.tara, tp.pasaport,
                    tp.ridicat, tp.data_achizitie,
                    tp.data_activare, tp.data_expirare,
                    s.nume AS statie_nume
             FROM tourist_passes tp
             JOIN statii s ON s.id_statie = tp.id_statie_ridicare
             WHERE tp.cod_ridicare = $1`,
            [cod.toUpperCase()]
        );

        if (r.rows.length === 0) {
            return res.status(404).json({ mesaj: 'Tourist pass not found.' });
        }

        res.json({ pass: r.rows[0] });

    } catch (err) {
        console.error('GET /api/turisti/pass/:cod:', err.message);
        res.status(500).json({ mesaj: 'Internal server error.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/turisti/login
   Body: { email, parola }
   Verifică dacă există un tourist pass cu email-ul dat.
   Dacă da + parola corectă → returnează pass-ul.
   Auto-ridică dacă au trecut 7+ zile de la achiziție.
───────────────────────────────────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
    const { email, parola } = req.body;

    if (!email || !parola) {
        return res.status(400).json({ exista: false });
    }

    try {
        const r = await pool.query(
            `SELECT tp.id_pass, tp.email, tp.zile, tp.pret,
                    tp.cod_ridicare, tp.cod_qr, tp.tara, tp.pasaport,
                    tp.ridicat, tp.data_achizitie,
                    tp.data_activare, tp.data_expirare,
                    tp.parola,
                    s.nume AS statie_nume
             FROM tourist_passes tp
             JOIN statii s ON s.id_statie = tp.id_statie_ridicare
             WHERE tp.email = $1
             ORDER BY tp.data_achizitie DESC
             LIMIT 1`,
            [email]
        );

        if (r.rows.length === 0) {
            return res.json({ exista: false });
        }

        const pass = r.rows[0];
        const parolaOk = await bcrypt.compare(parola, pass.parola);

        if (!parolaOk) {
            return res.status(401).json({ exista: true, mesaj: 'Incorrect password.' });
        }

        // Auto-ridică dacă au trecut 7+ zile
        if (!pass.ridicat) {
            const achizitie = new Date(pass.data_achizitie);
            const acum = new Date();
            const zileScurse = (acum - achizitie) / (1000 * 60 * 60 * 24);

            if (zileScurse >= 7) {
                await pool.query(
                    'UPDATE tourist_passes SET ridicat = TRUE WHERE id_pass = $1',
                    [pass.id_pass]
                );
                pass.ridicat = true;
            }
        }

        const { parola: _, ...passData } = pass;

        res.json({
            exista: true,
            pass: passData,
        });

    } catch (err) {
        console.error('POST /api/turisti/login:', err.message);
        res.status(500).json({ exista: false, mesaj: 'Internal server error.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUT /api/turisti/ridica/:id
   Marchează un tourist pass ca ridicat
───────────────────────────────────────────────────────────────────────────── */
router.put('/ridica/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const r = await pool.query(
            `UPDATE tourist_passes SET ridicat = TRUE
             WHERE id_pass = $1
             RETURNING id_pass, ridicat`,
            [id]
        );

        if (r.rows.length === 0) {
            return res.status(404).json({ mesaj: 'Tourist pass not found.' });
        }

        res.json({ mesaj: 'Card marked as collected!', ridicat: true });

    } catch (err) {
        console.error('PUT /api/turisti/ridica:', err.message);
        res.status(500).json({ mesaj: 'Internal server error.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/turisti/valideaza
   Body: { cod, tip }  (tip = 'qr' | 'manual')
   Angajatul scanează QR-ul sau introduce codul TR-XXXXXX.
   Marchează pass-ul ca ridicat, setează data_activare și data_expirare.
───────────────────────────────────────────────────────────────────────────── */

router.post('/valideaza', verificaToken, verificaAngajat, async (req, res) => {
    const { cod, tip } = req.body;

    if (!cod) {
        return res.status(400).json({ ok: false, mesaj: 'Codul este obligatoriu.' });
    }

    try {
        // Caută pass-ul fie după cod_qr (scanat QR) fie după cod_ridicare (introdus manual)
        let r;
        if (tip === 'manual' || cod.startsWith('TR-')) {
            r = await pool.query(
                `SELECT tp.*, s.nume AS statie_nume
                 FROM tourist_passes tp
                 JOIN statii s ON s.id_statie = tp.id_statie_ridicare
                 WHERE UPPER(tp.cod_ridicare) = $1`,
                [cod.toUpperCase()]
            );
        } else {
            // Încearcă mai întâi cod_qr, apoi cod_ridicare
            r = await pool.query(
                `SELECT tp.*, s.nume AS statie_nume
                 FROM tourist_passes tp
                 JOIN statii s ON s.id_statie = tp.id_statie_ridicare
                 WHERE tp.cod_qr = $1 OR UPPER(tp.cod_ridicare) = $2`,
                [cod, cod.toUpperCase()]
            );
        }

        if (r.rows.length === 0) {
            return res.status(404).json({
                ok: false,
                mesaj: 'Codul nu corespunde niciunui tourist pass.',
            });
        }

        const pass = r.rows[0];

        // Verifică dacă e deja activat
        if (pass.ridicat && pass.data_activare) {
            const expira = new Date(pass.data_expirare);
            const acum = new Date();

            if (expira < acum) {
                return res.json({
                    ok: false,
                    mesaj: `Tourist pass expirat. A fost activ din ${new Date(pass.data_activare).toLocaleDateString('ro-RO')} până la ${expira.toLocaleDateString('ro-RO')}.`,
                    pass: {
                        email: pass.email,
                        tara: pass.tara,
                        pasaport: pass.pasaport,
                        zile: pass.zile,
                        pret: pass.pret,
                        statie_nume: pass.statie_nume,
                        data_expirare: pass.data_expirare,
                    },
                });
            }

            return res.json({
                ok: true,
                mesaj: `Tourist pass deja activat! Valid până la ${expira.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
                pass: {
                    email: pass.email,
                    tara: pass.tara,
                    pasaport: pass.pasaport,
                    zile: pass.zile,
                    pret: pass.pret,
                    statie_nume: pass.statie_nume,
                    data_activare: pass.data_activare,
                    data_expirare: pass.data_expirare,
                },
            });
        }

        // Activează pass-ul: ridicat = true, data_activare = acum, data_expirare = acum + zile
        const acum = new Date();
        const expirare = new Date(acum);
        expirare.setDate(expirare.getDate() + pass.zile);

        await pool.query(
            `UPDATE tourist_passes
             SET ridicat = TRUE, data_activare = $1, data_expirare = $2
             WHERE id_pass = $3`,
            [acum.toISOString(), expirare.toISOString(), pass.id_pass]
        );

        res.json({
            ok: true,
            mesaj: `✅ Card turist activat cu succes! Valid ${pass.zile} ${pass.zile === 1 ? 'zi' : 'zile'}, până la ${expirare.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
            pass: {
                email: pass.email,
                tara: pass.tara,
                pasaport: pass.pasaport,
                zile: pass.zile,
                pret: pass.pret,
                statie_nume: pass.statie_nume,
                data_activare: acum.toISOString(),
                data_expirare: expirare.toISOString(),
            },
        });

    } catch (err) {
        console.error('POST /api/turisti/valideaza:', err.message);
        res.status(500).json({ ok: false, mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/turisti/toate
   Returnează toate cererile de tourist pass (doar admin/angajat)
───────────────────────────────────────────────────────────────────────────── */

router.get('/toate', verificaToken, verificaAngajat, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT tp.id_pass, tp.email, tp.zile, tp.pret,
                    tp.cod_ridicare, tp.tara, tp.pasaport,
                    tp.ridicat, tp.data_achizitie,
                    tp.data_activare, tp.data_expirare,
                    s.nume AS statie_nume
             FROM tourist_passes tp
             JOIN statii s ON s.id_statie = tp.id_statie_ridicare
             ORDER BY tp.data_achizitie DESC`
        );

        res.json({ passes: r.rows });
    } catch (err) {
        console.error('GET /api/turisti/toate:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

module.exports = router;
