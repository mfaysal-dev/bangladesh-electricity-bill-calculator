import { bill, unitsForAmount, LIFELINE, STEPS, DEMAND_PER_KW } from './bill.js';
import { $, $$, bindActions, setParams, initLang, getLang, t, tk, nf, parseNum } from './ui.js';

const state = { mode: 'units', units: 250, amount: 1000, load: 2, meter: 'prepaid', rent: '40', rentCustom: 40, vat: 5, demand: DEMAND_PER_KW, vatRent: false };
const el = Object.fromEntries(['units', 'unitsRange', 'amount', 'load', 'rent', 'rentCustom', 'vat', 'demand', 'vatRent'].map((k) => [k, $('#' + k)]));
let last = null;

function opts() {
  return { loadKw: state.load, meterRent: state.rent === 'custom' ? state.rentCustom : +state.rent, prepaid: state.meter === 'prepaid', vatRate: state.vat / 100, vatOnMeterRent: state.vatRent, demandRate: state.demand };
}
function readParams() {
  const q = new URLSearchParams(location.search);
  if (q.get('mode') === 'amount') state.mode = 'amount';
  if (q.has('u')) state.units = parseNum(q.get('u'), 100000);
  if (q.has('amt')) state.amount = parseNum(q.get('amt'), 1e7);
  if (q.has('kw')) state.load = Math.min(100, parseNum(q.get('kw')));
  if (q.get('m') === 'postpaid') state.meter = 'postpaid';
  if (['40', '250', '0'].includes(q.get('rent'))) state.rent = q.get('rent');
  else if (q.has('rent')) { state.rent = 'custom'; state.rentCustom = parseNum(q.get('rent'), 10000); }
  if (q.has('vat')) state.vat = Math.min(30, parseNum(q.get('vat')));
  if (q.has('dc')) state.demand = Math.min(500, parseNum(q.get('dc')));
  state.vatRent = q.get('vr') === '1';
}
function writeParams() {
  setParams({ mode: state.mode === 'amount' && 'amount', u: state.mode === 'units' && state.units, amt: state.mode === 'amount' && state.amount, kw: state.load,
    m: state.meter === 'postpaid' && 'postpaid', rent: state.rent === 'custom' ? state.rentCustom : state.rent !== '40' && state.rent,
    vat: state.vat !== 5 && state.vat, dc: state.demand !== DEMAND_PER_KW && state.demand, vr: state.vatRent, lang: getLang() === 'en' && 'en' });
}
function syncInputs() {
  el.units.value = state.units; el.unitsRange.value = Math.min(state.units, 1000); el.amount.value = state.amount.toLocaleString('en-IN');
  el.load.value = state.load; el.rent.value = state.rent; el.rentCustom.value = state.rentCustom; el.vat.value = state.vat; el.demand.value = state.demand; el.vatRent.checked = state.vatRent;
  $('#rentCustomWrap').hidden = state.rent !== 'custom';
  $(`input[name=mode][value="${state.mode}"]`).checked = true; $(`input[name=meter][value="${state.meter}"]`).checked = true;
  $('#unitsWrap').hidden = state.mode !== 'units'; $('#amountWrap').hidden = state.mode !== 'amount';
}
const stepLabel = (r) => r.rate === LIFELINE.rate && r.from === 0 && r.to <= LIFELINE.maxUnits ? t('লাইফলাইন', 'Lifeline') : `${nf(r.from + (r.from ? 1 : 0))}–${nf(r.to)}`;

function update() {
  const o = opts();
  const units = state.mode === 'amount' ? unitsForAmount(state.amount, o) : state.units;
  const b = bill({ ...o, units });
  last = { b, units };
  $('#bigLabel').textContent = state.mode === 'amount' ? t('আনুমানিক ইউনিট', 'Estimated units') : t('এই মাসের আনুমানিক বিল', 'Estimated bill this month');
  $('#total').textContent = state.mode === 'amount' ? nf(units, 0, 1) + ' ' + t('ইউনিট', 'units') : tk(b.total, 2);
  $('#summary').textContent = state.mode === 'amount'
    ? t(`${tk(state.amount)} রিচার্জে এই মাসে প্রায় ${nf(units, 0, 1)} ইউনিট (বিল ${tk(b.total, 2)})।`, `${tk(state.amount)} buys about ${nf(units, 0, 1)} units this month (bill ${tk(b.total, 2)}).`)
    : t(`${nf(units)} ইউনিট · ${nf(state.load, 0, 1)} কিলোওয়াট লোড · ${state.meter === 'prepaid' ? 'প্রিপেইড' : 'পোস্টপেইড'} মিটার`, `${nf(units)} units · ${nf(state.load, 0, 1)} kW load · ${state.meter} meter`);
  $('#sEnergy').textContent = tk(b.energy, 2); $('#sDemand').textContent = tk(b.demand, 2); $('#sVat').textContent = tk(b.vat, 2); $('#sAvg').textContent = tk(b.perUnit, 2);

  const rows = b.rows.map((r) => `<tr><td>${stepLabel(r)}</td><td class="r">${nf(r.units, 0, 1)}</td><td class="r">${nf(r.rate, 2)}</td><td class="r">${tk(r.amount, 2)}</td></tr>`);
  rows.push(`<tr><td>${t('ডিমান্ড চার্জ', 'Demand charge')}</td><td class="r">${nf(state.load, 0, 1)} kW</td><td class="r">${nf(state.demand, 2)}</td><td class="r">${tk(b.demand, 2)}</td></tr>`);
  rows.push(`<tr><td>${t('মিটার ভাড়া', 'Meter rent')}</td><td></td><td></td><td class="r">${tk(b.meterRent, 2)}</td></tr>`);
  if (b.rebate) rows.push(`<tr><td>${t('প্রিপেইড রিবেট (০.৫%)', 'Prepaid rebate (0.5%)')}</td><td></td><td></td><td class="r">−${tk(b.rebate, 2)}</td></tr>`);
  rows.push(`<tr><td>${t('ভ্যাট', 'VAT')} (${nf(state.vat, 0, 2)}%)</td><td></td><td></td><td class="r">${tk(b.vat, 2)}</td></tr>`);
  rows.push(`<tr class="sum"><td>${t('মোট', 'Total')}</td><td class="r">${nf(units, 0, 1)}</td><td></td><td class="r">${tk(b.total, 2)}</td></tr>`);
  $('#rows').innerHTML = rows.join('');

  const tariff = [[t('লাইফলাইন (০–৫০, শুধু মাসে ৫০ ইউনিট বা কম হলে)', 'Lifeline (0–50, only if the month is 50 units or less)'), LIFELINE.rate, b.lifeline]];
  let prev = 0;
  for (const s of STEPS) { tariff.push([s.upTo === Infinity ? t('৬০০ ইউনিটের উপরে', 'Above 600 units') : `${nf(prev ? prev + 1 : 0)}–${nf(s.upTo)} ${t('ইউনিট', 'units')}`, s.rate, !b.lifeline && units > prev && (units <= s.upTo)]); prev = s.upTo; }
  $('#tariff').innerHTML = tariff.map(([l, r, cur]) => `<tr${cur ? ' class="cur"' : ''}><td>${l}</td><td class="r">${nf(r, 2)}</td></tr>`).join('');

  const common = [50, 100, 150, 200, 300, 400, 600].map((u) => [u, bill({ ...o, units: u }).total]);
  const max = Math.max(...common.map((c) => c[1]));
  $('#bars').innerHTML = common.map(([u, v]) => `<div class="barrow${Math.abs(u - units) < 1 ? ' current' : ''}"><span class="label">${nf(u)} ${t('ইউনিট', 'units')}</span><span class="track"><span class="fill" style="width:${(v / max * 100).toFixed(1)}%"></span></span><b>${tk(v)}</b></div>`).join('');

  const notes = [];
  if (units > LIFELINE.maxUnits && units <= 60) notes.push(['warn', t(`⚠️ ৫০ ইউনিটের বেশি হওয়ায় লাইফলাইন হার প্রযোজ্য নয়। ৫০ ইউনিটে থাকলে বিল হতো ${tk(bill({ ...o, units: 50 }).total, 2)}।`, `⚠️ Over 50 units, so the lifeline rate doesn’t apply. At 50 units the bill would be ${tk(bill({ ...o, units: 50 }).total, 2)}.`)]);
  if (b.lifeline && units > 0) notes.push(['', t('✅ মাসে ৫০ ইউনিট বা কম, তাই লাইফলাইন হার (৪.৬৩ টাকা) প্রযোজ্য।', '✅ 50 units or less this month, so the lifeline rate (Tk 4.63) applies.')]);
  if (units > 400) notes.push(['', t('৪০০ ইউনিটের পর প্রতি ইউনিটের দাম ১৫.০১ টাকা, আর ৬০০-র পর ১৭.৩৫ টাকা। এসি বা গিজার কম চালালে বিল দ্রুত কমে।', 'Above 400 units each unit costs Tk 15.01, and Tk 17.35 above 600. Cutting AC or geyser use brings the bill down fast.')]);
  $('#notes').innerHTML = notes.map(([c, x]) => `<div class="note ${c}">${x}</div>`).join('');
  writeParams();
}
function resultText() {
  const { b, units } = last;
  return [t('বিদ্যুৎ বিল হিসাব (বিইআরসি, জুন ২০২৬ থেকে)', 'Electricity bill (BERC tariff from June 2026)'), t(`ইউনিট: ${nf(units, 0, 1)}`, `Units: ${nf(units, 0, 1)}`),
    t(`এনার্জি চার্জ: ${tk(b.energy, 2)}`, `Energy charge: ${tk(b.energy, 2)}`), t(`ডিমান্ড চার্জ: ${tk(b.demand, 2)}`, `Demand charge: ${tk(b.demand, 2)}`),
    t(`মিটার ভাড়া: ${tk(b.meterRent, 2)}`, `Meter rent: ${tk(b.meterRent, 2)}`), b.rebate ? t(`প্রিপেইড রিবেট: −${tk(b.rebate, 2)}`, `Prepaid rebate: −${tk(b.rebate, 2)}`) : '',
    t(`ভ্যাট: ${tk(b.vat, 2)}`, `VAT: ${tk(b.vat, 2)}`), t(`মোট: ${tk(b.total, 2)}`, `Total: ${tk(b.total, 2)}`), location.href].filter(Boolean).join('\n');
}

el.units.addEventListener('input', () => { state.units = parseNum(el.units.value, 100000); el.unitsRange.value = Math.min(state.units, 1000); update(); });
el.unitsRange.addEventListener('input', () => { state.units = +el.unitsRange.value; el.units.value = state.units; update(); });
el.amount.addEventListener('input', () => { state.amount = parseNum(el.amount.value, 1e7); update(); });
el.amount.addEventListener('blur', () => { el.amount.value = state.amount.toLocaleString('en-IN'); });
el.load.addEventListener('input', () => { state.load = Math.min(100, parseNum(el.load.value)); update(); });
el.rent.addEventListener('change', () => { state.rent = el.rent.value; $('#rentCustomWrap').hidden = state.rent !== 'custom'; update(); });
el.rentCustom.addEventListener('input', () => { state.rentCustom = parseNum(el.rentCustom.value, 10000); update(); });
el.vat.addEventListener('input', () => { state.vat = Math.min(30, parseNum(el.vat.value)); update(); });
el.demand.addEventListener('input', () => { state.demand = Math.min(500, parseNum(el.demand.value)); update(); });
el.vatRent.addEventListener('change', () => { state.vatRent = el.vatRent.checked; update(); });
$$('input[name=mode]').forEach((i) => i.addEventListener('change', () => { state.mode = i.value; syncInputs(); update(); }));
$$('input[name=meter]').forEach((i) => i.addEventListener('change', () => { state.meter = i.value; update(); }));
$$('[data-u]').forEach((c) => c.addEventListener('click', () => { state.mode = 'units'; state.units = +c.dataset.u; syncInputs(); update(); }));
bindActions({ result: resultText, shareMsg: () => t('লিংক কপি হয়েছে', 'Link copied'), copyMsg: () => t('ফলাফল কপি হয়েছে', 'Result copied') });

readParams(); syncInputs();
initLang(() => update());
