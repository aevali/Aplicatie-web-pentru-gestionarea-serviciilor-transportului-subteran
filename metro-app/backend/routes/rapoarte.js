const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { verificaToken, verificaAngajat, verificaAdmin } = require('../middleware/auth');

// ══════════════════════════════════════════════
// Toate rutele necesita autentificare admin
// ══════════════════════════════════════════════
router.use(verificaToken, verificaAngajat, verificaAdmin);

// ── Helper: extrage si valideaza parametrul ?luni= ──
function getLuni(req) {
    const n = parseInt(req.query.luni);
    if (isNaN(n) || n < 0) return 12;
    return n;
}

// ── Helper: clauza de filtrare dupa data ──
// Returneaza string SQL (WHERE sau AND) sau string gol daca luni=0 (tot timpul)
function dateWhere(column, luni) {
    if (!luni || luni <= 0) return '';
    return `WHERE ${column} >= CURRENT_DATE - ${luni} * INTERVAL '1 month'`;
}

function dateAnd(column, luni) {
    if (!luni || luni <= 0) return '';
    return `AND ${column} >= CURRENT_DATE - ${luni} * INTERVAL '1 month'`;
}

// ══════════════════════════════════════════════
// GET /api/rapoarte/sumar
// KPI-uri generale — afisate permanent in header
// ══════════════════════════════════════════════
router.get('/sumar', async (_req, res) => {
    try {
        const [calatori, bilete, abonamente, turisti, calatorii, abonActive] = await Promise.all([
            pool.query('SELECT COUNT(*)::INT AS total FROM calatori'),
            pool.query('SELECT COALESCE(SUM(pret), 0)::NUMERIC AS total FROM bilete'),
            pool.query('SELECT COALESCE(SUM(pret), 0)::NUMERIC AS total FROM abonamente'),
            pool.query('SELECT COALESCE(SUM(pret), 0)::NUMERIC AS total FROM tourist_passes'),
            pool.query('SELECT COUNT(*)::INT AS total FROM calatorii_efectuate'),
            pool.query(`SELECT COUNT(*)::INT AS total FROM abonamente WHERE data_expirare >= CURRENT_DATE`),
        ]);

        res.json({
            total_calatori:     calatori.rows[0].total,
            total_venituri:     parseFloat(bilete.rows[0].total) + parseFloat(abonamente.rows[0].total) + parseFloat(turisti.rows[0].total),
            venituri_bilete:    parseFloat(bilete.rows[0].total),
            venituri_abonamente: parseFloat(abonamente.rows[0].total),
            venituri_turisti:   parseFloat(turisti.rows[0].total),
            total_calatorii:    calatorii.rows[0].total,
            abonamente_active:  abonActive.rows[0].total,
        });
    } catch (err) {
        console.error('Eroare /rapoarte/sumar:', err.message);
        res.status(500).json({ mesaj: 'Eroare la generarea sumarului.' });
    }
});

// ══════════════════════════════════════════════
// GET /api/rapoarte/utilizatori?luni=12
// Calatori activi pe luna (au facut cel putin o calatorie) + distributie pe tip
// Nota: calatori.created_at nu exista in schema curenta, deci nu putem calcula
// inregistrari noi pe luna — folosim activitatea reala (calatorii_efectuate) in loc.
// ══════════════════════════════════════════════
router.get('/utilizatori', async (req, res) => {
    const luni = getLuni(req);
    try {
        const [peLuna, peTip, total] = await Promise.all([
            pool.query(`
                SELECT TO_CHAR(date_trunc('month', scanat_la), 'YYYY-MM-DD') AS luna,
                       COUNT(DISTINCT id_calator)::INT AS numar
                FROM calatorii_efectuate
                ${dateWhere('scanat_la', luni)}
                GROUP BY date_trunc('month', scanat_la)
                ORDER BY luna
            `),
            pool.query('SELECT tip, COUNT(*)::INT AS numar FROM calatori GROUP BY tip ORDER BY numar DESC'),
            pool.query('SELECT COUNT(*)::INT AS total FROM calatori'),
        ]);

        res.json({
            pe_luna: peLuna.rows,
            pe_tip:  peTip.rows,
            total:   total.rows[0].total,
        });
    } catch (err) {
        console.error('Eroare /rapoarte/utilizatori:', err.message);
        res.status(500).json({ mesaj: 'Eroare la generarea raportului de utilizatori.' });
    }
});

// ══════════════════════════════════════════════
// GET /api/rapoarte/venituri?luni=12
// Venituri lunare din bilete, abonamente, turisti
// ══════════════════════════════════════════════
router.get('/venituri', async (req, res) => {
    const luni = getLuni(req);
    try {
        const [bilete, abonamente, turisti] = await Promise.all([
            pool.query(`
                SELECT TO_CHAR(date_trunc('month', data_achizitie), 'YYYY-MM-DD') AS luna,
                       COUNT(*)::INT AS numar,
                       COALESCE(SUM(pret), 0)::NUMERIC AS venit
                FROM bilete
                ${dateWhere('data_achizitie', luni)}
                GROUP BY date_trunc('month', data_achizitie)
            `),
            pool.query(`
                SELECT TO_CHAR(date_trunc('month', data_achizitie), 'YYYY-MM-DD') AS luna,
                       COUNT(*)::INT AS numar,
                       COALESCE(SUM(pret), 0)::NUMERIC AS venit
                FROM abonamente
                ${dateWhere('data_achizitie', luni)}
                GROUP BY date_trunc('month', data_achizitie)
            `),
            pool.query(`
                SELECT TO_CHAR(date_trunc('month', data_achizitie), 'YYYY-MM-DD') AS luna,
                       COUNT(*)::INT AS numar,
                       COALESCE(SUM(pret), 0)::NUMERIC AS venit
                FROM tourist_passes
                ${dateWhere('data_achizitie', luni)}
                GROUP BY date_trunc('month', data_achizitie)
            `),
        ]);

        // Combina cele 3 surse intr-un singur array pe luni
        const luniSet = new Set();
        bilete.rows.forEach(r => luniSet.add(r.luna));
        abonamente.rows.forEach(r => luniSet.add(r.luna));
        turisti.rows.forEach(r => luniSet.add(r.luna));

        const pe_luna = [...luniSet].sort().map(luna => ({
            luna,
            bilete:     parseFloat(bilete.rows.find(r => r.luna === luna)?.venit || 0),
            abonamente: parseFloat(abonamente.rows.find(r => r.luna === luna)?.venit || 0),
            turisti:    parseFloat(turisti.rows.find(r => r.luna === luna)?.venit || 0),
        }));

        const totalBilete = bilete.rows.reduce((s, r) => s + parseFloat(r.venit), 0);
        const totalAbonamente = abonamente.rows.reduce((s, r) => s + parseFloat(r.venit), 0);
        const totalTuristi = turisti.rows.reduce((s, r) => s + parseFloat(r.venit), 0);

        res.json({
            pe_luna,
            total_bilete:     totalBilete,
            total_abonamente: totalAbonamente,
            total_turisti:    totalTuristi,
            total:            totalBilete + totalAbonamente + totalTuristi,
        });
    } catch (err) {
        console.error('Eroare /rapoarte/venituri:', err.message);
        res.status(500).json({ mesaj: 'Eroare la generarea raportului de venituri.' });
    }
});

// ══════════════════════════════════════════════
// GET /api/rapoarte/calatorii?luni=12
// Scanari per statie, per ora
// ══════════════════════════════════════════════
router.get('/calatorii', async (req, res) => {
    const luni = getLuni(req);
    try {
        const [peStatie, peOra, total, peLuna] = await Promise.all([
            pool.query(`
                SELECT s.nume, COUNT(*)::INT AS numar
                FROM calatorii_efectuate ce
                JOIN statii s ON s.id_statie = ce.id_statie
                ${dateWhere('ce.scanat_la', luni)}
                GROUP BY s.nume
                ORDER BY numar DESC
                LIMIT 15
            `),
            pool.query(`
                SELECT EXTRACT(HOUR FROM scanat_la)::INT AS ora, COUNT(*)::INT AS numar
                FROM calatorii_efectuate
                ${dateWhere('scanat_la', luni)}
                GROUP BY ora
                ORDER BY ora
            `),
            pool.query(`
                SELECT COUNT(*)::INT AS total
                FROM calatorii_efectuate
                ${dateWhere('scanat_la', luni)}
            `),
            pool.query(`
                SELECT TO_CHAR(date_trunc('month', scanat_la), 'YYYY-MM-DD') AS luna,
                       COUNT(*)::INT AS numar
                FROM calatorii_efectuate
                ${dateWhere('scanat_la', luni)}
                GROUP BY date_trunc('month', scanat_la)
                ORDER BY luna
            `),
        ]);

        // Calculeaza media zilnica
        const zileTotale = luni > 0 ? luni * 30 : 365;
        const totalCalatorii = total.rows[0].total;
        const medieZilnica = zileTotale > 0 ? +(totalCalatorii / zileTotale).toFixed(1) : 0;

        // Completeaza orele lipsa (0-23)
        const oreComplete = [];
        for (let h = 0; h < 24; h++) {
            const gasit = peOra.rows.find(r => r.ora === h);
            oreComplete.push({ ora: h, numar: gasit ? gasit.numar : 0 });
        }

        res.json({
            pe_statie:     peStatie.rows,
            pe_ora:        oreComplete,
            pe_luna:       peLuna.rows,
            total:         totalCalatorii,
            medie_zilnica: medieZilnica,
        });
    } catch (err) {
        console.error('Eroare /rapoarte/calatorii:', err.message);
        res.status(500).json({ mesaj: 'Eroare la generarea raportului de călătorii.' });
    }
});

// ══════════════════════════════════════════════
// GET /api/rapoarte/titluri?luni=12
// Abonamente pe tip + Bilete pe nr calatorii
// ══════════════════════════════════════════════
router.get('/titluri', async (req, res) => {
    const luni = getLuni(req);
    try {
        const [abonPeTip, biletePeTip, totalAbon, totalBilete] = await Promise.all([
            pool.query(`
                SELECT tip, COUNT(*)::INT AS numar, COALESCE(SUM(pret), 0)::NUMERIC AS venit
                FROM abonamente
                ${dateWhere('data_achizitie', luni)}
                GROUP BY tip
                ORDER BY numar DESC
            `),
            pool.query(`
                SELECT numar_calatorii, COUNT(*)::INT AS numar, COALESCE(SUM(pret), 0)::NUMERIC AS venit
                FROM bilete
                ${dateWhere('data_achizitie', luni)}
                GROUP BY numar_calatorii
                ORDER BY numar_calatorii
            `),
            pool.query(`
                SELECT COUNT(*)::INT AS total FROM abonamente
                ${dateWhere('data_achizitie', luni)}
            `),
            pool.query(`
                SELECT COUNT(*)::INT AS total FROM bilete
                ${dateWhere('data_achizitie', luni)}
            `),
        ]);

        res.json({
            abonamente_pe_tip: abonPeTip.rows.map(r => ({ ...r, venit: parseFloat(r.venit) })),
            bilete_pe_tip:     biletePeTip.rows.map(r => ({ ...r, venit: parseFloat(r.venit) })),
            total_abonamente:  totalAbon.rows[0].total,
            total_bilete:      totalBilete.rows[0].total,
        });
    } catch (err) {
        console.error('Eroare /rapoarte/titluri:', err.message);
        res.status(500).json({ mesaj: 'Eroare la generarea raportului de titluri.' });
    }
});

// ══════════════════════════════════════════════
// GET /api/rapoarte/cereri?luni=12
// Cereri reducere pe luna + pe status
// ══════════════════════════════════════════════
router.get('/cereri', async (req, res) => {
    const luni = getLuni(req);
    try {
        const [peLuna, peStatus, total] = await Promise.all([
            pool.query(`
                SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM-DD') AS luna,
                       COUNT(*)::INT AS numar
                FROM cereri_reducere
                ${dateWhere('created_at', luni)}
                GROUP BY date_trunc('month', created_at)
                ORDER BY luna
            `),
            pool.query('SELECT status::TEXT, COUNT(*)::INT AS numar FROM cereri_reducere GROUP BY status'),
            pool.query('SELECT COUNT(*)::INT AS total FROM cereri_reducere'),
        ]);

        const aprobate = peStatus.rows.find(r => r.status === 'aprobata')?.numar || 0;
        const totalCereri = total.rows[0].total;
        const rataAprobare = totalCereri > 0 ? +((aprobate / totalCereri) * 100).toFixed(1) : 0;

        res.json({
            pe_luna:       peLuna.rows,
            pe_status:     peStatus.rows,
            total:         totalCereri,
            rata_aprobare: rataAprobare,
        });
    } catch (err) {
        console.error('Eroare /rapoarte/cereri:', err.message);
        res.status(500).json({ mesaj: 'Eroare la generarea raportului de cereri.' });
    }
});

// ══════════════════════════════════════════════
// GET /api/rapoarte/suport?luni=12
// Tickete suport pe luna, pe status, rating mediu
// ══════════════════════════════════════════════
router.get('/suport', async (req, res) => {
    const luni = getLuni(req);
    try {
        const [peLuna, peStatus, rating, total] = await Promise.all([
            pool.query(`
                SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM-DD') AS luna,
                       COUNT(*)::INT AS numar
                FROM tickets_suport
                ${dateWhere('created_at', luni)}
                GROUP BY date_trunc('month', created_at)
                ORDER BY luna
            `),
            pool.query('SELECT status::TEXT, COUNT(*)::INT AS numar FROM tickets_suport GROUP BY status'),
            pool.query(`
                SELECT ROUND(AVG(rating), 1)::NUMERIC AS rating_mediu,
                       COUNT(rating)::INT AS total_cu_rating
                FROM tickets_suport
                WHERE rating IS NOT NULL
            `),
            pool.query('SELECT COUNT(*)::INT AS total FROM tickets_suport'),
        ]);

        const rezolvate = peStatus.rows.find(r => r.status === 'rezolvat')?.numar || 0;
        const inchise = peStatus.rows.find(r => r.status === 'inchis')?.numar || 0;
        const totalTickete = total.rows[0].total;
        const rataRezolvare = totalTickete > 0 ? +(((rezolvate + inchise) / totalTickete) * 100).toFixed(1) : 0;

        res.json({
            pe_luna:         peLuna.rows,
            pe_status:       peStatus.rows,
            rating_mediu:    rating.rows[0].rating_mediu ? parseFloat(rating.rows[0].rating_mediu) : null,
            total_cu_rating: rating.rows[0].total_cu_rating,
            rata_rezolvare:  rataRezolvare,
            total:           totalTickete,
        });
    } catch (err) {
        console.error('Eroare /rapoarte/suport:', err.message);
        res.status(500).json({ mesaj: 'Eroare la generarea raportului de suport.' });
    }
});

// ══════════════════════════════════════════════
// GET /api/rapoarte/turisti?luni=12
// Pase turistice pe tara, pe nr zile, pe luna
// ══════════════════════════════════════════════
router.get('/turisti', async (req, res) => {
    const luni = getLuni(req);
    try {
        const [peTara, peZile, peLuna, total] = await Promise.all([
            pool.query(`
                SELECT tara, COUNT(*)::INT AS numar, COALESCE(SUM(pret), 0)::NUMERIC AS venit
                FROM tourist_passes
                ${dateWhere('data_achizitie', luni)}
                GROUP BY tara
                ORDER BY numar DESC
                LIMIT 10
            `),
            pool.query(`
                SELECT zile, COUNT(*)::INT AS numar
                FROM tourist_passes
                ${dateWhere('data_achizitie', luni)}
                GROUP BY zile
                ORDER BY zile
            `),
            pool.query(`
                SELECT TO_CHAR(date_trunc('month', data_achizitie), 'YYYY-MM-DD') AS luna,
                       COUNT(*)::INT AS numar,
                       COALESCE(SUM(pret), 0)::NUMERIC AS venit
                FROM tourist_passes
                ${dateWhere('data_achizitie', luni)}
                GROUP BY date_trunc('month', data_achizitie)
                ORDER BY luna
            `),
            pool.query(`
                SELECT COUNT(*)::INT AS total,
                       COALESCE(SUM(pret), 0)::NUMERIC AS venit_total
                FROM tourist_passes
                ${dateWhere('data_achizitie', luni)}
            `),
        ]);

        res.json({
            pe_tara:     peTara.rows.map(r => ({ ...r, venit: parseFloat(r.venit) })),
            pe_zile:     peZile.rows,
            pe_luna:     peLuna.rows.map(r => ({ ...r, venit: parseFloat(r.venit) })),
            total:       total.rows[0].total,
            venit_total: parseFloat(total.rows[0].venit_total),
        });
    } catch (err) {
        console.error('Eroare /rapoarte/turisti:', err.message);
        res.status(500).json({ mesaj: 'Eroare la generarea raportului de turiști.' });
    }
});

module.exports = router;
