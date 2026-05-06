const bcrypt = require('bcrypt');
const pool   = require('../db');

// Elimina diacritice si spatii pt generarea email-ului
function normalizeaza(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // elimina diacritice
        .replace(/\s+/g, '.');           // spatii -> punct
}

// Genereaza un email unic de forma prenume.nume@metrou.ro
// Daca exista deja, adauga un sufix numeric: prenume.nume2@metrou.ro etc.
async function genereazaEmail(prenume, nume) {
    const baza = `${normalizeaza(prenume)}.${normalizeaza(nume)}`;
    let email  = `${baza}@metrou.ro`;
    let contor = 2;

    while (true) {
        const existent = await pool.query(
            'SELECT id_angajat FROM angajati WHERE email = $1',
            [email]
        );
        if (existent.rows.length === 0) break;
        email = `${baza}${contor}@metrou.ro`;
        contor++;
    }

    return email;
}

// GET /api/angajati — lista tuturor angajatilor (fara parola)
const listaAngajati = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id_angajat, nume, prenume, email, rol
             FROM angajati
             ORDER BY id_angajat ASC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Eroare listaAngajati:', err.message);
        res.status(500).json({ mesaj: 'Eroare interna server.' });
    }
};

// POST /api/angajati — creare cont angajat nou
const creeazaAngajat = async (req, res) => {
    const { nume, prenume, parola, rol } = req.body;

    if (!nume || !prenume || !parola) {
        return res.status(400).json({ mesaj: 'Nume, prenume si parola sunt obligatorii.' });
    }

    if (parola.length < 8) {
        return res.status(400).json({ mesaj: 'Parola trebuie sa aiba minim 8 caractere.' });
    }

    const rolFinal = rol === 'admin' ? 'admin' : 'angajat';

    try {
        const email      = await genereazaEmail(prenume, nume);
        const parolaHash = await bcrypt.hash(parola, 10);

        const result = await pool.query(
            `INSERT INTO angajati (nume, prenume, email, parola, rol)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id_angajat, nume, prenume, email, rol`,
            [nume, prenume, email, parolaHash, rolFinal]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Eroare creeazaAngajat:', err.message);
        res.status(500).json({ mesaj: 'Eroare interna server.' });
    }
};

// DELETE /api/angajati/:id — sterge un angajat
const stergeAngajat = async (req, res) => {
    const { id } = req.params;

    // Adminul nu se poate sterge pe el insusi
    if (parseInt(id) === req.angajat?.id) {
        return res.status(400).json({ mesaj: 'Nu iti poti sterge propriul cont.' });
    }

    try {
        const result = await pool.query(
            'DELETE FROM angajati WHERE id_angajat = $1 RETURNING id_angajat',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ mesaj: 'Angajatul nu a fost gasit.' });
        }

        res.json({ mesaj: 'Angajat sters cu succes.', id: parseInt(id) });
    } catch (err) {
        console.error('Eroare stergeAngajat:', err.message);
        res.status(500).json({ mesaj: 'Eroare interna server.' });
    }
};

// GET /api/angajati/statistici — rating suport + cereri documente per angajat
const statisticiAngajati = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                a.id_angajat,
                a.prenume,
                a.nume,
                -- Rating suport
                COUNT(DISTINCT t.id_ticket)                             AS total_tickete,
                COUNT(DISTINCT t.id_ticket) FILTER (WHERE t.rating IS NOT NULL) AS tickete_cu_rating,
                ROUND(AVG(t.rating)::numeric, 2)                        AS rating_mediu,
                -- Cereri documente
                COUNT(DISTINCT cr.id_cerere)                            AS total_cereri,
                COUNT(DISTINCT cr.id_cerere) FILTER (WHERE cr.status = 'aprobata')  AS cereri_aprobate,
                COUNT(DISTINCT cr.id_cerere) FILTER (WHERE cr.status = 'respinsa')  AS cereri_respinse
             FROM angajati a
             LEFT JOIN tickets_suport t
                ON t.id_angajat = a.id_angajat AND t.status = 'inchis'
             LEFT JOIN cereri_reducere cr
                ON cr.id_angajat = a.id_angajat AND cr.status IN ('aprobata', 'respinsa')
             GROUP BY a.id_angajat, a.prenume, a.nume
             ORDER BY a.id_angajat ASC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Eroare statisticiAngajati:', err.message);
        res.status(500).json({ mesaj: 'Eroare interna server.' });
    }
};

module.exports = { listaAngajati, creeazaAngajat, stergeAngajat, statisticiAngajati };
