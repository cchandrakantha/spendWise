function createRandom(seed = 20261022) {
  let state = seed >>> 0;

  function random() {
    state = (state + 0x6D2B79F5) | 0;

    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  function integer(min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
  }

  function pick(items) {
    return items[integer(0, items.length - 1)];
  }

  return { random, integer, pick };
}

module.exports = createRandom;