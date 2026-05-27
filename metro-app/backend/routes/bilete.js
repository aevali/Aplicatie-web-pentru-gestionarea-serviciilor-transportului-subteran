const express = require('express');
const pool    = require('../db');
const { verificaToken, verificaCalator } = require('../middleware/auth');

const router = express.Router();

// Toate rutele necesită autentificare călător
router.use(verificaToken, verificaCalator);

/* ─────────────────────────────────────────────────────────────────────────────
   Preţuri & configurare
───────────────────────────────────────────────────────────────────────────── */
const PRETURI_BILETE = {
    1:  5.00,
    2:  10.00,
    5:  25.00,
    10: 45.00,
    20: 80.00,
};

const PRETURI_ABONAMENTE = {
    zi:        12.00,
    trei_zile: 35.00,
    saptamana: 45.00,
    luna:      100.00,
    sase_luni: 500.00,
    an:        900.00,
};

// Abonamentele la care se aplică reducerea (max 1 lună)
const ABONAMENTE_CU_REDUCERE = new Set(['zi', 'trei_zile', 'saptamana', 'luna']);

// Procentul de reducere per tip călător (din preţul întreg)
const REDUCERE_PROCENT = {
    elev:      1.00, // 100% reducere → gratuit
    student:   0.90, // 90% reducere
    pensionar: 0.50, // 50% reducere
    adult:     0.00, // fără reducere
};

// Calculează zile de valabilitate pentru abonament
function zileValabilitate(tip) {
    switch (tip) {
        case 'zi':        return 1;
        case 'trei_zile': return 3;
        case 'saptamana': return 7;
        case 'luna':      return 30;
        case 'sase_luni': return 180;
        case 'an':        return 365;
        default:          return 1;
    }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: verifică dacă există un bilet sau abonament activ
───────────────────────────────────────────────────────────────────────────── */
async function getActiv(idCalator) {
    // Bilet activ (calatorii ramase > 0)
    const bilet = await pool.query(
        `SELECT id_bilet, numar_calatorii, numar_calatorii_ramase,
                data_achizitie, pret, cod_qr, reducere_aplicata
         FROM bilete
         WHERE id_calator = $1 AND activ = TRUE AND numar_calatorii_ramase > 0
         ORDER BY data_achizitie DESC
         LIMIT 1`,
        [idCalator]
    );
    if (bilet.rows.length > 0) {
        return { tip: 'bilet', ...bilet.rows[0] };
    }

    // Abonament activ (data_expirare >= azi)
    const abon = await pool.query(
        `SELECT id_abonament, tip AS tip_abonament, data_achizitie, data_expirare,
                pret, cod_qr, reducere_aplicata
         FROM abonamente
         WHERE id_calator = $1 AND data_expirare >= CURRENT_DATE
         ORDER BY data_achizitie DESC
         LIMIT 1`,
        [idCalator]
    );
    if (abon.rows.length > 0) {
        return { tip: 'abonament', ...abon.rows[0] };
    }

    return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: verifică dacă reducerea e eligibilă pentru acest călător
───────────────────────────────────────────────────────────────────────────── */
async function verificaReducere(idCalator) {
    const r = await pool.query(
        `SELECT c.tip,
                cr.status AS status_documente
         FROM calatori c
         LEFT JOIN cereri_reducere cr
             ON cr.id_calator = c.id_calator
            AND cr.status = 'aprobata'
         WHERE c.id_calator = $1
         LIMIT 1`,
        [idCalator]
    );
    if (r.rows.length === 0) return { tip: 'adult', reducere: false, procent: 0 };

    const { tip, status_documente } = r.rows[0];
    const esteEligibil = tip !== 'adult' && status_documente === 'aprobata';
    const procent = esteEligibil ? (REDUCERE_PROCENT[tip] ?? 0) : 0;

    return { tip, reducere: esteEligibil, procent };
}

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/bilete/activ
   Returnează biletul sau abonamentul activ al călătorului
───────────────────────────────────────────────────────────────────────────── */
router.get('/activ', async (req, res) => {
    try {
        const activ = await getActiv(req.user.id);
        res.json({ activ });
    } catch (err) {
        console.error('GET /bilete/activ:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/bilete/cooldown
   Returnează secundele rămase din cooldown-ul de 15 min al abonamentului activ
   Răspuns: { cooldownActiv: bool, secundeRamase: number }
───────────────────────────────────────────────────────────────────────────── */
router.get('/cooldown', async (req, res) => {
    try {
        const activ = await getActiv(req.user.id);

        // Cooldown-ul se aplică doar abonamentelor
        if (!activ || activ.tip !== 'abonament') {
            return res.json({ cooldownActiv: false, secundeRamase: 0 });
        }

        const r = await pool.query(
            `SELECT GREATEST(0,
                EXTRACT(EPOCH FROM (scanat_la + INTERVAL '15 minutes' - NOW()))
             )::INTEGER AS secunde_ramase
             FROM calatorii_efectuate
             WHERE id_abonament = $1
             ORDER BY scanat_la DESC
             LIMIT 1`,
            [activ.id_abonament]
        );

        if (r.rows.length === 0) {
            return res.json({ cooldownActiv: false, secundeRamase: 0 });
        }

        const secunde = r.rows[0].secunde_ramase;
        return res.json({ cooldownActiv: secunde > 0, secundeRamase: secunde });
    } catch (err) {
        console.error('GET /bilete/cooldown:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/bilete/eligibilitate
   Returnează dacă se aplică reducerea și procentul
───────────────────────────────────────────────────────────────────────────── */
router.get('/eligibilitate', async (req, res) => {
    try {
        const info = await verificaReducere(req.user.id);
        res.json(info);
    } catch (err) {
        console.error('GET /bilete/eligibilitate:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/bilete/cumpara-bilet
   Body: { numar_calatorii: 1 | 2 | 5 | 10 | 20 }
───────────────────────────────────────────────────────────────────────────── */
router.post('/cumpara-bilet', async (req, res) => {
    const { numar_calatorii } = req.body;
    const idCalator = req.user.id;

    const nrValid = [1, 2, 5, 10, 20];
    if (!nrValid.includes(numar_calatorii)) {
        return res.status(400).json({ mesaj: 'Număr de călătorii invalid.' });
    }

    try {
        // Verifică dacă există deja un titlu activ
        const activ = await getActiv(idCalator);
        if (activ) {
            return res.status(409).json({
                mesaj: 'Ai deja un titlu de călătorie activ. Nu poți cumpăra altul până acesta expiră sau se consumă.',
                activ,
            });
        }

        // Biletele nu au reducere — mereu preț întreg
        const pretFinal = PRETURI_BILETE[numar_calatorii];

        // Insert
        const r = await pool.query(
            `INSERT INTO bilete
                (id_calator, numar_calatorii, numar_calatorii_ramase, pret, reducere_aplicata)
             VALUES ($1, $2, $2, $3, FALSE)
             RETURNING id_bilet, numar_calatorii, numar_calatorii_ramase,
                       data_achizitie, pret, cod_qr, reducere_aplicata`,
            [idCalator, numar_calatorii, pretFinal]
        );

        const bilet = r.rows[0];

        res.status(201).json({
            mesaj: `Bilet pentru ${numar_calatorii} călători${numar_calatorii !== 1 ? 'i' : 'e'} cumpărat cu succes!`,
            titlu: { tip: 'bilet', ...bilet },
        });
    } catch (err) {
        console.error('POST /bilete/cumpara-bilet:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/bilete/cumpara-abonament
   Body: { tip: 'zi' | 'trei_zile' | 'saptamana' | 'luna' | 'sase_luni' | 'an' }
───────────────────────────────────────────────────────────────────────────── */
router.post('/cumpara-abonament', async (req, res) => {
    const { tip } = req.body;
    const idCalator = req.user.id;

    const tipuriValide = Object.keys(PRETURI_ABONAMENTE);
    if (!tipuriValide.includes(tip)) {
        return res.status(400).json({ mesaj: 'Tipul de abonament este invalid.' });
    }

    try {
        // Verifică dacă există deja un titlu activ
        const activ = await getActiv(idCalator);
        if (activ) {
            return res.status(409).json({
                mesaj: 'Ai deja un titlu de călătorie activ. Nu poți cumpăra altul până acesta expiră sau se consumă.',
                activ,
            });
        }

        // Calculează prețul cu reducerea aplicată
        const pretBaza = PRETURI_ABONAMENTE[tip];
        const { tip: tipCalator, reducere, procent } = await verificaReducere(idCalator);

        // Reducerea se aplică DOAR la abonamente ≤ 1 lună
        const reducereEligibila = reducere && ABONAMENTE_CU_REDUCERE.has(tip);
        const pretFinal = reducereEligibila ? +(pretBaza * (1 - procent)).toFixed(2) : pretBaza;
        const reducereAplicata = reducereEligibila;

        // Calculează data expirare
        const zile = zileValabilitate(tip);

        // Insert
        const r = await pool.query(
            `INSERT INTO abonamente
                (id_calator, tip, data_expirare, pret, reducere_aplicata)
             VALUES ($1, $2, CURRENT_DATE + $3::INTEGER, $4, $5)
             RETURNING id_abonament, tip, data_achizitie, data_expirare,
                       pret, cod_qr, reducere_aplicata`,
            [idCalator, tip, zile, pretFinal, reducereAplicata]
        );

        const abonament = r.rows[0];

        // Label frumos pentru mesaj
        const labelTip = {
            zi: '1 zi', trei_zile: '3 zile', saptamana: '1 săptămână',
            luna: '1 lună', sase_luni: '6 luni', an: '1 an',
        }[tip] ?? tip;

        const descriereReducere = reducereAplicata
            ? ` (reducere ${Math.round(procent * 100)}% aplicată — ${tipCalator})`
            : '';

        res.status(201).json({
            mesaj: `Abonament ${labelTip} cumpărat cu succes!${descriereReducere}`,
            titlu: { tip: 'abonament', ...abonament },
        });
    } catch (err) {
        console.error('POST /bilete/cumpara-abonament:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/bilete/toate
   Returnează toate biletele și abonamentele călătorului (activ primul)
───────────────────────────────────────────────────────────────────────────── */
router.get('/toate', async (req, res) => {
    const idCalator = req.user.id;
    try {
        const bilete = await pool.query(
            `SELECT id_bilet AS id, 'bilet' AS tip,
                    numar_calatorii, numar_calatorii_ramase,
                    pret, reducere_aplicata, data_achizitie,
                    NULL::DATE AS data_expirare,
                    activ AND numar_calatorii_ramase > 0 AS este_activ
             FROM bilete
             WHERE id_calator = $1
             ORDER BY data_achizitie DESC`,
            [idCalator]
        );

        const abonamente = await pool.query(
            `SELECT id_abonament AS id, 'abonament' AS tip,
                    NULL AS numar_calatorii, NULL AS numar_calatorii_ramase,
                    pret, reducere_aplicata, data_achizitie,
                    data_expirare, tip AS tip_abonament,
                    data_expirare >= CURRENT_DATE AS este_activ
             FROM abonamente
             WHERE id_calator = $1
             ORDER BY data_achizitie DESC`,
            [idCalator]
        );

        // Combina si sorteaza: activ primul, restul dupa data desc
        const toate = [...bilete.rows, ...abonamente.rows].sort((a, b) => {
            if (a.este_activ && !b.este_activ) return -1;
            if (!a.este_activ && b.este_activ) return 1;
            return new Date(b.data_achizitie) - new Date(a.data_achizitie);
        });

        res.json({ titluri: toate });
    } catch (err) {
        console.error('GET /bilete/toate:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/bilete/:id/anuleaza
   Anulează un bilet activ
───────────────────────────────────────────────────────────────────────────── */
router.delete('/:id/anuleaza', async (req, res) => {
    const idCalator = req.user.id;
    const { id } = req.params;
    try {
        const r = await pool.query(
            `UPDATE bilete
             SET activ = FALSE
             WHERE id_bilet = $1 AND id_calator = $2
               AND activ = TRUE AND numar_calatorii_ramase > 0
             RETURNING id_bilet`,
            [id, idCalator]
        );
        if (r.rows.length === 0) {
            return res.status(404).json({ mesaj: 'Bilet activ negăsit sau nu îți aparține.' });
        }
        res.json({ mesaj: 'Biletul a fost anulat cu succes.' });
    } catch (err) {
        console.error('DELETE /bilete/:id/anuleaza:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/abonamente/:id/anuleaza
   Anulează un abonament activ
───────────────────────────────────────────────────────────────────────────── */
router.delete('/abonament/:id/anuleaza', async (req, res) => {
    const idCalator = req.user.id;
    const { id } = req.params;
    try {
        const r = await pool.query(
            `UPDATE abonamente
             SET data_expirare = CURRENT_DATE - INTERVAL '1 day'
             WHERE id_abonament = $1 AND id_calator = $2
               AND data_expirare >= CURRENT_DATE
             RETURNING id_abonament`,
            [id, idCalator]
        );
        if (r.rows.length === 0) {
            return res.status(404).json({ mesaj: 'Abonament activ negăsit sau nu îți aparține.' });
        }
        res.json({ mesaj: 'Abonamentul a fost anulat cu succes.' });
    } catch (err) {
        console.error('DELETE /abonamente/:id/anuleaza:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/abonamente/:id/reinnoieste
   Reînnoiește un abonament prelungind data de expirare (nu creează unul nou)
   Body: { tipNou: 'zi' | 'trei_zile' | 'saptamana' | 'luna' }
───────────────────────────────────────────────────────────────────────────── */
router.post('/abonament/:id/reinnoieste', async (req, res) => {
    const idCalator = req.user.id;
    const { id } = req.params;
    const { tipNou } = req.body;

    // Tipuri disponibile la reînnoire (max 1 lună)
    const TIPURI_REINNOIESTE = ['zi', 'trei_zile', 'saptamana', 'luna'];
    if (!tipNou || !TIPURI_REINNOIESTE.includes(tipNou)) {
        return res.status(400).json({ mesaj: 'Tipul de abonament ales este invalid. Alege: 1 zi, 3 zile, 7 zile sau 1 lună.' });
    }

    try {
        // Verifică abonamentul existent
        const abon = await pool.query(
            `SELECT id_abonament, tip, data_expirare, reducere_aplicata
             FROM abonamente
             WHERE id_abonament = $1 AND id_calator = $2
               AND data_expirare >= CURRENT_DATE`,
            [id, idCalator]
        );
        if (abon.rows.length === 0) {
            return res.status(404).json({ mesaj: 'Abonament activ negăsit.' });
        }

        const { data_expirare } = abon.rows[0];

        // Verifică că mai sunt ≤ 3 zile
        const azi = new Date();
        const expirare = new Date(data_expirare);
        const diffMs = expirare - azi;
        const diffZile = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffZile > 3) {
            return res.status(400).json({
                mesaj: `Nu poți reînnoi încă. Mai sunt ${diffZile} zile din abonament. Reînnoirea este disponibilă cu maxim 3 zile înainte de expirare.`,
            });
        }

        // Calculează prețul cu eventuala reducere pentru tipul ales
        const pretBaza = PRETURI_ABONAMENTE[tipNou];
        const { tip: tipCalator, reducere, procent } = await verificaReducere(idCalator);
        const reducereEligibila = reducere && ABONAMENTE_CU_REDUCERE.has(tipNou);
        const pretFinal = reducereEligibila ? +(pretBaza * (1 - procent)).toFixed(2) : pretBaza;

        const zileAdd = zileValabilitate(tipNou);

        // UPDATE abonament existent: prelungește data de expirare + acumulează prețul
        // Dacă abonamentul deja a expirat (zile <= 0), pornim de la azi
        const r = await pool.query(
            `UPDATE abonamente
             SET tip = $3,
                 data_expirare = GREATEST(data_expirare, CURRENT_DATE) + $4::INTEGER,
                 pret = pret + $5,
                 reducere_aplicata = ($6 OR reducere_aplicata)
             WHERE id_abonament = $1 AND id_calator = $2
             RETURNING id_abonament, tip, data_achizitie, data_expirare, pret, cod_qr, reducere_aplicata`,
            [id, idCalator, tipNou, zileAdd, pretFinal, reducereEligibila]
        );

        const abonamentActualizat = r.rows[0];

        // Fetch date calator pentru mesajul de notificare
        const calator = await pool.query(
            `SELECT prenume, nume FROM calatori WHERE id_calator = $1`,
            [idCalator]
        );
        const { prenume, nume } = calator.rows[0] ?? { prenume: 'Călător', nume: '' };

        const labelTip = {
            zi: '1 zi', trei_zile: '3 zile', saptamana: '1 săptămână', luna: '1 lună',
        }[tipNou] ?? tipNou;

        const mesajNotif = `${prenume} ${nume} și-a reînnoit abonamentul cu ${labelTip} (${pretFinal} lei). Nou termen: ${abonamentActualizat.data_expirare}.`;

        // Inserează notificarea pentru angajați/admini
        await pool.query(
            `INSERT INTO notificari (mesaj, tip, id_calator) VALUES ($1, 'reinoire_abonament', $2)`,
            [mesajNotif, idCalator]
        );

        res.json({
            mesaj: `Abonamentul a fost prelungit cu ${labelTip}!`,
            titlu: { tip: 'abonament', ...abonamentActualizat },
        });
    } catch (err) {
        console.error('POST /abonamente/:id/reinnoieste:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/bilete/bilete-transferabile
   Returnează biletele active cu călătorii rămase ale călătorului curent
───────────────────────────────────────────────────────────────────────────── */
router.get('/bilete-transferabile', async (req, res) => {
    const idCalator = req.user.id;
    try {
        const r = await pool.query(
            `SELECT id_bilet, numar_calatorii, numar_calatorii_ramase,
                    data_achizitie, pret, cod_qr
             FROM bilete
             WHERE id_calator = $1 AND activ = TRUE AND numar_calatorii_ramase > 0
             ORDER BY data_achizitie DESC`,
            [idCalator]
        );
        res.json({ bilete: r.rows });
    } catch (err) {
        console.error('GET /bilete/bilete-transferabile:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/bilete/cauta-destinatar?email=...
   Caută un călător după email pentru transfer
───────────────────────────────────────────────────────────────────────────── */
router.get('/cauta-destinatar', async (req, res) => {
    const { email } = req.query;
    const idCalator = req.user.id;

    if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ gasit: false, mesaj: 'Adresa de email este obligatorie.' });
    }

    const emailNorm = email.trim().toLowerCase();

    try {
        // Verifică să nu fie propriul email
        const eu = await pool.query(
            `SELECT email FROM calatori WHERE id_calator = $1`,
            [idCalator]
        );
        if (eu.rows.length > 0 && eu.rows[0].email.toLowerCase() === emailNorm) {
            return res.status(400).json({ gasit: false, mesaj: 'Nu poți transfera bilete către propriul cont.' });
        }

        // Caută destinatarul
        const r = await pool.query(
            `SELECT id_calator, prenume, nume, email
             FROM calatori
             WHERE LOWER(email) = $1`,
            [emailNorm]
        );

        if (r.rows.length === 0) {
            return res.json({ gasit: false, mesaj: 'Nu a fost găsit niciun utilizator cu acest email.' });
        }

        const dest = r.rows[0];

        // Verifică dacă destinatarul are deja un titlu activ
        const activ = await getActiv(dest.id_calator);
        if (activ) {
            return res.json({
                gasit: true,
                are_activ: true,
                destinatar: { id_calator: dest.id_calator, prenume: dest.prenume, nume: dest.nume, email: dest.email },
                mesaj: 'Utilizatorul are deja un titlu de călătorie activ. Transferul nu este posibil.',
            });
        }

        res.json({
            gasit: true,
            are_activ: false,
            destinatar: { id_calator: dest.id_calator, prenume: dest.prenume, nume: dest.nume, email: dest.email },
        });
    } catch (err) {
        console.error('GET /bilete/cauta-destinatar:', err.message);
        res.status(500).json({ gasit: false, mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/bilete/transfera
   Body: { id_bilet, email_destinatar, numar_calatorii }
   Transferă călătorii dintr-un bilet propriu către un alt călător
───────────────────────────────────────────────────────────────────────────── */
router.post('/transfera', async (req, res) => {
    const { id_bilet, email_destinatar, numar_calatorii } = req.body;
    const idCalator = req.user.id;

    if (!id_bilet || !email_destinatar || !numar_calatorii) {
        return res.status(400).json({ mesaj: 'Toate câmpurile sunt obligatorii.' });
    }

    const nrTransfer = parseInt(numar_calatorii, 10);
    if (isNaN(nrTransfer) || nrTransfer < 1) {
        return res.status(400).json({ mesaj: 'Numărul de călătorii trebuie să fie cel puțin 1.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verifică biletul sursă (cu lock)
        const biletR = await client.query(
            `SELECT id_bilet, id_calator, numar_calatorii, numar_calatorii_ramase, activ
             FROM bilete
             WHERE id_bilet = $1
             FOR UPDATE`,
            [id_bilet]
        );

        if (biletR.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mesaj: 'Biletul nu a fost găsit.' });
        }

        const bilet = biletR.rows[0];

        if (bilet.id_calator !== idCalator) {
            await client.query('ROLLBACK');
            return res.status(403).json({ mesaj: 'Acest bilet nu îți aparține.' });
        }

        if (!bilet.activ || bilet.numar_calatorii_ramase <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ mesaj: 'Biletul nu este activ sau nu are călătorii rămase.' });
        }

        if (nrTransfer > bilet.numar_calatorii_ramase) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                mesaj: `Nu poți transfera ${nrTransfer} călătorii. Ai doar ${bilet.numar_calatorii_ramase} rămase.`,
            });
        }

        // 2. Verifică destinatarul
        const emailNorm = email_destinatar.trim().toLowerCase();

        const euR = await client.query(`SELECT email FROM calatori WHERE id_calator = $1`, [idCalator]);
        if (euR.rows.length > 0 && euR.rows[0].email.toLowerCase() === emailNorm) {
            await client.query('ROLLBACK');
            return res.status(400).json({ mesaj: 'Nu poți transfera bilete către propriul cont.' });
        }

        const destR = await client.query(
            `SELECT id_calator, prenume, nume, email FROM calatori WHERE LOWER(email) = $1`,
            [emailNorm]
        );

        if (destR.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mesaj: 'Destinatarul nu a fost găsit.' });
        }

        const dest = destR.rows[0];

        // 3. Verifică dacă destinatarul are titlu activ
        const activBilet = await client.query(
            `SELECT id_bilet FROM bilete
             WHERE id_calator = $1 AND activ = TRUE AND numar_calatorii_ramase > 0
             LIMIT 1`,
            [dest.id_calator]
        );
        const activAbon = await client.query(
            `SELECT id_abonament FROM abonamente
             WHERE id_calator = $1 AND data_expirare >= CURRENT_DATE
             LIMIT 1`,
            [dest.id_calator]
        );

        if (activBilet.rows.length > 0 || activAbon.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                mesaj: `${dest.prenume} ${dest.nume} are deja un titlu de călătorie activ. Transferul nu este posibil.`,
            });
        }

        // 4. Scade călătoriile din biletul sursă
        const ramase = bilet.numar_calatorii_ramase - nrTransfer;
        await client.query(
            `UPDATE bilete
             SET numar_calatorii_ramase = $1,
                 activ = CASE WHEN $1 = 0 THEN FALSE ELSE TRUE END
             WHERE id_bilet = $2`,
            [ramase, id_bilet]
        );

        // 5. Creează bilet NOU la destinatar (cod_qr UUID generat automat de DB)
        const nouBilet = await client.query(
            `INSERT INTO bilete
                (id_calator, numar_calatorii, numar_calatorii_ramase, pret, reducere_aplicata)
             VALUES ($1, $2, $2, 0, FALSE)
             RETURNING id_bilet, numar_calatorii, numar_calatorii_ramase, data_achizitie, pret, cod_qr`,
            [dest.id_calator, nrTransfer]
        );

        // 6. Notificare pentru destinatar
        const euData = await client.query(
            `SELECT prenume, nume FROM calatori WHERE id_calator = $1`, [idCalator]
        );
        const expeditor = euData.rows[0] ?? { prenume: 'Un utilizator', nume: '' };

        await client.query(
            `INSERT INTO notificari (mesaj, tip, id_calator)
             VALUES ($1, 'transfer_bilet', $2)`,
            [`${expeditor.prenume} ${expeditor.nume} ți-a transferat ${nrTransfer} călători${nrTransfer !== 1 ? 'i' : 'e'} de metrou!`,
             dest.id_calator]
        );

        await client.query('COMMIT');

        res.status(201).json({
            mesaj: `${nrTransfer} călători${nrTransfer !== 1 ? 'i' : 'e'} transferate cu succes către ${dest.prenume} ${dest.nume}!`,
            bilet_sursa: {
                id_bilet: bilet.id_bilet,
                numar_calatorii_ramase: ramase,
                activ: ramase > 0,
            },
            bilet_destinatar: nouBilet.rows[0],
            destinatar: { prenume: dest.prenume, nume: dest.nume, email: dest.email },
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /bilete/transfera:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    } finally {
        client.release();
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/bilete/notificari-transfer
   Returnează notificările de transfer necitite pentru călătorul curent
───────────────────────────────────────────────────────────────────────────── */
router.get('/notificari-transfer', async (req, res) => {
    const idCalator = req.user.id;
    try {
        const r = await pool.query(
            `SELECT id_notificare, mesaj, tip, created_at
             FROM notificari
             WHERE id_calator = $1 AND tip = 'transfer_bilet' AND citita = FALSE
             ORDER BY created_at DESC
             LIMIT 10`,
            [idCalator]
        );
        res.json({ notificari: r.rows });
    } catch (err) {
        console.error('GET /bilete/notificari-transfer:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUT /api/bilete/notificari-transfer/citite
   Marchează toate notificările de transfer ca citite
───────────────────────────────────────────────────────────────────────────── */
router.put('/notificari-transfer/citite', async (req, res) => {
    const idCalator = req.user.id;
    try {
        await pool.query(
            `UPDATE notificari SET citita = TRUE
             WHERE id_calator = $1 AND tip = 'transfer_bilet' AND citita = FALSE`,
            [idCalator]
        );
        res.json({ mesaj: 'Notificări marcate ca citite.' });
    } catch (err) {
        console.error('PUT /bilete/notificari-transfer/citite:', err.message);
        res.status(500).json({ mesaj: 'Eroare internă server.' });
    }
});

module.exports = router;

