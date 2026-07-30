const crypto = require('crypto');

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

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    return json(500, { error: 'Newsletter signup is not configured yet.' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const email = String(payload.email || '').trim().toLowerCase();

    // Quietly accept bot submissions so automated scripts get no useful signal.
    if (payload.botField) {
      return json(200, { ok: true });
    }

    if (!isValidEmail(email)) {
      return json(400, { error: 'Please enter a valid email address.' });
    }

    const dataCenter = apiKey.split('-').pop();
    if (!dataCenter || dataCenter === apiKey) {
      return json(500, { error: 'Newsletter signup is not configured correctly.' });
    }

    const subscriberHash = crypto.createHash('md5').update(email).digest('hex');
    const response = await fetch(
      `https://${dataCenter}.api.mailchimp.com/3.0/lists/${encodeURIComponent(audienceId)}/members/${subscriberHash}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: email,
          // Pending sends a confirmation email before a new address is subscribed.
          status_if_new: 'pending',
          tags: ['Website signup'],
        }),
      }
    );

    if (!response.ok) {
      console.error('Mailchimp signup failed:', response.status, await response.text());
      return json(502, { error: 'We could not add that email right now. Please try again.' });
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error('Newsletter signup error:', error);
    return json(500, { error: 'We could not add that email right now. Please try again.' });
  }
};
