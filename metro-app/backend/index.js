const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRouter = require('./routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rute
app.use('/api/auth', authRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running!' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server ruleaza pe portul ${PORT}`);
});

