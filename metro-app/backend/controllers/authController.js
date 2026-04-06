const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// POST /api/auth/login — auto-detect angajat sau calator
const login = async (req, res) => {
    const { email, parola } = req.body;

    if (!email || !parola) {
        return res.status(400).json({ mesaj: 'Email si parola sunt obligatorii.' });
    }

    try {
        // Cauta mai intai in angajati
        let result = await pool.query(
            'SELECT * FROM angajati WHERE email = $1',
            [email]
        );

        if (result.rows.length > 0) {
            const angajat = result.rows[0];
            const parolaCorecta = await bcrypt.compare(parola, angajat.parola);
            if (!parolaCorecta) {
                return res.status(401).json({ mesaj: 'Credentiale invalide.' });
            }

            const token = jwt.sign(
                {
                    id: angajat.id_angajat,
                    email: angajat.email,
                    rol: angajat.rol,
                    tip_cont: 'angajat',
                },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            return res.json({
                token,
                tip_cont: 'angajat',
                user: {
                    id: angajat.id_angajat,
                    nume: angajat.nume,
                    prenume: angajat.prenume,
                    email: angajat.email,
                    rol: angajat.rol,
                },
            });
        }

        // Cauta in calatori
        result = await pool.query(
            'SELECT * FROM calatori WHERE email = $1',
            [email]
        );

        if (result.rows.length > 0) {
            const calator = result.rows[0];
            const parolaCorecta = await bcrypt.compare(parola, calator.parola);
            if (!parolaCorecta) {
                return res.status(401).json({ mesaj: 'Credentiale invalide.' });
            }

            const token = jwt.sign(
                {
                    id: calator.id_calator,
                    email: calator.email,
                    tip: calator.tip,
                    tip_cont: 'calator',
                },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            return res.json({
                token,
                tip_cont: 'calator',
                user: {
                    id: calator.id_calator,
                    nume: calator.nume,
                    prenume: calator.prenume,
                    email: calator.email,
                    tip: calator.tip,
                },
            });
        }

        // Email negasit in nicio tabela
        return res.status(401).json({ mesaj: 'Credentiale invalide.' });

    } catch (err) {
        console.error('Eroare login:', err.message);
        res.status(500).json({ mesaj: 'Eroare interna server.' });
    }
};

// POST /api/auth/register — inregistrare calator nou
const register = async (req, res) => {
    const { nume, prenume, email, cnp, parola, confirmare_parola, tip } = req.body;

    // Validari
    if (!nume || !prenume || !email || !cnp || !parola || !confirmare_parola || !tip) {
        return res.status(400).json({ mesaj: 'Toate campurile sunt obligatorii.' });
    }

    if (parola !== confirmare_parola) {
        return res.status(400).json({ mesaj: 'Parolele nu coincid.' });
    }

    if (parola.length < 8) {
        return res.status(400).json({ mesaj: 'Parola trebuie sa aiba minim 8 caractere.' });
    }

    if (!/^\d{13}$/.test(cnp)) {
        return res.status(400).json({ mesaj: 'CNP-ul trebuie sa contina exact 13 cifre.' });
    }

    const tipuriValide = ['adult', 'elev', 'student', 'pensionar'];
    if (!tipuriValide.includes(tip)) {
        return res.status(400).json({ mesaj: 'Tip calator invalid.' });
    }

    try {
        // Verifica email duplicat
        const emailExistent = await pool.query(
            'SELECT id_calator FROM calatori WHERE email = $1',
            [email]
        );
        if (emailExistent.rows.length > 0) {
            return res.status(409).json({ mesaj: 'Exista deja un cont cu acest email.' });
        }

        // Verifica CNP duplicat
        const cnpExistent = await pool.query(
            'SELECT id_calator FROM calatori WHERE cnp = $1',
            [cnp]
        );
        if (cnpExistent.rows.length > 0) {
            return res.status(409).json({ mesaj: 'Exista deja un cont cu acest CNP.' });
        }

        const parolaHash = await bcrypt.hash(parola, 10);

        const result = await pool.query(
            `INSERT INTO calatori (nume, prenume, email, cnp, parola, tip)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id_calator, nume, prenume, email, tip`,
            [nume, prenume, email, cnp, parolaHash, tip]
        );

        const calator = result.rows[0];

        const token = jwt.sign(
            {
                id: calator.id_calator,
                email: calator.email,
                tip: calator.tip,
                tip_cont: 'calator',
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(201).json({
            token,
            tip_cont: 'calator',
            user: {
                id: calator.id_calator,
                nume: calator.nume,
                prenume: calator.prenume,
                email: calator.email,
                tip: calator.tip,
            },
        });

    } catch (err) {
        console.error('Eroare register:', err.message);
        res.status(500).json({ mesaj: 'Eroare interna server.' });
    }
};

module.exports = { login, register };
