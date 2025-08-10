const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

class PlisioService {
    constructor() {
        this.secretKey = process.env.PLISIO_SECRET_KEY;
        this.baseUrl = 'https://plisio.net/api/v1';
        
        if (!this.secretKey) {
            throw new Error('PLISIO_SECRET_KEY is required');
        }
    }

    /**
     * Create a new invoice
     * @param {Object} invoiceData - Invoice parameters
     * @returns {Promise<Object>} Invoice response from Plisio
     */
    async createInvoice(invoiceData) {
        try {
            const {
                currency = 'BTC',
                amount,
                order_name,
                order_number,
                callback_url,
                success_url,
                fail_url,
                email = null,
                plugin = 'telegram-store',
                version = '1.0'
            } = invoiceData;

            const params = {
                api_key: this.secretKey,
                currency,
                amount,
                order_name,
                order_number,
                callback_url,
                success_url,
                fail_url,
                email,
                plugin,
                version
            };

            // Remove null/undefined values
            Object.keys(params).forEach(key => {
                if (params[key] === null || params[key] === undefined) {
                    delete params[key];
                }
            });

            console.log('🔄 Creating Plisio invoice:', {
                currency,
                amount,
                order_number
            });

            const response = await axios.post(`${this.baseUrl}/invoices/new`, null, {
                params,
                timeout: 30000
            });

            if (response.data.status === 'error') {
                throw new Error(`Plisio API Error: ${response.data.data.message || 'Unknown error'}`);
            }

            console.log('✅ Plisio invoice created successfully:', response.data.data.txn_id);
            return response.data.data;

        } catch (error) {
            console.error('❌ Plisio invoice creation failed:', error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
            throw new Error(`Failed to create Plisio invoice: ${error.message}`);
        }
    }

    /**
     * Get invoice status
     * @param {string} invoiceId - Plisio invoice ID
     * @returns {Promise<Object>} Invoice status
     */
    async getInvoiceStatus(invoiceId) {
        try {
            const response = await axios.get(`${this.baseUrl}/operations`, {
                params: {
                    api_key: this.secretKey,
                    id: invoiceId
                },
                timeout: 15000
            });

            if (response.data.status === 'error') {
                throw new Error(`Plisio API Error: ${response.data.data.message}`);
            }

            return response.data.data;
        } catch (error) {
            console.error('❌ Failed to get Plisio invoice status:', error.message);
            throw error;
        }
    }

    /**
     * Get available cryptocurrencies
     * @returns {Promise<Array>} List of supported currencies
     */
    async getCurrencies() {
        try {
            const response = await axios.get(`${this.baseUrl}/currencies`, {
                params: {
                    api_key: this.secretKey
                },
                timeout: 15000
            });

            if (response.data.status === 'error') {
                throw new Error(`Plisio API Error: ${response.data.data.message}`);
            }

            return response.data.data;
        } catch (error) {
            console.error('❌ Failed to get Plisio currencies:', error.message);
            throw error;
        }
    }

    /**
     * Verify webhook signature
     * @param {Object} data - Webhook data
     * @param {string} receivedSignature - Signature from webhook headers
     * @returns {boolean} True if signature is valid
     */
    verifyWebhookSignature(data, receivedSignature) {
        try {
            if (!this.secretKey) {
                console.warn('⚠️ PLISIO_SECRET_KEY not set, skipping signature verification');
                return true; // Allow in development
            }

            // Create signature string from sorted parameters
            const sortedParams = Object.keys(data)
                .filter(key => key !== 'verify_hash')
                .sort()
                .map(key => `${key}=${data[key]}`)
                .join('&');

            const expectedSignature = crypto
                .createHmac('sha1', this.secretKey)
                .update(sortedParams)
                .digest('hex');

            const isValid = expectedSignature === receivedSignature;
            
            if (!isValid) {
                console.error('❌ Webhook signature verification failed');
                console.error('Expected:', expectedSignature);
                console.error('Received:', receivedSignature);
                console.error('Data:', sortedParams);
            } else {
                console.log('✅ Webhook signature verified successfully');
            }

            return isValid;
        } catch (error) {
            console.error('❌ Error verifying webhook signature:', error.message);
            return false;
        }
    }

    /**
     * Process webhook data
     * @param {Object} webhookData - Data from Plisio webhook
     * @returns {Object} Processed webhook information
     */
    processWebhook(webhookData) {
        const {
            txn_id,
            status,
            amount,
            currency,
            source_amount,
            source_currency,
            confirmations,
            expected_confirmations,
            tx_url,
            tx_id,
            invoice_commission,
            invoice_sum,
            invoice_total_sum
        } = webhookData;

        return {
            invoiceId: txn_id,
            status: this.mapPlisioStatus(status),
            amount: parseFloat(amount),
            currency,
            sourceAmount: parseFloat(source_amount),
            sourceCurrency: source_currency,
            confirmations: parseInt(confirmations),
            expectedConfirmations: parseInt(expected_confirmations),
            transactionUrl: tx_url,
            transactionId: tx_id,
            commission: parseFloat(invoice_commission),
            invoiceSum: parseFloat(invoice_sum),
            totalSum: parseFloat(invoice_total_sum),
            isPaid: status === 'completed',
            isConfirmed: parseInt(confirmations) >= parseInt(expected_confirmations)
        };
    }

    /**
     * Map Plisio status to internal status
     * @param {string} plisioStatus - Status from Plisio
     * @returns {string} Internal status
     */
    mapPlisioStatus(plisioStatus) {
        const statusMap = {
            'new': 'pending',
            'pending': 'pending',
            'completed': 'paid',
            'expired': 'expired',
            'cancelled': 'cancelled',
            'error': 'failed'
        };

        return statusMap[plisioStatus] || 'unknown';
    }

    /**
     * Generate QR code URL for payment
     * @param {string} address - Crypto wallet address
     * @param {number} amount - Amount to pay
     * @param {string} currency - Cryptocurrency
     * @returns {string} QR code URL
     */
    generateQRCodeUrl(address, amount, currency) {
        const paymentUri = `${currency.toLowerCase()}:${address}?amount=${amount}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentUri)}`;
    }

    /**
     * Format amount for display
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code
     * @returns {string} Formatted amount
     */
    formatAmount(amount, currency) {
        const decimals = {
            'BTC': 8,
            'ETH': 6,
            'LTC': 8,
            'BCH': 8,
            'DASH': 8,
            'ZEC': 8,
            'DOGE': 2,
            'TRX': 6,
            'USDT': 2,
            'USDC': 2
        };

        const decimal = decimals[currency] || 8;
        return parseFloat(amount).toFixed(decimal);
    }
}

module.exports = PlisioService;