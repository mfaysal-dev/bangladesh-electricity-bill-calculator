import { test } from 'node:test';
import assert from 'node:assert/strict';
import { energyCharge, bill, unitsForAmount, STEPS, LIFELINE } from '../public/bill.js';

test('BERC 2026 LT-A rates (Order 2026/22 + Reconsideration 2026/01)', () => {
  assert.equal(LIFELINE.rate, 4.63);
  assert.deepEqual(STEPS.map((s) => s.rate), [5.26, 8.50, 9.10, 9.62, 15.01, 17.35]);
});

test('Lifeline: 50 units at Tk 4.63 = Tk 231.50', () => {
  const e = energyCharge(50);
  assert.equal(e.total, 231.5);
  assert.equal(e.lifeline, true);
});

test('51 units leaves the lifeline: all 51 at Tk 5.26', () => {
  const e = energyCharge(51);
  assert.equal(e.lifeline, false);
  assert.equal(e.total, 268.26);
});

test('100 units: 75 × 5.26 + 25 × 8.50 = Tk 607', () => {
  assert.equal(energyCharge(100).total, 607);
});

test('250 units: 394.50 + 1,062.50 + 455 = Tk 1,912', () => {
  assert.equal(energyCharge(250).total, 1912);
});

test('700 units uses every step', () => {
  // 394.5 + 125×8.5 + 100×9.1 + 100×9.62 + 200×15.01 + 100×17.35
  assert.equal(energyCharge(700).total, 394.5 + 1062.5 + 910 + 962 + 3002 + 1735);
});

test('Postpaid bill for 250 units, 2 kW, Tk 40 meter rent, 5% VAT on energy + demand', () => {
  const b = bill({ units: 250, loadKw: 2, meterRent: 40, prepaid: false });
  assert.equal(b.demand, 84);
  assert.equal(b.vat, 99.8);
  assert.equal(b.total, 1912 + 84 + 40 + 99.8);
});

test('Prepaid gets 0.5% off the net bill before VAT', () => {
  const b = bill({ units: 250, loadKw: 2, meterRent: 40, prepaid: true });
  assert.equal(b.rebate, 10.18); // 0.5% of 2,036
  assert.equal(b.total, 2125.62);
});

test('Optional VAT on meter rent and custom VAT rate', () => {
  assert.equal(bill({ units: 100, loadKw: 1, meterRent: 40, prepaid: false, vatOnMeterRent: true }).vat, 34.45);
  assert.equal(bill({ units: 100, loadKw: 1, meterRent: 0, prepaid: false, vatRate: 0 }).vat, 0);
});

test('Recharge estimate: Tk 1,000 buys about how many units?', () => {
  const opts = { loadKw: 2, meterRent: 40, prepaid: true };
  const u = unitsForAmount(1000, opts);
  assert.ok(bill({ ...opts, units: u }).total <= 1000);
  assert.ok(bill({ ...opts, units: u + 0.2 }).total > 1000);
  assert.equal(unitsForAmount(50, opts), 0);
});
