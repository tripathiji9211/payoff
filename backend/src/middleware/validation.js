const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            error_code: 'VALIDATION_ERROR',
            errors: errors.array() 
        });
    }
    next();
};

const registerSchema = [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    validate
];

const loginSchema = [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').exists().withMessage('Password required'),
    validate
];

const syncSchema = [
    body('txn').notEmpty().withMessage('Transaction data missing'),
    body('txn.id').notEmpty().withMessage('Txn ID missing'),
    body('txn.amount').isNumeric().withMessage('Amount must be numeric'),
    validate
];

module.exports = { registerSchema, loginSchema, syncSchema };
