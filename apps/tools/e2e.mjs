import puppeteer from 'puppeteer-core';
const BASE = 'http://127.0.0.1:8811/'; const OUT = '/workspace/mindframe-apps/screenshots/';
const errors = [], results = {}; const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const ctx = await browser.createBrowserContext();
function watch(p, tag) { p.on('console', m => { if (m.type() === 'error') errors.push(`[${tag}] ${m.text()}`); }); p.on('pageerror', e => errors.push(`[${tag} pageerror] ${e.message}`)); }
const PHONE = { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true }; // Pixel-class viewport
const DESK = { width: 1280, height: 860, deviceScaleFactor: 1 };
async function page(tag, vp, scheme) { const p = await ctx.newPage(); watch(p, tag); await p.setViewport(vp); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]); return p; }
const shot = async (p, n, full = true) => { if (full) await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: OUT + n, fullPage: full }); console.log('shot', n); };

// ---------- MindFrame Now ----------
let p = await page('now', PHONE, 'light');
await p.goto(BASE + 'now/', { waitUntil: 'networkidle0' });
await shot(p, 'now-phone-light-1-pick.png', false);
const t0 = Date.now();
await p.click('#energy .chip[data-v="3"]'); await p.click('#stress .chip[data-v="4"]');
await p.waitForSelector('#result:not(.hidden)');
results.nowTapToCardMs = Date.now() - t0;
results.nowCard34 = await p.evaluate(() => ({ state: document.getElementById('stateName').textContent, tech: document.getElementById('techName').textContent, affirm: document.getElementById('affirm').textContent, words: [...document.querySelectorAll('.word h3')].map(h => h.firstChild.textContent), quote: document.getElementById('quote').innerText.slice(0, 80) }));
await shot(p, 'now-phone-light-2-card-frantic-hustle.png');
// all 16 states render with no undefined
results.now16 = await p.evaluate(async () => { const bad = []; for (let e = 1; e <= 4; e++) for (let s = 1; s <= 4; s++) { document.querySelector(`#energy .chip[data-v="${e}"]`).click(); document.querySelector(`#stress .chip[data-v="${s}"]`).click(); const t = document.getElementById('result').innerText; if (/undefined|\{\{/.test(t) || !document.getElementById('stateName').textContent) bad.push(e + '-' + s); } return bad; });
// save to log (optional) -> inbox
await p.evaluate(() => { document.getElementById('saveBox').open = true; document.querySelector('#energy .chip[data-v="3"]').click(); document.querySelector('#stress .chip[data-v="4"]').click(); document.getElementById('before').value = '7'; document.getElementById('after').value = '4'; document.getElementById('saveBtn').click(); });
results.nowInbox = await p.evaluate(() => JSON.parse(localStorage.getItem('mindframe.inbox.v1')).map(e => e.stateKey + ':' + e.techniques[0].id + ':' + e.techniques[0].before + '>' + e.techniques[0].after));
results.nowSW = await p.evaluate(async () => { const r = await Promise.race([navigator.serviceWorker.ready.then(() => 'ready'), new Promise(r => setTimeout(() => r('timeout'), 5000))]); return r + ' controller=' + !!navigator.serviceWorker.controller; });
await p.reload({ waitUntil: 'networkidle0' });
await p.setOfflineMode(true);
await p.goto(BASE + 'now/?e=1&s=4', { waitUntil: 'domcontentloaded' }); await sleep(400);
results.nowOffline = await p.evaluate(() => document.getElementById('stateName').textContent + ' | care shown=' + !document.getElementById('care').classList.contains('hidden'));
await p.setOfflineMode(false);
await p.close();
p = await page('now-dark', PHONE, 'dark');
await p.goto(BASE + 'now/?e=1&s=4', { waitUntil: 'networkidle0' });
await shot(p, 'now-phone-dark-3-card-paralyzed-care.png');
await p.goto(BASE + 'now/?e=2&s=3&mood=heavy&focus=looping', { waitUntil: 'networkidle0' });
await p.evaluate(() => { document.getElementById('more').open = true; });
await shot(p, 'now-phone-dark-4-card-grinding-looping.png');
await p.close();
p = await page('now-desk', DESK, 'light');
await p.goto(BASE + 'now/?e=4&s=2&context=with', { waitUntil: 'networkidle0' });
await shot(p, 'now-desktop-light-card-sprint.png');
await p.close();

// ---------- MindFrame Log ----------
p = await page('log', PHONE, 'light');
await p.goto(BASE + 'log/', { waitUntil: 'networkidle0' });
results.logPulledFromNow = await p.evaluate(() => ({ entries: window.__log.store().entries.map(e => e.type + ':' + e.stateKey), inboxLeft: localStorage.getItem('mindframe.inbox.v1') }));
// daily check-in + event
await p.evaluate(() => {
  const set = (k, v) => { const i = document.getElementById('pk-' + k); i.value = v; i.dispatchEvent(new Event('input')); };
  set('here', 7); set('absorbed', 6); set('heard', 8); set('held', 7); set('done', 5); set('savored', 6);
  document.getElementById('peakLine').value = 'dinner with family'; document.getElementById('sleep').value = '7.5';
  document.querySelector('#dEnergy .chip[data-v="2"]').click(); document.querySelector('#dStress .chip[data-v="2"]').click();
  document.querySelector('.counter[data-for="pauses"] [data-d="1"]').click(); document.querySelector('.counter[data-for="repairs"] [data-d="1"]').click();
});
await shot(p, 'log-phone-light-1-today-form.png', false);
await p.evaluate(() => document.querySelector('#dailyForm button[type=submit]').click());
await p.evaluate(() => { document.querySelector('#eEnergy .chip[data-v="3"]').click(); document.querySelector('#eStress .chip[data-v="3"]').click(); document.getElementById('eTech').value = 'dps'; document.getElementById('eBefore').value = '6'; document.getElementById('eAfter').value = '3'; document.querySelector('#eventForm button[type=submit]').click(); });
results.logAfterSaves = await p.evaluate(() => window.__log.store().entries.map(e => e.type + ':' + (e.stateKey || '') + (e.peak ? ':peak' + e.peak.here : '') + (e.line ? ':' + e.line : '')));
await shot(p, 'log-phone-light-2-today-saved.png');
// CSV/JSON export -> import round trip into a fresh store
results.logRoundTrip = await p.evaluate(() => { const M = window.MF_LOG, es = window.__log.store().entries; const csv = M.toCSV(es), json = M.exportJSON(es); return { csvBack: M.parseImport(csv).length, jsonBack: M.parseImport(json).length, original: es.length, reimportAdded: window.__log.importText(json, 'self') }; });
results.logSW = await p.evaluate(async () => Promise.race([navigator.serviceWorker.ready.then(() => 'ready'), new Promise(r => setTimeout(() => r('timeout'), 5000))]));
// example data
await p.evaluate(() => { document.getElementById('exampleToggle').click(); window.__log.show('today'); });
await shot(p, 'log-phone-light-3-example-today-flags.png');
await p.evaluate(() => window.__log.show('trends')); await sleep(200);
await shot(p, 'log-phone-light-4-example-trends.png');
await p.evaluate(() => window.__log.show('training')); await sleep(100);
await p.evaluate(() => document.getElementById('simRun').click()); await sleep(200);
await shot(p, 'log-phone-light-5-example-training.png');
await p.close();

p = await page('log-dark', PHONE, 'dark');
await p.goto(BASE + 'log/?tab=trends', { waitUntil: 'networkidle0' }); await sleep(200);
await shot(p, 'log-phone-dark-6-example-trends.png');
await p.close();

p = await page('log-desk', DESK, 'light');
await p.evaluateOnNewDocument(() => { window.__fast = true; });
await p.goto(BASE + 'log/?tab=trends', { waitUntil: 'networkidle0' }); await sleep(200);
await shot(p, 'log-desktop-light-7-example-trends.png');
await p.evaluate(() => window.__log.show('reports')); await sleep(200);
await shot(p, 'log-desktop-light-8-example-weekly-report.png');
results.reportText = await p.evaluate(() => document.getElementById('report').innerText.slice(0, 400));
await p.evaluate(() => document.getElementById('tab-reports').classList.add('printing'));
await p.emulateMediaType('print');
await p.pdf({ path: OUT + 'log-example-weekly-report-print.pdf', format: 'Letter', printBackground: true, margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' } });
await p.emulateMediaType('screen');
await p.evaluate(() => { document.getElementById('tab-reports').classList.remove('printing'); document.getElementById('repKind').value = 'month'; document.getElementById('repKind').dispatchEvent(new Event('change')); });
await shot(p, 'log-desktop-light-9-example-monthly-report.png');
await p.evaluate(() => window.__log.show('training'));
await p.evaluate(() => document.getElementById('simRun').click()); await sleep(200);
// replay drill (fast mode), rest drill, live thermostat drill
await p.evaluate(() => { document.getElementById('rBefore').value = '6'; document.getElementById('replayStart').click(); }); await sleep(3000);
results.replayEnded = await p.evaluate(() => !document.getElementById('replayEnd').classList.contains('hidden') && document.getElementById('replayPhase').textContent);
await p.evaluate(() => document.getElementById('liveStart').click()); await sleep(300);
await p.evaluate(() => document.getElementById('liveToggle').click()); await sleep(250); await p.evaluate(() => document.getElementById('liveToggle').click());
await sleep(1500);
results.liveDrill = await p.evaluate(() => document.getElementById('liveOut').innerText.replace(/\s+/g, ' '));
await shot(p, 'log-desktop-light-10-example-training.png');
await p.close();

p = await page('log-desk-dark', DESK, 'dark');
await p.goto(BASE + 'log/?tab=training', { waitUntil: 'networkidle0' });
await p.evaluate(() => document.getElementById('simRun').click()); await sleep(200);
await shot(p, 'log-desktop-dark-11-example-training.png');
await p.goto(BASE + 'log/?tab=data', { waitUntil: 'networkidle0' });
await shot(p, 'log-desktop-dark-12-data.png');
// offline reload
await p.setOfflineMode(true); await p.reload({ waitUntil: 'domcontentloaded' }); await sleep(300);
results.logOffline = await p.evaluate(() => document.querySelector('h1').textContent + ' entries=' + window.__log.entries().length);
await p.setOfflineMode(false);
await p.close();

await browser.close();
console.log(JSON.stringify(results, null, 1));
console.log('ERRORS:', errors.length ? errors : 'none');
