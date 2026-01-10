function normalizeSeed(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  const parsed = Number.parseInt(text, 10);
  if (Number.isFinite(parsed)) {
    return parsed >>> 0;
  }
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seedInput) {
  const seed = normalizeSeed(seedInput);
  if (seed === null) {
    return {
      seed: null,
      random: Math.random
    };
  }
  let state = seed >>> 0;
  return {
    seed,
    random() {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 0x100000000;
    }
  };
}

module.exports = {
  createRng
};
