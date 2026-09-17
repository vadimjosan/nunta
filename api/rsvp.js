function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM || 'Marius & Sultana <onboarding@resend.dev>';

  if (!apiKey) {
    return res.status(500).json({ error: 'missing_resend_api_key' });
  }

  const body = typeof req.body === 'string'
    ? JSON.parse(req.body || '{}')
    : (req.body || {});

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  const honey = typeof body.honey === 'string' ? body.honey.trim() : '';

  if (honey) {
    return res.status(200).json({ ok: true });
  }

  if (!name || !status || !['Accept', 'Refuz'].includes(status)) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const subject = 'Confirmare prezență - Marius & Sultana';
  const safeName = escapeHtml(name);
  const safeStatus = escapeHtml(status);

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromAddress,
      to: ['sultanajosanu@gmail.com'],
      subject,
      reply_to: 'sultanajosanu@gmail.com',
      text: [
        'A fost primită o nouă confirmare de prezență.',
        '',
        `Nume Prenume: ${name}`,
        `Răspuns: ${status}`,
        '',
        'Trimis automat din formularul invitației.'
      ].join('\n'),
      html: `
        <div style="font-family: Georgia, 'Times New Roman', serif; color: #2a2a2a; line-height: 1.7;">
          <h2 style="margin: 0 0 16px; color: #9e6b6b;">Confirmare prezență</h2>
          <p style="margin: 0 0 10px;"><strong>Nume Prenume:</strong> ${safeName}</p>
          <p style="margin: 0 0 10px;"><strong>Răspuns:</strong> ${safeStatus}</p>
          <p style="margin: 18px 0 0; color: #7a7170;">Trimis automat din formularul invitației.</p>
        </div>
      `
    })
  });

  const resendData = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    return res.status(502).json({
      error: 'resend_send_failed',
      details: resendData
    });
  }

  return res.status(200).json({
    ok: true,
    id: resendData.id || null
  });
};
