# zoul-factory

A minimal Stripe-powered storefront for selling digital goods (files, links,
consulting time, prompt packs — anything URL-deliverable). Customers pay with
card via Stripe Checkout; after payment they land on a success page that
verifies the session and shows the delivery (download link or message).

Stack: Node 18+, Express, Stripe Checkout. No database — products live in
`products.json`.

## What YOU need to do

These are the only manual steps. Everything else is code in this repo.

1. **Create a Stripe account** — https://dashboard.stripe.com/register
   (free; you'll need a real bank account + ID to take real payments, but you
   can test in sandbox without anything).

2. **Grab your API keys** — https://dashboard.stripe.com/apikeys
   Copy the *Publishable key* and *Secret key* (use test keys first).

3. **Deploy this repo** — pick one:
   - **Render** (free tier, easiest): New > Web Service > connect GitHub repo >
     Build command `npm install` > Start command `npm start`.
   - **Railway / Fly.io / a VPS** — same idea, just `npm install && npm start`.
   - Note the public URL you get (e.g. `https://zoul-factory.onrender.com`).

4. **Set environment variables** on the host (copy from `.env.example`):
   - `STRIPE_SECRET_KEY` — from step 2
   - `STRIPE_PUBLISHABLE_KEY` — from step 2
   - `PUBLIC_URL` — the URL from step 3 (no trailing slash)
   - `DOWNLOAD_SIGNING_SECRET` — run
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
     and paste the output
   - `CURRENCY` — `usd`, `eur`, `cny`, `hkd`, etc.
   - `STRIPE_WEBHOOK_SECRET` — filled in after step 5

5. **Add the Stripe webhook** —
   https://dashboard.stripe.com/webhooks > Add endpoint
   - Endpoint URL: `https://YOUR_DEPLOYED_URL/webhook`
   - Event to listen for: `checkout.session.completed`
   - Save, then copy the *Signing secret* into `STRIPE_WEBHOOK_SECRET` on
     your host and redeploy.

6. **Edit `products.json`** to list what you actually sell. Each product:
   ```json
   {
     "id": "unique-slug",
     "name": "Visible name",
     "description": "One sentence pitch.",
     "price_cents": 900,
     "image": "https://path-to-cover.jpg",
     "deliver": {
       "type": "url",
       "value": "https://drive.google.com/your-private-file"
     }
   }
   ```
   For `type: "url"` the buyer gets a clickable link on the success page.
   For `type: "message"` they get the plain text (e.g. a Calendly link, a
   discount code, an unlock token).

7. **Activate live payments** — once you're happy with the test flow, switch
   to your *live* Stripe keys (and create a *live* webhook) in your host's
   env vars. Money will land in your Stripe balance and payout to your bank.

8. **Drive traffic** — share the storefront URL. That part is on you.

## Run locally

```bash
cp .env.example .env
# edit .env, fill in test keys + signing secret
npm install
npm start
# open http://localhost:3000
```

For local webhook testing:
```bash
stripe listen --forward-to localhost:3000/webhook
# copy the whsec_... it prints into .env as STRIPE_WEBHOOK_SECRET
```

Use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.

## How it works

- `GET /` — storefront (`public/index.html`) fetches `/api/products` and renders cards.
- `POST /api/checkout` — creates a Stripe Checkout Session and returns its URL.
- Stripe hosts the card form. After payment the buyer is redirected to
  `/success.html?session_id=...`.
- `GET /api/delivery?session_id=...` — server retrieves the session from
  Stripe, confirms `payment_status === 'paid'`, and returns the delivery
  payload for that product.
- `POST /webhook` — Stripe pings this on `checkout.session.completed`. Right
  now it just logs the sale; extend it to email receipts, store orders,
  trigger fulfillment, etc.

## Extending

- **Email delivery / receipts:** hook into the webhook handler in `server.js`
  and call your email provider (Resend, Postmark, SendGrid).
- **Persist orders:** swap the `console.log` for a SQLite insert or whatever
  you prefer.
- **Subscriptions:** change `mode: 'payment'` to `mode: 'subscription'` and
  use a recurring `price_data` (or a pre-created Stripe Price ID).
- **Coupons / discounts:** pass `discounts` or `allow_promotion_codes: true`
  in the checkout session creation.
