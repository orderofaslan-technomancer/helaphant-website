const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const inventory = require('./inventory');

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method Not Allowed' });

  const sessionId = String(event.queryStringParameters?.session_id || '').trim();
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return json(400, { error: 'Invalid checkout session.' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return json(403, { error: 'Payment has not completed.' });

    const productIds = String(session.metadata?.digital_product_ids || '')
      .split(',').map(Number).filter(Number.isInteger);
    if (productIds.length === 0) return json(200, { downloads: [] });

    const products = await inventory.getDigitalProducts(productIds);
    const downloads = await Promise.all(products
      .filter((product) => product.is_digital === true && product.digital_file_path)
      .map(async (product) => ({
        title: product.title,
        url: await inventory.createSignedDownloadUrl(product.digital_file_path),
      })));

    return json(200, { downloads });
  } catch (error) {
    console.error('Digital download lookup failed:', error);
    return json(500, { error: 'Could not prepare the download. Please contact us with your Stripe receipt.' });
  }
};
