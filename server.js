require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const Stripe = require('stripe');

const {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  PUBLIC_URL = 'http://localhost:3000',
  DOWNLOAD_SIGNING_SECRET,
  CURRENCY = 'usd',
  PORT = 3000,
} = process.env;

if (!STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY in environment. Copy .env.example to .env.');
  process.exit(1);
}
if (!DOWNLOAD_SIGNING_SECRET || DOWNLOAD_SIGNING_SECRET === 'change-me-to-a-long-random-string') {
  console.error('Set DOWNLOAD_SIGNING_SECRET to a long random string in .env.');
  process.exit(1);
}

const stripe = Stripe(STRIPE_SECRET_KEY);
const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'));
const productById = Object.fromEntries(products.map((p) => [p.id, p]));

const app = express();

// Webhook MUST be mounted before express.json() so we can verify the raw body signature.
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!STRIPE_WEBHOOK_SECRET) {
    return res.status(500).send('Webhook secret not configured');
  }
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const productId = session.metadata && session.metadata.product_id;
    console.log(`[paid] product=${productId} session=${session.id} amount=${session.amount_total} ${session.currency}`);
  }

  res.json({ received: true });
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/products', (_req, res) => {
  res.json(
    products.map(({ id, name, description, price_cents, image }) => ({
      id,
      name,
      description,
      price_cents,
      currency: CURRENCY,
      image,
    })),
  );
});

app.post('/api/checkout', async (req, res) => {
  const productId = req.body && req.body.product_id;
  const product = productById[productId];
  if (!product) {
    return res.status(400).json({ error: 'Unknown product' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: product.price_cents,
            product_data: {
              name: product.name,
              description: product.description,
            },
          },
        },
      ],
      success_url: `${PUBLIC_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_URL}/`,
      metadata: { product_id: product.id },
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout session error:', err.message);
    res.status(500).json({ error: 'Could not create checkout session' });
  }
});

function signDelivery(productId, sessionId) {
  return crypto
    .createHmac('sha256', DOWNLOAD_SIGNING_SECRET)
    .update(`${productId}:${sessionId}`)
    .digest('hex');
}

app.get('/api/delivery', async (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment not completed' });
    }
    const productId = session.metadata && session.metadata.product_id;
    const product = productById[productId];
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const token = signDelivery(productId, sessionId);
    res.json({
      product: { id: product.id, name: product.name },
      delivery: product.deliver,
      token,
    });
  } catch (err) {
    console.error('Delivery lookup error:', err.message);
    res.status(500).json({ error: 'Could not verify session' });
  }
});

app.listen(PORT, () => {
  console.log(`zoul-factory storefront on ${PUBLIC_URL} (port ${PORT})`);
});
