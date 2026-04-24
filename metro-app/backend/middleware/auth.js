const jwt = require('jsonwebtoken');

// Verifica daca request-ul are un token JWT valid
// Stocheaza payload-ul in req.user (universal) si req.angajat (compatibilitate)
const verificaToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

    if (!token) {
        return res.status(401).json({ mesaj: 'Token lipsa. Autentificare necesara.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user    = decoded; // universal: { id, email, tip_cont, ... }
        req.angajat = decoded; // compatibilitate cu rutele existente
        next();
    } catch (err) {
        return res.status(403).json({ mesaj: 'Token invalid sau expirat.' });
    }
};

// Verifica ca utilizatorul autentificat este calator
const verificaCalator = (req, res, next) => {
    if (req.user?.tip_cont !== 'calator') {
        return res.status(403).json({ mesaj: 'Acces refuzat. Doar calatori.' });
    }
    next();
};

// Verifica ca utilizatorul este angajat sau admin (orice rol din firma)
const verificaAngajat = (req, res, next) => {
    if (req.user?.tip_cont !== 'angajat') {
        return res.status(403).json({ mesaj: 'Acces refuzat. Doar angajati.' });
    }
    next();
};

// Verifica ca utilizatorul autentificat are rolul de admin
const verificaAdmin = (req, res, next) => {
    if (req.angajat?.rol !== 'admin') {
        return res.status(403).json({ mesaj: 'Acces refuzat. Doar admin.' });
    }
    next();
};

module.exports = { verificaToken, verificaCalator, verificaAngajat, verificaAdmin };
