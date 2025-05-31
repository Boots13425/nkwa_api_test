import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const express = require('express');
const { Pay } = require('@nkwa-pay/sdk');
require('dotenv').config(); // Ensure dotenv is loaded very early

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../public')))

// Initialize Nkwa Pay client
// IMPORTANT: Check that process.env.PAY_API_KEY_AUTH is actually defined here
if (!process.env.PAY_API_KEY_AUTH) {
    console.error("ERROR: PAY_API_KEY_AUTH environment variable is not set!");
    // You might want to exit the process or handle this gracefully
    process.exit(1); 
}

const pay = new Pay({
    apiKeyAuth: process.env.PAY_API_KEY_AUTH,
    debugLogger: console, // This will log SDK internal operations
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Collect payment endpoint
app.post('/collect-payment', async (req, res) => {
    try {
        const { amount, phoneNumber } = req.body;
        
        if (!amount || !phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Amount and phoneNumber are required'
            });
        }
        
        // Corrected console.log to show the loaded environment variable
        console.log("Using API Key Auth:", process.env.PAY_API_KEY_AUTH ? "Key is set" : "Key is NOT SET!");

        const response = await pay.payments.collect({
            amount,
            phoneNumber
        });

        res.json({
            success: true,
            data: response.payment
        });
    } catch (err) {
        // Log the full error object for detailed debugging
        console.error("Error in /collect-payment:", err);

        if (err.statusCode) {
            res.status(err.statusCode).json({
                success: false,
                error: err.message
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                // Include the actual error message in the response for debugging purposes.
                // REMOVE this 'debugMessage' in production for security reasons.
                debugMessage: err.message, 
                stack: err.stack // Include stack trace for more detailed debugging
            });
        }
    }
});

// Disburse payment endpoint (apply same logging and checks)
app.post('/disburse-payment', async (req, res) => {
    try {
        const { amount, phoneNumber } = req.body;
        
        if (!amount || !phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Amount and phoneNumber are required'
            });
        }
        
        const response = await pay.payments.disburse({
            amount,
            phoneNumber
        });

        res.json({
            success: true,
            data: response.payment
        });
    } catch (err) {
        console.error("Error in /disburse-payment:", err);
        if (err.statusCode) {
            res.status(err.statusCode).json({
                success: false,
                error: err.message
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                debugMessage: err.message,
                stack: err.stack
            });
        }
    }
});

// Get payment status (apply same logging and checks)
app.get('/payment/:id', async (req, res) => {
    try {
        const response = await pay.payments.get(req.params.id);
        
        res.json({
            success: true,
            data: response.payment
        });
    } catch (err) {
        console.error("Error in /payment/:id:", err);
        if (err.statusCode) {
            res.status(err.statusCode).json({
                success: false,
                error: err.message
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                debugMessage: err.message,
                stack: err.stack
            });
        }
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});