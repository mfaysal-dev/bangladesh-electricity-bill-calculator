// Shared UI helpers: copy/share/print, toast and (for bilingual pages) the Bangla/English switch.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1800);
}
export async function copyText(text, msg) {
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast(msg);
}
export function bindActions({ result, shareMsg = 'Link copied', copyMsg = 'Result copied' }) {
  $('#share')?.addEventListener('click', () => copyText(location.href, typeof shareMsg === 'function' ? shareMsg() : shareMsg));
  $('#copy')?.addEventListener('click', () => copyText(result(), typeof copyMsg === 'function' ? copyMsg() : copyMsg));
  $('#print')?.addEventListener('click', () => window.print());
}
export function setParams(obj) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== '' && v != null && v !== false) q.set(k, v === true ? '1' : v);
  history.replaceState(null, '', q.toString() ? '?' + q : location.pathname);
}

// ---- bilingual pages (bn default, en optional) ----
let lang = 'bn';
export const getLang = () => lang;
export const t = (bn, en) => (lang === 'en' ? en : bn);
export function initLang(onChange) {
  const q = new URLSearchParams(location.search);
  lang = q.get('lang') === 'en' ? 'en' : q.get('lang') === 'bn' ? 'bn' : (localStorage.getItem('lang') || 'bn');
  const btn = $('#lang');
  const apply = () => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'bn-BD';
    for (const el of $$('[data-en]')) { if (el.dataset.bn == null) el.dataset.bn = el.innerHTML; el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.bn; }
    for (const el of $$('[data-en-aria]')) { if (el.dataset.bnAria == null) el.dataset.bnAria = el.getAttribute('aria-label') || ''; el.setAttribute('aria-label', lang === 'en' ? el.dataset.enAria : el.dataset.bnAria); }
    for (const el of $$('[data-en-ph]')) { if (el.dataset.bnPh == null) el.dataset.bnPh = el.getAttribute('placeholder') || ''; el.setAttribute('placeholder', lang === 'en' ? el.dataset.enPh : el.dataset.bnPh); }
    const h = document.documentElement;
    if (h.dataset.titleBn == null) h.dataset.titleBn = document.title;
    document.title = lang === 'en' ? h.dataset.titleEn : h.dataset.titleBn;
    if (btn) { btn.textContent = lang === 'en' ? 'বাংলা' : 'English'; btn.setAttribute('aria-label', lang === 'en' ? 'বাংলায় দেখুন' : 'Switch to English'); }
    localStorage.setItem('lang', lang);
    onChange?.(lang);
  };
  btn?.addEventListener('click', () => { lang = lang === 'en' ? 'bn' : 'en'; apply(); });
  apply();
}
// Taka with lakh grouping: Bangla digits in bn, Latin digits in en
export function tk(n, dp = 0) {
  const v = Number(n) || 0;
  const s = v.toLocaleString(lang === 'en' ? 'en-IN' : 'bn-BD', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return '৳' + s;
}
export function nf(n, dp = 0, maxDp = dp) {
  return (Number(n) || 0).toLocaleString(lang === 'en' ? 'en-IN' : 'bn-BD', { minimumFractionDigits: dp, maximumFractionDigits: maxDp });
}
// parse a typed number, accepting Bangla digits and commas
export function parseNum(v, max = 1e12) {
  const s = String(v).replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)).replace(/[^0-9.]/g, '');
  return Math.max(0, Math.min(max, Number(s) || 0));
}
