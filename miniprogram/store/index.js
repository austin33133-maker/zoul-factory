function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(patch) {
    state = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
    listeners.forEach(fn => {
      try { fn(state); } catch (e) {}
    });
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { getState, setState, subscribe };
}

module.exports = { createStore };
