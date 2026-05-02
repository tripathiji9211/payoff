const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// const authRoutes = require('./routes/auth');
// const transactionRoutes = require('./routes/transactions');
// const walletRoutes = require('./routes/wallet');
// const syncRoutes = require('./routes/sync');
// const merchantRoutes = require('./routes/merchant');
// const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 5005;

// Middlewares
app.use(cors());

// Razorpay Webhook needs raw body - mount before express.json()
// app.use('/api/webhooks', webhookRoutes);

app.use(express.json());

// Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/transactions', transactionRoutes);
// app.use('/api/sync', syncRoutes);
// app.use('/api/wallet', walletRoutes);
// app.use('/api/merchant', merchantRoutes);

// Root Route
app.get('/', (req, res) => {
    res.json({ 
        message: 'OfflinePay Production Backend API',
        version: '1.0.0',
        status: 'Operational'
    });
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'active', timestamp: new Date() });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        error_code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong on our end.' 
    });
});

app.listen(PORT, () => {
    console.log(`OfflinePay Backend running on port ${PORT}`);
});

module.exports = app;
