"use strict";

function checksum(n) {
  let s = 0;
  for (let i = 1; i <= n; i++) {
    s = (s + ((i * 31) ^ (i << 2))) >>> 0;
  }
  return s;
}

function fibMemo(n) {
  const memo = new Map([[0, 0], [1, 1]]);
  const fib = (k) => {
    if (memo.has(k)) return memo.get(k);
    const v = fib(k - 1) + fib(k - 2);
    memo.set(k, v);
    return v;
  };
  return fib(n);
}

function classCheck() {
  class Base {
    constructor(x) { this.x = x; }
    inc() { this.x += 1; return this.x; }
    get val() { return this.x * 2; }
  }
  class Child extends Base {
    constructor(x, y) { super(x); this.y = y; }
    sum() { return this.val + this.y; }
  }
  const c = new Child(5, 7);
  const v1 = c.inc();
  const v2 = c.sum();
  return `${v1}:${v2}`;
}

function optionalCheck() {
  const obj = { a: { b: 0 } };
  const v1 = obj?.a?.b ?? 3;
  const v2 = obj?.c?.d ?? 3;
  return v1 + v2;
}

function destructuringCheck() {
  const arr = [1, 2, 3, 4];
  const [a, , b, ...rest] = arr;
  return a + b + rest.reduce((s, v) => s + v, 0);
}

async function asyncCheck() {
  const v = await Promise.resolve(5);
  return v * 3;
}

function tryCatchFinallyCheck() {
  let flag = 0;
  try {
    throw new Error("x");
  } catch {
    flag = 1;
  } finally {
    flag = flag * 2;
  }
  return flag;
}

function mapSetCheck() {
  const s = new Set([1, 2, 2, 3]);
  s.add(4);
  s.delete(2);
  const sumS = Array.from(s).reduce((a, b) => a + b, 0);
  const m = new Map([["a", 1], ["b", 2]]);
  m.set("c", 3);
  m.delete("b");
  const sumM = Array.from(m.values()).reduce((a, b) => a + b, 0);
  return `${sumS}:${sumM}`;
}

function closureLoopCheck() {
  const funcs = [];
  for (let i = 0; i < 3; i++) {
    funcs.push(() => i * i);
  }
  return funcs.map((fn) => fn()).join(",");
}

function arrayChainCheck() {
  return [1, 2, 3, 4, 5]
    .filter((x) => x % 2 === 1)
    .map((x) => x * 2)
    .reduce((a, b) => a + b, 0);
}

function objectSpreadCheck() {
  const key = "k" + 2;
  const base = { a: 1 };
  const obj = { ...base, [key]: 3 };
  return obj.k2 + obj.a;
}

function typedArrayCheck() {
  const buf = new Uint8Array([1, 2, 3]);
  buf[1] = buf[0] + buf[2];
  return Array.from(buf).reduce((a, b) => a + b, 0);
}

async function promiseAllCheck() {
  const [a, b] = await Promise.all([Promise.resolve(2), Promise.resolve(4)]);
  return a * b;
}

function regexCheck() {
  const str = "a1b22c333";
  const matches = str.match(/\d+/g) || [];
  return matches.reduce((s, v) => s + v.length, 0);
}

function switchCheck() {
  const v = 2;
  switch (v) {
    case 1: return "a";
    case 2: return "b";
    default: return "x";
  }
}

function forOfCheck() {
  let sum = 0;
  for (const v of [1, 2, 3, 4, 5]) {
    if (v === 4) continue;
    if (v === 5) break;
    sum += v;
  }
  return sum;
}

function generatorCheck() {
  function *gen() {
    yield 1;
    yield 2;
  }
  return Array.from(gen()).join(",");
}

function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function check(name, got, expected) {
  return { name, ok: eq(got, expected), got, expected };
}

async function runObfChecks() {
  const checks = {};
  checks.checksum = check("checksum", checksum(1000), 15594668);
  checks.fib = check("fib", fibMemo(20), 6765);
  checks.class = check("class", classCheck(), "6:19");
  checks.optional = check("optional", optionalCheck(), 3);
  checks.destructuring = check("destructuring", destructuringCheck(), 8);
  checks.async = check("async", await asyncCheck(), 15);
  checks.tryCatch = check("tryCatch", tryCatchFinallyCheck(), 2);
  checks.mapSet = check("mapSet", mapSetCheck(), "8:4");
  checks.closure = check("closure", closureLoopCheck(), "0,1,4");
  checks.arrayChain = check("arrayChain", arrayChainCheck(), 18);
  checks.objectSpread = check("objectSpread", objectSpreadCheck(), 4);
  checks.typedArray = check("typedArray", typedArrayCheck(), 8);
  checks.promiseAll = check("promiseAll", await promiseAllCheck(), 8);
  checks.regex = check("regex", regexCheck(), 6);
  checks.switch = check("switch", switchCheck(), "b");
  checks.forOf = check("forOf", forOfCheck(), 6);
  checks.generator = check("generator", generatorCheck(), "1,2");

  const values = Object.values(checks);
  const passed = values.filter((c) => c.ok).length;
  return {
    ok: passed === values.length,
    total: values.length,
    passed,
    checks,
  };
}

module.exports = { runObfChecks };
