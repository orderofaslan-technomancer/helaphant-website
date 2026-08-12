const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function moneyCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function isFiveBySevenPrint(item) {
  const text = [item.title, item.variant, item.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /5\s*(?:x|×|by)\s*7/.test(text);
}

function shippingForCart(cart) {
  // Original art is priced with shipping included. For all other items,
  // a 5x7 print ships for $5; larger prints and regular merchandise ship for $7.
  const shippableItems = cart.filter((item) => String(item.category || '').toLowerCase() !== 'originals');
  if (shippableItems.length === 0) {
    return { amount: 0, displayName: 'Shipping included with original art' };
  }

  const onlyFiveBySevenPrints = shippableItems.every(
    (item) => String(item.category || '').toLowerCase() === 'prints' && isFiveBySevenPrint(item)
  );

  return onlyFiveBySevenPrints
    ? { amount: 500, displayName: 'Standard shipping (5x7 prints)' }
    : { amount: 700, displayName: 'Standard shipping' };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return json(500, {
      error: 'Stripe secret not configured (set STRIPE_SECRET_KEY in Netlify environment variables)',
    });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const {
      cart,
      customerEmail,
      customerName,
      notes,
      discount, // optional: { code, percent }
    } = payload;

    if (!Array.isArray(cart) || cart.length === 0) {
      return json(400, { error: 'Cart is empty' });
    }

    const email = (customerEmail || '').trim();
    if (!email || !email.includes('@')) {
      return json(400, { error: 'A valid email is required before card payment' });
    }

    const name = (customerName || '').trim();
    if (!name) {
      return json(400, { error: 'Name is required before card payment' });
    }

    let discountPercent = 0;
    let discountCode = '';
    if (discount && typeof discount === 'object') {
      const p = Number(discount.percent);
      if (Number.isFinite(p) && p > 0 && p <= 50) {
        discountPercent = p;
        discountCode = String(discount.code || 'GAME').slice(0, 40);
      }
    }

    const lineItems = [];
    for (const item of cart) {
      const title = String(item.title || 'Item').slice(0, 120);
      const variant = String(item.variant || 'One Size').slice(0, 60);
      const quantity = Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1));
      let unitCents = moneyCents(item.price);

      if (unitCents === null || unitCents < 50) {
        // Stripe minimum is typically $0.50 USD
        return json(400, { error: `Invalid price for "${title}"` });
      }

      if (discountPercent > 0) {
        unitCents = Math.max(50, Math.round(unitCents * (1 - discountPercent / 100)));
      }

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${title} (${variant})`,
            description: discountPercent
              ? `Includes ${discountPercent}% discount (${discountCode})`
              : undefined,
          },
          unit_amount: unitCents,
        },
        quantity,
      });
    }

    const successUrl =
      process.env.STRIPE_SUCCESS_URL ||
      'https://helaphant.com/?checkout=success&session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl =
      process.env.STRIPE_CANCEL_URL ||
      'https://helaphant.com/?checkout=cancel';

    const shipping = shippingForCart(cart);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      client_reference_id: name.slice(0, 200),
      // Collect ship-to address. Expand this list anytime you ship more places.
      shipping_address_collection: {
        // Flat shipping rates below are for domestic orders only.
        allowed_countries: ['US'],
      },
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: shipping.amount, currency: 'usd' },
          display_name: shipping.displayName,
        },
      }],
      phone_number_collection: {
        enabled: true,
      },
      billing_address_collection: 'auto',
      metadata: {
        customer_name: name.slice(0, 200),
        notes: String(notes || '').slice(0, 450),
        discount_code: discountCode,
        discount_percent: String(discountPercent || 0),
        cart_summary: cart
          .map((i) => `${i.title} x${i.quantity}`)
          .join(', ')
          .slice(0, 450),
      },
      // Helps you see who ordered in the Stripe dashboard
      payment_intent_data: {
        description: `Helaphant order — ${name}`,
        metadata: {
          customer_name: name.slice(0, 200),
          customer_email: email.slice(0, 200),
        },
      },
    });

    return json(200, { id: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    const msg = (error && error.message) ? error.message : '';
    let friendly = 'Failed to create checkout session';
    if (/api key|invalid api key|no api key/i.test(msg)) {
      friendly = 'Stripe secret not configured or invalid (check Netlify STRIPE_SECRET_KEY)';
    } else if (msg) {
      // Surface useful Stripe validation messages without leaking secrets
      friendly = msg.slice(0, 180);
    }
    return json(500, { error: friendly });
  }
};
