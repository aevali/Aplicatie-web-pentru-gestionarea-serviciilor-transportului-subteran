const express = require('express');
const pool    = require('../db');
const { verificaToken, verificaAngajat } = require('../middleware/auth');

const router = express.Router();

// Toate rutele necesita autentificare angajat (incluzand admini, care au acelasi tip_cont)
router.use(verificaToken, verificaAngajat);

// ID statie default: Piata Romana (folosit pentru calatorii_efectuate)
// Poate fi schimbat in viitor cand implementam selectia statiei
const ID_STATIE_DEFAULT = 27; // Piata Romana

const COOLDOWN_MINUTE = 15; // minute pauza intre scanari abonament

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/validare/scaneaza
   Body: { cod_qr: "<uuid>" }
   Returnează: { ok, tip, calator, titlu, mesaj }
───────────────────────────────────────────────────────────────────────────── */
router.post('/scaneaza', async (req, res) => {
    const { cod_qr } = req.body;

    if (!cod_qr || typeof cod_qr !== 'string' || !cod_qr.trim()) {
        return res.status(400).json({ ok: false, mesaj: 'Codul QR lipsește sau este invalid.' });
    }

    const qr = cod_qr.trim();

    try {
        /* ── 1. Cauta in bilete ── */
        const biletQ = await pool.query(
            `SELECT b.id_bilet, b.numar_calatorii, b.numar_calatorii_ramase,
                    b.id_calator,
                    c.prenume, c.nume, c.tip AS tip_calator
             FROM bilete b
             JOIN calatori c ON c.id_calator = b.id_calator
             WHERE b.cod_qr = $1 AND b.activ = TRUE AND b.numar_calatorii_ramase > 0`,
            [qr]
        );

        if (biletQ.rows.length > 0) {
            const bilet = biletQ.rows[0];

            // Scade o calatorie
            const ramase = bilet.numar_calatorii_ramase - 1;
            await pool.query(
                `UPDATE bilete
                 SET numar_calatorii_ramase = $1,
                     activ = CASE WHEN $1 = 0 THEN FALSE ELSE TRUE END
                 WHERE id_bilet = $2`,
                [ramase, bilet.id_bilet]
            );

            // Inregistreaza calatoria
            await pool.query(
                `INSERT INTO calatorii_efectuate (id_calator, id_statie, id_bilet, scanat_la)
                 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
                [bilet.id_calator, ID_STATIE_DEFAULT, bilet.id_bilet]
            );

            return res.json({
                ok: true,
                tip: 'bilet',
                calator: {
                    prenume:    bilet.prenume,
                    nume:       bilet.nume,
                    tip_calator: bilet.tip_calator,
                },
                titlu: {
                    calatorii_ramase: ramase,
                    numar_calatorii:  bilet.numar_calatorii,
                },
                mesaj: ramase === 0
                    ? `✅ Bilet validat! Ultima călătorie utilizată.`
                    : `✅ Bilet validat! Au rămas ${ramase} din ${bilet.numar_calatorii} călătorii.`,
            });
        }

        /* ── 2. Cauta in abonamente ── */
        const abonQ = await pool.query(
            `SELECT a.id_abonament, a.tip, a.data_expirare,
                    a.id_calator,
                    c.prenume, c.nume, c.tip AS tip_calator
             FROM abonamente a
             JOIN calatori c ON c.id_calator = a.id_calator
             WHERE a.cod_qr = $1 AND a.data_expirare >= CURRENT_DATE`,
            [qr]
        );

        if (abonQ.rows.length > 0) {
            const abon = abonQ.rows[0];

            // Verifica cooldown 15 minute
            const cooldownQ = await pool.query(
                `SELECT scanat_la FROM calatorii_efectuate
                 WHERE id_abonament = $1
                   AND scanat_la > NOW() - INTERVAL '${COOLDOWN_MINUTE} minutes'
                 ORDER BY scanat_la DESC
                 LIMIT 1`,
                [abon.id_abonament]
            );

            if (cooldownQ.rows.length > 0) {
                const ultima = new Date(cooldownQ.rows[0].scanat_la);
                const secunde = Math.round((Date.now() - ultima.getTime()) / 1000);
                const minuteRamase = COOLDOWN_MINUTE - Math.floor(secunde / 60);
                const secundeRamase = 60 - (secunde % 60);

                return res.status(429).json({
                    ok: false,
                    tip: 'abonament',
                    calator: {
                        prenume:     abon.prenume,
                        nume:        abon.nume,
                        tip_calator: abon.tip_calator,
                    },
                    mesaj: `⏳ Abonament folosit recent. Mai așteaptă ${minuteRamase}m ${secundeRamase}s.`,
                });
            }

            // Inregistreaza calatoria
            await pool.query(
                `INSERT INTO calatorii_efectuate (id_calator, id_statie, id_abonament, scanat_la)
                 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
                [abon.id_calator, ID_STATIE_DEFAULT, abon.id_abonament]
            );

            const LABEL_ABON = {
                zi: '1 zi', trei_zile: '3 zile', saptamana: '1 săptămână',
                luna: '1 lună', sase_luni: '6 luni', an: '1 an',
            };

            return res.json({
                ok: true,
                tip: 'abonament',
                calator: {
                    prenume:     abon.prenume,
                    nume:        abon.nume,
                    tip_calator: abon.tip_calator,
                },
                titlu: {
                    tip_abon:      abon.tip,
                    data_expirare: abon.data_expirare,
                },
                mesaj: `✅ Abonament validat! (${LABEL_ABON[abon.tip] ?? abon.tip})`,
            });
        }

        /* ── 3. Codul QR nu corespunde niciunui titlu activ ── */
        return res.status(404).json({
            ok: false,
            mesaj: '❌ Codul QR nu corespunde unui titlu de călătorie activ sau valid.',
        });

    } catch (err) {
        console.error('POST /validare/scaneaza:', err.message);
        res.status(500).json({ ok: false, mesaj: 'Eroare internă server. Încearcă din nou.' });
    }
});

module.exports = router;
