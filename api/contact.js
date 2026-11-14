const FORMSUBMIT_URL = 'https://formsubmit.co/ajax/ef7d59049898d7f53426aae769f74ea4';
const FORM_URL = 'https://www.neticware.com.ar/';
const MAX_BODY_BYTES = 8192;
const UPSTREAM_TIMEOUT_MS = 8000;
const SEND_ERROR = 'No pudimos confirmar el envío. Tus datos siguen en el formulario; podés contactarnos por correo.';
const REASON_LABELS = {
  'software-development': 'Desarrollo de software',
  'ai-adoption': 'Adopción de IA',
  training: 'Capacitación',
  other: 'Otro'
};

module.exports = async function contact(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Método no permitido.' });
  }

  const contentType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return res.status(415).json({ success: false, message: 'El formulario debe enviarse como JSON.' });
  }

  let body;
  try {
    // Vercel parsea JSON con un getter que puede lanzar un error si el cuerpo es inválido.
    body = req.body;
  } catch {
    return res.status(400).json({ success: false, message: 'El formulario contiene datos inválidos.' });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ success: false, message: 'El formulario contiene datos inválidos.' });
  }
  let bodyBytes;
  try {
    bodyBytes = Buffer.byteLength(JSON.stringify(body), 'utf8');
  } catch {
    // Un JSON válido muy anidado puede desbordar la pila durante la serialización.
    return res.status(400).json({ success: false, message: 'El formulario contiene datos inválidos.' });
  }
  if (bodyBytes > MAX_BODY_BYTES) {
    return res.status(413).json({ success: false, message: 'El formulario supera el tamaño permitido.' });
  }

  const honey = body._honey ?? '';
  if (typeof honey !== 'string') {
    return res.status(400).json({ success: false, message: 'El formulario contiene datos inválidos.' });
  }
  // Un honeypot ocupado se descarta silenciosamente, sin enviar correo ni llamar al proveedor.
  if (honey !== '') return res.status(200).json({ success: true });

  const fields = ['name', 'email', 'message', 'reason'];
  if (fields.some((field) => typeof body[field] !== 'string') ||
      (body.phone !== undefined && typeof body.phone !== 'string')) {
    return res.status(400).json({ success: false, message: 'Completá los campos obligatorios del formulario.' });
  }

  const name = body.name.trim();
  const email = body.email.trim();
  const phone = (body.phone || '').trim();
  const message = body.message.trim();
  const emailRegex = /^(?!.*\.\.)(?!.*\.$)(?!^\.)[a-zA-Z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z]{2,})+$/;
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]{2,50}$/.test(name) ||
      email.length > 254 || !emailRegex.test(email) ||
      (phone && !/^\+?[0-9\s\-]{8,15}$/.test(phone)) ||
      message.length < 10 || message.length > 1000 ||
      !Object.hasOwn(REASON_LABELS, body.reason)) {
    return res.status(400).json({ success: false, message: 'Revisá el nombre, correo, teléfono, motivo y mensaje.' });
  }

  const reasonLabel = REASON_LABELS[body.reason];
  // Solo se reenvían estos campos: el cliente no puede cambiar destinatario, CC ni webhook.
  const submission = {
    name,
    email,
    phone,
    message,
    motivo: reasonLabel,
    _subject: `Nueva consulta (${reasonLabel}) — neticware.com.ar`,
    _captcha: 'false',
    _template: 'box',
    _honey: honey,
    _url: FORM_URL
  };

  try {
    const response = await fetch(FORMSUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Referer: FORM_URL
      },
      body: JSON.stringify(submission),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      redirect: 'error'
    });

    if (!response.ok) {
      console.error('contact: FormSubmit HTTP error', { status: response.status });
      return res.status(502).json({ success: false, message: SEND_ERROR });
    }

    const result = await response.json();
    // FormSubmit puede representar success como booleano o como cadena.
    if (result?.success !== true && result?.success !== 'true') {
      console.error('contact: FormSubmit did not confirm success');
      return res.status(502).json({ success: false, message: SEND_ERROR });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    console.error('contact: FormSubmit request failed', { type: error.name });
    return res.status(timedOut ? 504 : 502).json({ success: false, message: SEND_ERROR });
  }
};
