const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

// MTN Config
const MTN_CONFIG = {
  cMTN_CONSUMER_KEY=d5e8a1b3-c7f2-4e9a-8d6b-1a2b3c4d5e6f
MTN_CONSUMER_SECRET=a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8
MTN_SUBSCRIPTION_KEY=9f8e7d6c-5b4a-3c2d-1e0f-a9b8c7d6e5f4

// In-memory transaction log (replace with DB in production)
let transactions = [];

// Helper: Get Access Token
async function getAccessToken() {
  try {
    const authString = Buffer.from(`${MTN_CONFIG.consumerKey}:${MTN_CONFIG.consumerSecret}`).toString('base64');
    
    const response = await axios.post(
      `${MTN_CONFIG.baseUrl}/disbursement/token/`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Ocp-Apim-Subscription-Key': MTN_CONFIG.subscriptionKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('❌ Error getting access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with MTN API');
  }
}

// Helper: Make Transfer Request
async function makeTransfer(amount, phone, message, referenceId = null) {
  try {
    const accessToken = await getAccessToken();
    const xReferenceId = referenceId || Date.now().toString();
    
    const response = await axios.post(
      `${MTN_CONFIG.baseUrl}/disbursement/v1_0/transfer`,
      {
        amount: amount.toString(),
        currency: 'XAF',
        externalId: xReferenceId,
        payee: {
          partyIdType: 'MSISDN',
          partyId: phone
        },
        payerMessage: message,
        payeeNote: 'From Akin NevMo'
      },
      {
        headers: {
          'X-Reference-Id': xReferenceId,
          'Ocp-Apim-Subscription-Key': MTN_CONFIG.subscriptionKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Log transaction
    const transaction = {
      id: xReferenceId,
      amount: amount,
      phone: phone,
      message: message,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      response: response.data
    };

    transactions.push(transaction);

    return {
      success: true,
      transaction: transaction,
      mtmResponse: response.data
    };
  } catch (error) {
    console.error('❌ Transfer failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Transfer failed');
  }
}

// POST /api/donate
router.post('/donate', async (req, res) => {
  try {
    const { phone, amount, message = 'Donation from Akin NevMo' } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and amount are required'
      });
    }

    const result = await makeTransfer(amount, phone, message);

    res.json({
      success: true,
      message: 'Donation sent successfully',
      transaction: result.transaction
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/save
router.post('/save', async (req, res) => {
  try {
    const { goal, amount, frequency = 'monthly', phone = '237698000000' } = req.body;

    if (!goal || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Goal and amount are required'
      });
    }

    const message = `Saving for ${goal} (${frequency})`;

    const result = await makeTransfer(amount, phone, message);

    res.json({
      success: true,
      message: 'Saved successfully',
      transaction: result.transaction
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/withdraw
router.post('/withdraw', async (req, res) => {
  try {
    const { amount, phone } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and amount are required'
      });
    }

    const message = 'Withdrawal from Akin NevMo savings';

    const result = await makeTransfer(amount, phone, message);

    res.json({
      success: true,
      message: 'Withdrawal processed successfully',
      transaction: result.transaction
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/transactions
router.get('/transactions', (req, res) => {
  res.json({
    success: true,
    count: transactions.length,
    transactions: transactions
  });
});

// GET /api/health
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'MTN API is reachable',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
