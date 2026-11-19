import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeEAN, validEAN13, productToFood } from '../js/barcode.js';

// מקודד EAN-13 לבדיקה: 95 יחידות של פס (1) / רווח (0)
const Lc = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const PAR = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
const inv = (s) => s.split('').map((c) => (c === '1' ? '0' : '1')).join('');
const rev = (s) => s.split('').reverse().join('');
function bits(code) {
  let out = '101';
  for (let i = 1; i <= 6; i++) { const l = Lc[Number(code[i])]; out += PAR[Number(code[0])][i - 1] === 'L' ? l : rev(inv(l)); }
  out += '01010';
  for (let i = 7; i <= 12; i++) out += inv(Lc[Number(code[i])]);
  return out + '101';
}
// מצייר תמונת RGBA: מרווח שקט, רוחב יחידה לא שלם, טשטוש, רעש ותאורה לא אחידה — כמו צילום מהטלפון
function render(code, { module = 3.3, blur = 1, noise = 12, tilt = 0, flip = false, seed = 7 } = {}) {
  const b = bits(code), quiet = 12, width = Math.round((95 + quiet * 2) * module) + 40, height = 120;
  let s = seed; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const lum = new Float64Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const xx = (flip ? width - 1 - x : x) - 20 - (y - height / 2) * tilt; // הטיה קלה
    let acc = 0;                                                            // דגימת-על: 4 תת-פיקסלים
    for (let k = 0; k < 4; k++) { const mIdx = Math.floor((xx + k / 4) / module) - quiet; acc += mIdx >= 0 && mIdx < 95 && b[mIdx] === '1' ? 30 : 225; }
    lum[y * width + x] = acc / 4;
  }
  const out = new Float64Array(lum.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { let a = 0, n = 0; for (let d = -blur; d <= blur; d++) { const xi = x + d; if (xi >= 0 && xi < width) { a += lum[y * width + xi]; n++; } } out[y * width + x] = a / n; }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < out.length; i++) { const x = i % width; const v = out[i] * (0.65 + 0.35 * (x / width)) + (rnd() - 0.5) * noise; data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v; data[i * 4 + 3] = 255; }
  return { data, width, height };
}

test('EAN-13 checksum', () => {
  assert.ok(validEAN13('7290000066318')); assert.ok(validEAN13('3017620422003'));
  assert.ok(!validEAN13('7290000066319')); assert.ok(!validEAN13('123'));
});

test('decodes EAN-13 / UPC-A from a noisy, blurred, unevenly lit image', () => {
  const codes = ['7290000066318', '3017620422003', '7290011017866', '0012000161155', '5449000000996', '4006381333931', '8076809513753', '9780201379624'];
  for (const code of codes) {
    assert.ok(validEAN13(code), code);
    assert.equal(decodeEAN(render(code)), code, `clean ${code}`);
    assert.equal(decodeEAN(render(code, { module: 2.4, blur: 1, noise: 18 })), code, `small ${code}`);
    assert.equal(decodeEAN(render(code, { module: 5.7, blur: 2, noise: 20, tilt: 0.05 })), code, `large+tilt ${code}`);
    assert.equal(decodeEAN(render(code, { flip: true })), code, `upside-down ${code}`);
  }
});

test('does not invent a barcode from noise or a blank image', () => {
  const blank = { data: new Uint8ClampedArray(400 * 100 * 4).fill(200), width: 400, height: 100 };
  assert.equal(decodeEAN(blank), null);
  let s = 3; const data = new Uint8ClampedArray(600 * 120 * 4);
  for (let i = 0; i < data.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; data[i] = s >>> 24; }
  assert.equal(decodeEAN({ data, width: 600, height: 120 }), null);
});

test('product from the open database becomes a food per serving, or per 100 g', () => {
  const bamba = productToFood({ product_name_he: 'במבה', brands: 'אסם, Osem', serving_quantity: 80, nutriments: { 'energy-kcal_100g': 535, proteins_100g: 17, carbohydrates_100g: 49, fat_100g: 30 } }, '7290000066318');
  assert.deepEqual({ name: bamba.name, portion: bamba.portion, kcal: bamba.kcal, p: bamba.p, complete: bamba.complete }, { name: 'במבה · אסם', portion: 'מנה · 80 ג׳', kcal: 428, p: 13.6, complete: true });
  const per100 = productToFood({ product_name: 'Nutella', nutriments: { energy_100g: 2252, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9, fiber_100g: 0 } }, '3017620422003');
  assert.equal(per100.portion, '100 ג׳'); assert.equal(per100.kcal, 538); assert.equal(per100.fib, 0);
  const empty = productToFood({ product_name_he: 'קולה', nutriments: {} }, '7290011017866');
  assert.equal(empty.complete, false); assert.equal(empty.kcal, null); assert.equal(empty.name, 'קולה');
});
