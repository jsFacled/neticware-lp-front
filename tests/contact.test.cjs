const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

const root = join(__dirname, '..');
const apiSource = readFileSync(join(root, 'api/contact.js'), 'utf8');
const clientSource = readFileSync(join(root, 'assets/js/main.js'), 'utf8');
const valid = {
  name: 'María Pérez', email: 'maria@example.com', phone: '+541165165422',
  message: 'Necesito una aplicación para mi empresa.', reason: 'ai-adoption', _honey: ''
};

function apiHarness(upstream = async () => Response.json({ success: 'true' }), signal = AbortSignal) {
  const calls = [];
  const logs = [];
  const module = { exports: {} };
  runInNewContext(apiSource, {
    module, Buffer, AbortSignal: signal,
    console: { error: (...args) => logs.push(args) },
    fetch: async (...args) => { calls.push(args); return upstream(...args); }
  });
  return { handler: module.exports, calls, logs };
}

async function invoke(api, body = valid, options = {}) {
  const req = {
    method: options.method || 'POST',
    headers: { 'content-type': options.contentType || 'application/json' },
    get body() {
      if (options.malformed) throw new SyntaxError('Invalid JSON');
      return body;
    }
  };
  const res = {
    headers: {}, statusCode: 200,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = JSON.parse(JSON.stringify(value)); return this; }
  };
  await api.handler(req, res);
  return res;
}

test('API reenvía los campos permitidos, _honey y el contexto de producción', async () => {
  const api = apiHarness();
  const res = await invoke(api, {
    ...valid, name: '  María Pérez  ',
    _cc: 'extra@example.com', _webhook: 'https://example.com', _subject: 'Alterado'
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true });
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(api.calls.length, 1);
  const [url, options] = api.calls[0];
  assert.equal(url, 'https://formsubmit.co/ajax/ef7d59049898d7f53426aae769f74ea4');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.Referer, 'https://www.neticware.com.ar/');
  assert.equal(options.redirect, 'error');
  assert.deepEqual(JSON.parse(options.body), {
    name: 'María Pérez', email: valid.email, phone: valid.phone, message: valid.message,
    motivo: 'Adopción de IA', _subject: 'Nueva consulta (Adopción de IA) — neticware.com.ar',
    _captcha: 'false', _template: 'box', _honey: '', _url: 'https://www.neticware.com.ar/'
  });
});

test('API solo acepta confirmación explícita de FormSubmit', async (t) => {
  for (const value of [true, 'true', false, 'false', undefined, 1, 'yes']) {
    await t.test(`success=${String(value)} (${typeof value})`, async () => {
      const api = apiHarness(async () => Response.json({ success: value }));
      const res = await invoke(api);
      const accepted = value === true || value === 'true';
      assert.equal(res.statusCode, accepted ? 200 : 502);
      assert.equal(res.body.success, accepted);
    });
  }
});

test('API rechaza HTTP de error, HTML, JSON inválido y fallos de red', async (t) => {
  const cases = [
    ['HTTP 403', async () => new Response('Forbidden', { status: 403 })],
    ['HTTP 429 con success true', async () => Response.json({ success: true }, { status: 429 })],
    ['HTML 200', async () => new Response('<html>Challenge</html>')],
    ['JSON inválido', async () => new Response('{')],
    ['JSON null', async () => Response.json(null)],
    ['red', async () => { throw new TypeError('Network failure'); }]
  ];
  for (const [name, upstream] of cases) {
    await t.test(name, async () => {
      const api = apiHarness(upstream);
      const res = await invoke(api);
      assert.equal(res.statusCode, 502);
      assert.equal(res.body.success, false);
      assert.equal(api.calls.length, 1, 'No debe reintentar un envío potencialmente procesado');
      assert.ok(!JSON.stringify(api.logs).includes(valid.email), 'No registrar datos del contacto');
    });
  }
});

test('API cancela la espera y responde 504 cuando vence el plazo', async () => {
  let requestedTimeout;
  const controller = new AbortController();
  const api = apiHarness(async (_url, options) => {
    const pending = new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    });
    controller.abort(new DOMException('Timeout', 'TimeoutError'));
    return pending;
  }, { timeout(ms) { requestedTimeout = ms; return controller.signal; } });
  const res = await invoke(api);
  assert.equal(requestedTimeout, 8000);
  assert.equal(res.statusCode, 504);
  assert.equal(res.body.success, false);
});

test('API descarta el honeypot ocupado sin contactar al proveedor', async () => {
  for (const honey of ['bot', ' ']) {
    const api = apiHarness();
    const res = await invoke(api, { _honey: honey });
    assert.deepEqual(res.body, { success: true });
    assert.equal(api.calls.length, 0);
  }
});

test('API valida el contrato antes de llamar a FormSubmit', async (t) => {
  const cases = [
    ['GET', valid, { method: 'GET' }, 405],
    ['tipo de contenido', valid, { contentType: 'text/plain' }, 415],
    ['JSON malformado', valid, { malformed: true }, 400],
    ['sin cuerpo', null, {}, 400],
    ['array', [], {}, 400],
    ['objeto incompleto', {}, {}, 400],
    ['nombre inválido', { ...valid, name: '1' }, {}, 400],
    ['email inválido', { ...valid, email: 'invalid' }, {}, 400],
    ['teléfono inválido', { ...valid, phone: 'abc' }, {}, 400],
    ['mensaje corto', { ...valid, message: 'Hola' }, {}, 400],
    ['mensaje largo', { ...valid, message: 'x'.repeat(1001) }, {}, 400],
    ['motivo inválido', { ...valid, reason: 'constructor' }, {}, 400],
    ['campo no textual', { ...valid, name: {} }, {}, 400],
    ['honeypot no textual', { ...valid, _honey: {} }, {}, 400],
    ['cuerpo grande', { ...valid, extra: 'x'.repeat(8192) }, {}, 413]
  ];
  for (const [name, body, options, status] of cases) {
    await t.test(name, async () => {
      const api = apiHarness();
      const res = await invoke(api, body, options);
      assert.equal(res.statusCode, status);
      assert.equal(res.body.success, false);
      assert.equal(api.calls.length, 0);
      if (status === 405) assert.equal(res.headers.Allow, 'POST');
    });
  }
});

test('API rechaza JSON muy anidado sin una excepción sin manejar', async () => {
  const api = apiHarness();
  const raw = '{"extra":' + '['.repeat(5000) + '0' + ']'.repeat(5000) + '}';
  assert.equal(Buffer.byteLength(raw), 10011);
  const res = await invoke(api, JSON.parse(raw));
  // Según el motor, la serialización falla (400) o permite medir el exceso (413).
  assert.ok([400, 413].includes(res.statusCode));
  assert.equal(res.body.success, false);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(api.calls.length, 0);
});

// Adaptador HTTP local del contrato req/res de Vercel. El fetch del proveedor siempre es simulado.
async function startLocalApi(t, api) {
  const server = createServer(async (req, res) => {
    if (req.url !== '/api/contact') { res.writeHead(404).end(); return; }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    Object.defineProperty(req, 'body', {
      get: () => JSON.parse(Buffer.concat(chunks).toString('utf8'))
    });
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
      return res;
    };
    await api.handler(req, res);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

function browserHarness(fetchImpl, overrides = {}) {
  const ready = [], events = [], alerts = [], attributes = {};
  const listeners = {};
  const button = { textContent: 'Enviar', disabled: false };
  const thankYou = { style: { display: 'none' } };
  const values = { ...valid, ...overrides };
  const form = {
    style: { display: 'grid' }, resets: 0,
    checkValidity: () => true, reportValidity() {},
    addEventListener: (event, callback) => { listeners[event] = callback; },
    querySelector: () => button,
    setAttribute: (name, value) => { attributes[name] = value; },
    removeAttribute: (name) => { delete attributes[name]; },
    reset() { this.resets++; },
    elements: { namedItem: (name) => ({ value: values[name] }) }
  };
  for (const [name, value] of Object.entries(values)) form[name] = { value };
  runInNewContext(clientSource, {
    document: {
      addEventListener: (event, callback) => { if (event === 'DOMContentLoaded') ready.push(callback); },
      getElementById: (id) => ({ contactForm: form, thankYouMessage: thankYou }[id] || null),
      querySelectorAll: () => [], querySelector: () => null,
      dispatchEvent: (event) => events.push(event.type)
    },
    window: {
      location: { hostname: 'localhost', pathname: '/', hash: '', search: '' },
      matchMedia: () => ({ matches: false }), addEventListener() {}
    },
    sessionStorage: {}, Event, URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
    fetch: fetchImpl, alert: (message) => alerts.push(message)
  });
  ready.forEach((callback) => callback());
  return {
    form, button, thankYou, events, alerts, attributes,
    submit: () => listeners.submit({ preventDefault() {} })
  };
}

test('formulario → HTTP local → API → FormSubmit simulado: éxito y _honey', async (t) => {
  const api = apiHarness();
  const origin = await startLocalApi(t, api);
  const requests = [];
  const browser = browserHarness((url, options) => {
    requests.push([url, options]);
    return fetch(new URL(url, origin), options);
  });
  await browser.submit();
  assert.equal(requests[0][0], '/api/contact');
  assert.equal(JSON.parse(requests[0][1].body)._honey, '');
  assert.equal(api.calls.length, 1);
  assert.equal(browser.form.resets, 1);
  assert.equal(browser.thankYou.style.display, 'block');
  assert.deepEqual(browser.events, ['neticware:contact-success']);
  assert.deepEqual(browser.alerts, []);
  assert.equal(browser.button.disabled, false);
});

test('HTTP local devuelve JSON de error controlado ante un cuerpo muy anidado', async (t) => {
  const api = apiHarness();
  const origin = await startLocalApi(t, api);
  const raw = '{"extra":' + '['.repeat(5000) + '0' + ']'.repeat(5000) + '}';
  const response = await fetch(`${origin}/api/contact`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw
  });
  assert.ok([400, 413].includes(response.status));
  assert.equal((await response.json()).success, false);
  assert.equal(api.calls.length, 0);
});

test('formulario reenvía el honeypot ocupado y la API lo descarta', async (t) => {
  const api = apiHarness();
  const origin = await startLocalApi(t, api);
  let submitted;
  const browser = browserHarness((url, options) => {
    submitted = JSON.parse(options.body);
    return fetch(new URL(url, origin), options);
  }, { _honey: 'spam' });
  await browser.submit();
  assert.equal(submitted._honey, 'spam');
  assert.equal(api.calls.length, 0);
  assert.equal(browser.thankYou.style.display, 'block');
});

test('formulario conserva datos cuando FormSubmit rechaza con HTTP 200', async (t) => {
  const api = apiHarness(async () => Response.json({ success: 'false', message: 'Rejected' }));
  const origin = await startLocalApi(t, api);
  const browser = browserHarness((url, options) => fetch(new URL(url, origin), options));
  await browser.submit();
  assert.equal(api.calls.length, 1, 'La prueba debe llegar al proveedor simulado a través de HTTP local');
  assert.equal(browser.form.resets, 0);
  assert.equal(browser.form.message.value, valid.message);
  assert.equal(browser.thankYou.style.display, 'none');
  assert.equal(browser.events.length, 0);
  assert.equal(browser.alerts.length, 1);
  assert.equal(browser.button.disabled, false);
});

test('formulario no muestra éxito por un 200 sin confirmación JSON válida', async (t) => {
  const cases = [
    ['false', async () => Response.json({ success: false })],
    ['cadena false', async () => Response.json({ success: 'false' })],
    ['sin success', async () => Response.json({})],
    ['HTML', async () => new Response('<html>Error</html>')],
    ['HTTP 500', async () => Response.json({ success: true }, { status: 500 })],
    ['red', async () => { throw new TypeError('Failed to fetch'); }]
  ];
  for (const [name, response] of cases) {
    await t.test(name, async () => {
      const browser = browserHarness(response);
      await browser.submit();
      assert.equal(browser.form.resets, 0);
      assert.equal(browser.form.style.display, 'grid');
      assert.equal(browser.thankYou.style.display, 'none');
      assert.equal(browser.alerts.length, 1);
      assert.equal(browser.button.disabled, false);
      assert.equal(browser.button.textContent, 'Enviar');
      assert.equal(browser.attributes['aria-busy'], undefined);
    });
  }
});

test('formulario evita solicitudes duplicadas mientras espera', async () => {
  let complete, calls = 0;
  const browser = browserHarness(() => {
    calls++;
    return new Promise((resolve) => { complete = resolve; });
  });
  const first = browser.submit();
  assert.equal(browser.button.disabled, true);
  assert.equal(browser.button.textContent, 'Enviando…');
  await browser.submit();
  assert.equal(calls, 1);
  complete(Response.json({ success: true }));
  await first;
  assert.equal(browser.form.resets, 1);
  assert.equal(browser.button.disabled, false);
});

test('formulario cancela una conexión pendiente y permite un nuevo envío manual', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0, signal;
  const browser = browserHarness((_url, options) => {
    calls++;
    if (calls > 1) return Promise.resolve(Response.json({ success: true }));
    signal = options.signal;
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
  });
  const pending = browser.submit();
  assert.ok(signal, 'La solicitud debe poder cancelarse');
  t.mock.timers.tick(19999);
  assert.equal(signal.aborted, false);
  assert.equal(browser.button.disabled, true);
  t.mock.timers.tick(1);
  await pending;
  assert.equal(signal.aborted, true);
  assert.equal(browser.button.disabled, false);
  assert.equal(browser.button.textContent, 'Enviar');
  assert.equal(browser.attributes['aria-busy'], undefined);
  assert.equal(browser.form.resets, 0);
  assert.equal(browser.form.message.value, valid.message);
  assert.equal(browser.thankYou.style.display, 'none');
  assert.equal(browser.events.length, 0);
  assert.match(browser.alerts[0], /tardó demasiado/);
  assert.equal(calls, 1, 'El timeout no debe causar reintentos automáticos');
  await browser.submit();
  assert.equal(calls, 2, 'El bloqueo submitting debe liberarse para un envío manual');
  assert.equal(browser.form.resets, 1);
});

test('formulario mantiene el timeout mientras espera el cuerpo de la respuesta', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal, startReading;
  const reading = new Promise((resolve) => { startReading = resolve; });
  const browser = browserHarness(async (_url, options) => {
    signal = options.signal;
    return {
      ok: true,
      json: () => {
        startReading();
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
      }
    };
  });
  const pending = browser.submit();
  await reading;
  t.mock.timers.tick(20000);
  await pending;
  assert.equal(signal.aborted, true);
  assert.equal(browser.button.disabled, false);
  assert.equal(browser.attributes['aria-busy'], undefined);
  assert.equal(browser.form.resets, 0);
  assert.equal(browser.form.message.value, valid.message);
  assert.equal(browser.events.length, 0);
  assert.match(browser.alerts[0], /tardó demasiado/);
});

test('formulario elimina el temporizador cuando la solicitud termina', async (t) => {
  for (const success of [true, false]) {
    await t.test(success ? 'éxito' : 'rechazo', async (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      let signal;
      const browser = browserHarness(async (_url, options) => {
        signal = options.signal;
        return Response.json({ success }, { status: success ? 200 : 502 });
      });
      await browser.submit();
      const alertCount = browser.alerts.length;
      t.mock.timers.tick(20000);
      assert.equal(signal.aborted, false, 'No debe quedar una cancelación pendiente');
      assert.equal(browser.alerts.length, alertCount);
      assert.equal(browser.button.disabled, false);
    });
  }
});
