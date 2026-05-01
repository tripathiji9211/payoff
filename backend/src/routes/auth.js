const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, admin } = require('../config/firebase');
const { registerSchema, loginSchema } = require('../middleware/validation');
const razorpay = require('../config/razorpay');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_offline_pay_jwt';

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_jwt';

// POST /api/auth/register
router.post('/register', registerSchema, async (req, res) => {
    const { email, password, name, phone } = req.body;

    try {
        const userRef = db.collection('users').doc(email);
        const doc = await userRef.get();

        if (doc.exists) {
            return res.status(400).json({ success: false, error_code: 'USER_EXISTS', message: 'User already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. Create Razorpay Contact
        let razorpayContact;
        try {
            razorpayContact = await razorpay.contacts.create({
                name: name,
                email: email,
                contact: phone,
                type: "customer"
            });
        } catch (rpError) {
            console.error('Razorpay Contact Error:', rpError);
            return res.status(500).json({ success: false, error_code: 'PAYMENT_GATEWAY_ERROR', message: 'Failed to create payment contact' });
        }

        // 2. Create Razorpay Fund Account (VPA)
        let razorpayFundAccount;
        try {
            const mockVpa = `${name.split(' ')[0].toLowerCase()}${phone.slice(-4)}@razorpay`;
            razorpayFundAccount = await razorpay.fundAccounts.create({
                contact_id: razorpayContact.id,
                account_type: "vpa",
                vpa: { address: mockVpa }
            });
        } catch (faError) {
            console.error('Razorpay Fund Account Error:', faError);
            return res.status(500).json({ success: false, error_code: 'PAYMENT_GATEWAY_ERROR', message: 'Failed to create fund account' });
        }
        
        const userData = {
            name,
            email,
            phone,
            password: hashedPassword,
            balance: 0,
            trustScore: 100, // Initial trust score
            status: 'ACTIVE',
            razorpay_contact_id: razorpayContact.id,
            razorpay_fund_account_id: razorpayFundAccount.id,
            vpa: razorpayFundAccount.vpa.address,
            createdAt: new Date().toISOString()
        };

        await userRef.set(userData);

        res.status(201).json({ success: true, message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error_code: 'SERVER_ERROR', message: error.message });
    }
});

// POST /api/auth/login
router.post('/login', loginSchema, async (req, res) => {
    const { email, password } = req.body;

    try {
        const userRef = db.collection('users').doc(email);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(400).json({ success: false, error_code: 'AUTH_FAILED', message: 'Invalid credentials' });
        }

        const user = doc.data();
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ success: false, error_code: 'AUTH_FAILED', message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: email, name: user.name }, JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ id: email }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            refreshToken,
            user: { id: email, name: user.name, balance: user.balance, vpa: user.vpa }
        });
    } catch (error) {
        res.status(500).json({ success: false, error_code: 'SERVER_ERROR', message: error.message });
    }
});

// POST /api/auth/refresh-token
router.post('/refresh-token', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        const userRef = db.collection('users').doc(decoded.id);
        const doc = await userRef.get();

        if (!doc.exists) return res.status(401).json({ success: false, message: 'User no longer exists' });

        const user = doc.data();
        const newToken = jwt.sign({ id: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ success: true, token: newToken });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ success: false, message: 'ID Token is required' });
    }

    try {
        // 1. Verify Google ID Token using Firebase Admin
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { email, name, picture, uid } = decodedToken;

        const userRef = db.collection('users').doc(email);
        let doc = await userRef.get();
        let user;

        // 2. If user doesn't exist, register them automatically
        if (!doc.exists) {
            // Generate a placeholder phone and VPA for Google users
            // In production, you'd prompt for phone number after Google Login
            const placeholderPhone = `90000${Math.floor(10000 + Math.random() * 90000)}`;
            
            // Create Razorpay Contact
            let razorpayContact;
            try {
                razorpayContact = await razorpay.contacts.create({
                    name: name,
                    email: email,
                    contact: placeholderPhone,
                    type: "customer"
                });
            } catch (rpError) {
                console.error('Razorpay Contact Error (Google Auth):', rpError);
                return res.status(500).json({ success: false, message: 'Failed to initialize payment profile' });
            }

            // Create Razorpay Fund Account
            let razorpayFundAccount;
            try {
                const mockVpa = `${name.split(' ')[0].toLowerCase()}${placeholderPhone.slice(-4)}@razorpay`;
                razorpayFundAccount = await razorpay.fundAccounts.create({
                    contact_id: razorpayContact.id,
                    account_type: "vpa",
                    vpa: { address: mockVpa }
                });
            } catch (faError) {
                console.error('Razorpay Fund Account Error (Google Auth):', faError);
                return res.status(500).json({ success: false, message: 'Failed to setup fund account' });
            }

            const userData = {
                name,
                email,
                picture,
                firebaseUid: uid,
                phone: placeholderPhone,
                balance: 0,
                trustScore: 100,
                status: 'ACTIVE',
                razorpay_contact_id: razorpayContact.id,
                razorpay_fund_account_id: razorpayFundAccount.id,
                vpa: razorpayFundAccount.vpa.address,
                createdAt: new Date().toISOString()
            };

            await userRef.set(userData);
            user = userData;
        } else {
            user = doc.data();
        }

        // 3. Generate tokens
        const token = jwt.sign({ id: email, name: user.name }, JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ id: email }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            refreshToken,
            user: { 
                id: email, 
                name: user.name, 
                balance: user.balance, 
                vpa: user.vpa,
                picture: user.picture 
            }
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ success: false, message: 'Invalid Google token' });
    }
});

module.exports = router;
