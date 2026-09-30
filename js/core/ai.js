// Extension point for a future AI tutor (writing correction, conversation, pronunciation,
// exercise generation). Nothing here calls a network service: until a provider is registered,
// `ai.available` is false and the UI keeps using the local, rule-based feedback.
//
// A provider is an object implementing any of:
//   writingFeedback(text, { prompt, level }) -> Promise<{ issues: [{ wrong, right, why }], summary }>
//   chat(messages, { level })                 -> Promise<{ reply }>
//   pronunciation(audioBlob, { target })      -> Promise<{ score, words: [{ word, ok }] }>
//   generateExercises({ topic, level, n })    -> Promise<Exercise[]>   (same shape as data/*.js)
// Register it once at startup:  ai.register(myProvider)
// Keep API keys on a server: the provider should call your own backend endpoint.

let provider = null;
export const ai = {
  get available() { return !!provider; },
  can: fn => !!provider && typeof provider[fn] === 'function',
  register(p) { provider = p; },
  call(fn, ...args) {
    if (!ai.can(fn)) return Promise.reject(new Error(`AI capability "${fn}" is not configured`));
    return provider[fn](...args);
  },
};
