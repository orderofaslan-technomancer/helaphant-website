const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const inventory = require('./inventory');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!process.env.STRIPE_WEBHOOK_SECRET) return { statusCode: 500, body: 'Stripe webhook secret is not configured' };

  try {
    const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64')
      : Buffer.from(event.body || '', 'utf8');
    const stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    const session = stripeEvent.data && stripeEvent.data.object;
    const holdId = session && session.metadata && session.metadata.inventory_hold_id;

    if (holdId && stripeEvent.type === 'checkout.session.completed') {
      await inventory.confirm(holdId);
    }
    if (holdId && stripeEvent.type === 'checkout.session.expired') {
      await inventory.release(holdId);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    console.error('Stripe inventory webhook error:', error);
    return { statusCode: 400, body: 'Webhook Error' };
  }
};
