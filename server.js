require('dotenv').config();
const express = require('express');
const path = require('path');
const Stripe = require('stripe');

const app = express();
const PORT = process.env.PORT || 4242;

if (!process.env.STRIPE_SECRET) {
  console.warn('Warning: STRIPE_SECRET is not set. Set STRIPE_SECRET in your environment or .env file to enable Stripe requests.');
}

const stripe = Stripe(process.env.STRIPE_SECRET || '');

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Create a Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, success_url, cancel_url } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const line_items = items.map(i => ({
      price_data: {
        currency: 'usd',
        product_data: { name: i.name || 'Item' },
        unit_amount: Math.round((i.unit_price || 0) * 100),
      },
      quantity: i.quantity || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: success_url || `${req.protocol}://${req.get('host')}/?checkout=success`,
      cancel_url: cancel_url || `${req.protocol}://${req.get('host')}/?checkout=cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Debug: Current working directory:', __dirname);
  console.log('Debug: Static files should be served from:', path.join(__dirname));
});
