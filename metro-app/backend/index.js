const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const authRouter       = require('./routes/auth');
const angajatiRouter   = require('./routes/angajati');
const contRouter       = require('./routes/cont');
const verificariRouter = require('./routes/verificari');
const bileteRouter     = require('./routes/bilete');
const notificariRouter = require('./routes/notificari');
const statiiRouter     = require('./routes/statii');
const suportRouter     = require('./routes/suport');
const validareRouter   = require('./routes/validare');
const touristRouter    = require('./routes/tourist');
const rapoarteRouter   = require('./routes/rapoarte');
const anunturiRouter   = require('./routes/anunturi');
const setariRouter     = require('./routes/setari');

const app = express();

// Middleware
const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Permite requesturi fara origin (Postman, curl) si cele din lista
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express.json());

// Rute
app.use('/api/auth',       authRouter);
app.use('/api/angajati',   angajatiRouter);
app.use('/api/cont',       contRouter);
app.use('/api/verificari', verificariRouter);
app.use('/api/bilete',     bileteRouter);
app.use('/api/notificari', notificariRouter);
app.use('/api/statii',     statiiRouter);
app.use('/api/suport',     suportRouter);
app.use('/api/validare',   validareRouter);
app.use('/api/turisti',    touristRouter);
app.use('/api/rapoarte',   rapoarteRouter);
app.use('/api/anunturi',   anunturiRouter);
app.use('/api/setari',     setariRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running!' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server ruleaza pe portul ${PORT}`);
});

