// Bangladesh residential electricity bill (LT-A), from bill month June 2026.
// Sources (checked 8 October 2026):
//  - BERC Order No. 2026/22, retail tariff notice dated 3 June 2026 (energy rates, demand charge Tk 42/kW/month,
//    0.5% prepaid rebate on the net bill excluding VAT), https://berc.org.bd/pages/notices
//  - BERC Reconsideration Order No. 2026/01 dated 4 June 2026: lifeline (0–50) and first step (0–75) kept at the
//    pre-June rates of Tk 4.63 and Tk 5.26, effective bill month June 2026.
// Meter rent (Tk 40 single phase / Tk 250 three phase, distributor-supplied prepaid meter) and VAT 5% are not in the
// BERC tariff table: both are editable in the app.

export const LIFELINE = { maxUnits: 50, rate: 4.63 };
export const STEPS = [
  { upTo: 75, rate: 5.26 },
  { upTo: 200, rate: 8.50 },
  { upTo: 300, rate: 9.10 },
  { upTo: 400, rate: 9.62 },
  { upTo: 600, rate: 15.01 },
  { upTo: Infinity, rate: 17.35 },
];
export const DEMAND_PER_KW = 42;
export const VAT = 0.05;
export const PREPAID_REBATE = 0.005;
export const METER_RENT = { single: 40, three: 250, own: 0 };

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Energy charge with telescopic (step) billing. Lifeline rate only if the whole month is 50 units or less. */
export function energyCharge(units) {
  units = Math.max(0, +units || 0);
  if (units <= LIFELINE.maxUnits) {
    return { total: r2(units * LIFELINE.rate), lifeline: true, rows: [{ from: 0, to: units, units, rate: LIFELINE.rate, amount: r2(units * LIFELINE.rate) }] };
  }
  let prev = 0, total = 0;
  const rows = [];
  for (const s of STEPS) {
    const u = Math.max(0, Math.min(units, s.upTo) - prev);
    if (u > 0) { rows.push({ from: prev, to: prev + u, units: u, rate: s.rate, amount: r2(u * s.rate) }); total += u * s.rate; }
    prev = s.upTo;
    if (units <= s.upTo) break;
  }
  return { total: r2(total), lifeline: false, rows };
}

export function bill({ units, loadKw = 2, meterRent = METER_RENT.single, prepaid = true, vatRate = VAT, vatOnMeterRent = false, demandRate = DEMAND_PER_KW }) {
  const e = energyCharge(units);
  const demand = r2(Math.max(0, +loadKw || 0) * demandRate);
  const rent = Math.max(0, +meterRent || 0);
  const net = e.total + demand + rent;                    // net bill before VAT
  const rebate = prepaid ? r2(net * PREPAID_REBATE) : 0;  // 0.5% of the net bill excluding VAT
  const vatBase = e.total + demand + (vatOnMeterRent ? rent : 0);
  const vat = r2(vatBase * Math.max(0, +vatRate || 0));
  const total = r2(net - rebate + vat);
  return { units: Math.max(0, +units || 0), energy: e.total, lifeline: e.lifeline, rows: e.rows, demand, meterRent: rent, net: r2(net), rebate, vat, total,
    perUnit: units > 0 ? r2(total / units) : 0 };
}

/** Prepaid recharge: roughly how many units does an amount buy this month (after demand, rent, VAT, rebate)? */
export function unitsForAmount(amount, opts = {}) {
  amount = Math.max(0, +amount || 0);
  if (bill({ ...opts, units: 0 }).total >= amount) return 0;
  let lo = 0, hi = 5000;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (bill({ ...opts, units: mid }).total <= amount) lo = mid; else hi = mid; }
  return Math.floor(lo * 10) / 10;
}
