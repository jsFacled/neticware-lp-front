const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

const root = join(__dirname, '..');
const clientSource = readFileSync(join(root, 'assets/js/main.js'), 'utf8');
const valid = {
  name: 'María Pérez', email: 'maria@example.com', phone: '+541165165422',
  message: 'Necesito una aplicación para mi empresa.', reason: 'ai-adoption', _honey: ''
};

// El fetch se inyecta en cada prueba: nunca se contacta al proveedor real.
function browserHarness(fetchImpl, overrides = {}, { isValid = true } = {}) {
  const ready = [], events = [], alerts = [], attributes = {};
  const listeners = {};
  const button = { textContent: 'Enviar', disabled: false };
  const thankYou = { style: { display: 'none' } };
  const values = { ...valid, ...overrides };
  const form = {
    style: { display: 'grid' }, resets: 0,
    reports: 0, checkValidity: () => isValid, reportValidity() { this.reports++; },
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

test('formulario envía directamente a FormSubmit los datos de cada motivo', async (t) => {
  const reasons = [
    ['software-development', 'Desarrollo de software'],
    ['ai-adoption', 'Adopción de IA'],
    ['training', 'Capacitación'],
    ['other', 'Otro']
  ];
  for (const [reason, label] of reasons) {
    await t.test(label, async () => {
      const calls = [];
      const browser = browserHarness(async (...args) => {
        calls.push(args);
        return Response.json({ success: 'true' });
      }, {
        reason, name: '  María Pérez  ', email: ' maria@example.com ',
        phone: ' +541165165422 ', message: ' Necesito una aplicación para mi empresa. ',
        _subject: 'Alterado', _cc: 'extra@example.com', _webhook: 'https://example.com'
      });
      await browser.submit();
      assert.equal(calls.length, 1);
      const [url, options] = calls[0];
      assert.equal(url, 'https://formsubmit.co/ajax/ef7d59049898d7f53426aae769f74ea4');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['Content-Type'], 'application/json');
      assert.equal(options.headers.Accept, 'application/json');
      assert.deepEqual(JSON.parse(options.body), {
        name: valid.name, email: valid.email, phone: valid.phone, message: valid.message,
        motivo: label, _subject: `Nueva consulta (${label}) — neticware.com.ar`,
        _captcha: 'false', _template: 'box', _honey: ''
      });
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(browser.form.resets, 1);
      assert.deepEqual(browser.alerts, []);
    });
  }
});

test('formulario acepta confirmación booleana y textual de FormSubmit', async (t) => {
  for (const success of [true, 'true']) {
    await t.test(typeof success, async () => {
      const browser = browserHarness(async () => Response.json({ success }));
      await browser.submit();
      assert.equal(browser.form.resets, 1);
      assert.equal(browser.form.style.display, 'none');
      assert.equal(browser.thankYou.style.display, 'block');
      assert.deepEqual(browser.events, ['neticware:contact-success']);
      assert.deepEqual(browser.alerts, []);
      assert.equal(browser.button.disabled, false);
      assert.equal(browser.button.textContent, 'Enviar');
      assert.equal(browser.attributes['aria-busy'], undefined);
    });
  }
});

test('formulario incluye el valor exacto de _honey vacío u ocupado', async (t) => {
  for (const honey of ['', 'spam', ' ']) {
    await t.test(JSON.stringify(honey), async () => {
      let calls = 0, submitted;
      const browser = browserHarness(async (_url, options) => {
        calls++;
        submitted = JSON.parse(options.body);
        return Response.json({ success: true });
      }, { _honey: honey });
      await browser.submit();
      assert.equal(calls, 1);
      assert.equal(submitted._honey, honey);
    });
  }
});

test('formulario conserva datos ante rechazo, respuesta inválida o fallo de conexión', async (t) => {
  const cases = [
    ['false', async () => Response.json({ success: false })],
    ['cadena false', async () => Response.json({ success: 'false' })],
    ['sin success', async () => Response.json({})],
    ['success numérico', async () => Response.json({ success: 1 })],
    ['success alternativo', async () => Response.json({ success: 'yes' })],
    ['JSON null', async () => Response.json(null)],
    ['JSON primitivo', async () => Response.json(true)],
    ['JSON inválido', async () => new Response('{')],
    ['HTML 200', async () => new Response('<html>Challenge</html>')],
    ['HTTP 204 sin cuerpo', async () => new Response(null, { status: 204 })],
    ['HTTP 403', async () => new Response('Forbidden', { status: 403 })],
    ['HTTP 429 con success textual', async () => Response.json({ success: 'true' }, { status: 429 })],
    ['HTTP 500 con success booleano', async () => Response.json({ success: true }, { status: 500 })],
    ['red o CORS', async () => { throw new TypeError('Failed to fetch'); }]
  ];
  for (const [name, response] of cases) {
    await t.test(name, async () => {
      let calls = 0;
      const browser = browserHarness(() => { calls++; return response(); });
      await browser.submit();
      assert.equal(calls, 1, 'No debe reintentar automáticamente');
      assert.equal(browser.form.resets, 0);
      for (const field of ['name', 'email', 'phone', 'message', 'reason']) {
        assert.equal(browser.form[field].value, valid[field]);
      }
      assert.equal(browser.form.style.display, 'grid');
      assert.equal(browser.thankYou.style.display, 'none');
      assert.deepEqual(browser.events, []);
      assert.equal(browser.alerts.length, 1);
      assert.equal(browser.button.disabled, false);
      assert.equal(browser.button.textContent, 'Enviar');
      assert.equal(browser.attributes['aria-busy'], undefined);
    });
  }
});

test('formulario muestra el mensaje textual del proveedor o un error genérico', async (t) => {
  for (const message of ['  Form needs activation  ', '', ' ', { detail: 'error' }, null]) {
    await t.test(JSON.stringify(message), async () => {
      const browser = browserHarness(async () => Response.json({ success: 'false', message }));
      await browser.submit();
      const expected = typeof message === 'string' && message.trim()
        ? message.trim()
        : 'No pudimos confirmar el envío. Tus datos siguen en el formulario; podés contactarnos por correo.';
      assert.deepEqual(browser.alerts, [expected]);
      assert.equal(browser.form.resets, 0);
    });
  }
});

test('formulario frena el envío cuando falla la validación nativa', async () => {
  let calls = 0;
  const browser = browserHarness(async () => {
    calls++;
    return Response.json({ success: true });
  }, {}, { isValid: false });
  await browser.submit();
  assert.equal(calls, 0);
  assert.equal(browser.form.reports, 1);
  assert.equal(browser.form.resets, 0);
  assert.equal(browser.button.disabled, false);
});

test('formulario valida correo, teléfono y motivo antes de enviar', async (t) => {
  const cases = [
    ['correo', { email: 'invalido' }, /correo válido/],
    ['teléfono', { phone: 'abc' }, /teléfono/],
    ['motivo vacío', { reason: '' }, /motivo válido/],
    ['motivo desconocido', { reason: 'desconocido' }, /motivo válido/],
    ['propiedad heredada', { reason: 'constructor' }, /motivo válido/]
  ];
  for (const [name, values, expected] of cases) {
    await t.test(name, async () => {
      let calls = 0;
      const browser = browserHarness(async () => {
        calls++;
        return Response.json({ success: true });
      }, values);
      await browser.submit();
      assert.equal(calls, 0);
      assert.equal(browser.form.resets, 0);
      assert.equal(browser.alerts.length, 1);
      assert.match(browser.alerts[0], expected);
      assert.equal(browser.button.disabled, false);
    });
  }
});

test('formulario permite omitir el teléfono', async () => {
  let submitted;
  const browser = browserHarness(async (_url, options) => {
    submitted = JSON.parse(options.body);
    return Response.json({ success: true });
  }, { phone: '' });
  await browser.submit();
  assert.equal(submitted.phone, '');
  assert.equal(browser.form.resets, 1);
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
        return Response.json({ success }, { status: success ? 200 : 403 });
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
