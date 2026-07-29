import PaytmChecksum from 'paytmchecksum';
import { supabase } from '../config/supabase.js';

const PAYTM_MID = process.env.PAYTM_MID || 'YOUR_TEST_MID';
const PAYTM_MERCHANT_KEY = process.env.PAYTM_MERCHANT_KEY || 'YOUR_TEST_KEY';
const PAYTM_WEBSITE = process.env.PAYTM_WEBSITE || 'WEBSTAGING';
const PAYTM_ENVIRONMENT = process.env.PAYTM_ENVIRONMENT || 'securegw-stage.paytm.in'; // 'securegw.paytm.in' for production

const paytmController = {
  async initiateTransaction(req, res) {
    try {
      const { orderId, amount } = req.body;
      const customerId = req.user.id;

      if (!orderId || !amount) {
        return res.status(400).json({ success: false, message: 'Order ID and Amount are required' });
      }

      const paytmParams = {};
      paytmParams.body = {
        requestType: 'Payment',
        mid: PAYTM_MID,
        websiteName: PAYTM_WEBSITE,
        orderId: orderId,
        callbackUrl: `${req.protocol}://${req.get('host')}/api/paytm/callback`,
        txnAmount: {
          value: amount.toString(),
          currency: 'INR',
        },
        userInfo: {
          custId: customerId,
        },
      };

      const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), PAYTM_MERCHANT_KEY);
      paytmParams.head = {
        signature: checksum
      };

      const post_data = JSON.stringify(paytmParams);

      const response = await fetch(`https://${PAYTM_ENVIRONMENT}/theia/api/v1/initiateTransaction?mid=${PAYTM_MID}&orderId=${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': post_data.length
        },
        body: post_data
      });

      const data = await response.json();

      if (data.body && data.body.txnToken) {
        res.json({
          success: true,
          txnToken: data.body.txnToken,
          orderId: orderId,
          mid: PAYTM_MID,
          environment: PAYTM_ENVIRONMENT
        });
      } else {
        res.status(400).json({ success: false, message: data.body?.resultInfo?.resultMsg || 'Failed to initiate transaction' });
      }
    } catch (error) {
      console.error('Paytm Initiate Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async paymentCallback(req, res) {
    try {
      // Paytm posts data to this callback URL
      const paytmResponse = req.body;
      const paytmChecksum = paytmResponse.CHECKSUMHASH;
      delete paytmResponse.CHECKSUMHASH;

      const isVerifySignature = PaytmChecksum.verifySignature(paytmResponse, PAYTM_MERCHANT_KEY, paytmChecksum);

      if (isVerifySignature) {
        if (paytmResponse.STATUS === 'TXN_SUCCESS') {
          // Update order status in Supabase
          const { error } = await supabase
            .from('orders')
            .update({ status: 'pending' }) // Move from pending_payment to pending (Order Received)
            .eq('id', paytmResponse.ORDERID);

          if (error) throw error;

          res.redirect(`/#/confirmation/${paytmResponse.ORDERID}`);
        } else {
          res.redirect(`/#/confirmation/${paytmResponse.ORDERID}?status=failed`);
        }
      } else {
        console.error("Checksum mismatched");
        res.status(400).send("Checksum mismatched");
      }
    } catch (error) {
      console.error('Paytm Callback Error:', error);
      res.status(500).send("Server Error");
    }
  }
};

export default paytmController;
