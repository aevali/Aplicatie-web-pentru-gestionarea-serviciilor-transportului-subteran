const express = require('express');
const router = express.Router();
const { verificaToken, verificaAdmin } = require('../middleware/auth');
const { listaAngajati, creeazaAngajat, stergeAngajat } = require('../controllers/angajatiController');

// Toate rutele necesita autentificare + rol admin
router.use(verificaToken, verificaAdmin);

// GET  /api/angajati/statistici — statistici per angajat (rating + cereri)
router.get('/statistici', require('../controllers/angajatiController').statisticiAngajati);

// GET  /api/angajati        — lista angajati
router.get('/', listaAngajati);

// POST /api/angajati        — creare angajat nou
router.post('/', creeazaAngajat);

// DELETE /api/angajati/:id  — stergere angajat
router.delete('/:id', stergeAngajat);

module.exports = router;
