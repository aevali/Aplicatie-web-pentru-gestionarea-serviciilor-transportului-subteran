const jwt = require('jsonwebtoken');

// Verifica daca request-ul are un token JWT valid
const verificaToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

    if (!token) {
        return res.status(401).json({ mesaj: 'Token lipsa. Autentificare necesara.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.angajat = decoded; // { id_angajat, email, rol }
        next();
    } catch (err) {
        return res.status(403).json({ mesaj: 'Token invalid sau expirat.' });
    }
};

// Verifica ca utilizatorul autentificat are rolul de admin
const verificaAdmin = (req, res, next) => {
    if (req.angajat?.rol !== 'admin') {
        return res.status(403).json({ mesaj: 'Acces refuzat. Doar admin.' });
    }
    next();
};

module.exports = { verificaToken, verificaAdmin };
