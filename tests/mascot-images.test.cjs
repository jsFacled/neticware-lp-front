const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMascotImageController } = require('../assets/js/mascot-image-controller.js');
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
test('rapid scroll: an older decoded pose cannot replace the newest request', async () => {
  const pending = { thinking: deferred(), contact: deferred() }, applied = [];
  const c = createMascotImageController({ initialState: 'presenting', prepare: s => pending[s].promise, apply: s => applied.push(s) });
  const first = c.show('thinking'), last = c.show('contact');
  pending.contact.resolve({}); await last;
  pending.thinking.resolve({}); await first;
  assert.deepEqual(applied, ['contact']);
});
test('returning to the visible hero cancels an unfinished scroll transition', async () => {
  const pending = deferred(), applied = [];
  const c = createMascotImageController({ initialState: 'presenting', prepare: () => pending.promise, apply: s => applied.push(s) });
  const request = c.show('thinking'); await c.show('presenting'); pending.resolve({}); await request;
  assert.deepEqual(applied, []);
});
test('decode failure preserves the visible pose and permits a delayed retry', async () => {
  let clock = 0, calls = 0; const applied = [];
  const c = createMascotImageController({ initialState: 'presenting', now: () => clock,
    prepare: () => ++calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve({}), apply: s => applied.push(s) });
  assert.equal(await c.show('contact'), false);
  assert.deepEqual(applied, []);
  assert.equal(await c.show('contact'), false); assert.equal(calls, 1);
  clock = 5001; assert.equal(await c.show('contact'), true);
  assert.deepEqual(applied, ['contact']);
});
test('preload and display share the same image request', async () => {
  let calls = 0;
  const c = createMascotImageController({ initialState: 'presenting', prepare: () => { calls++; return {}; }, apply: () => {} });
  await c.preload('companion'); await c.show('companion'); await c.show('companion');
  assert.equal(calls, 1);
});
