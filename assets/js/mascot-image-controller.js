// Coordinates decoded images without allowing an older scroll request to win.
function createMascotImageController({ prepare, apply, initialState, now = Date.now }) {
  const prepared = new Map();
  const failures = new Map();
  let displayed = initialState;
  let desired = initialState;
  let revision = 0;
  let pending = null;
  const load = (state) => {
    if (failures.has(state) && now() - failures.get(state) < 5000) return Promise.reject(new Error('Image retry deferred'));
    if (!prepared.has(state)) {
      const promise = Promise.resolve().then(() => prepare(state)).catch(error => {
        prepared.delete(state);
        failures.set(state, now());
        throw error;
      });
      prepared.set(state, promise);
    }
    return prepared.get(state);
  };
  return {
    preload(state) { return load(state).then(() => true, () => false); },
    show(state) {
      if (state === desired) return pending || Promise.resolve(false);
      desired = state;
      const requestRevision = ++revision;
      if (state === displayed) { pending = null; return Promise.resolve(false); }
      pending = load(state).then(image => {
        if (requestRevision !== revision) return false;
        apply(state, image);
        displayed = state;
        pending = null;
        return true;
      }, () => {
        if (requestRevision === revision) { desired = displayed; pending = null; }
        return false; // Preserve the currently visible pose on network/decode errors.
      });
      return pending;
    }
  };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { createMascotImageController };
