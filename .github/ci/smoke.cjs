// Smoke test: load the dashboard in headless Chromium and fail on anything a
// human would notice in the first ten seconds. Runs in CI; you can run it
// locally too:  npm run demo  then  node .github/ci/smoke.cjs
// (needs `npm i playwright` somewhere on NODE_PATH).
//
// Deliberately shallow — it doesn't test features, it tests "the page is not
// broken". Add feature tests here only if they are stable and fast.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.SMOKE_URL || 'http://localhost:8765/index.html';
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const problems = [];
const note = (m) => console.log('  ' + m);
const fail = (m) => { problems.push(m); console.log('  x ' + m); };
const ok = (m) => console.log('  ok ' + m);
const firstLine = (e) => String(e && e.message ? e.message : e).split('\n')[0];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();

  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push('pageerror: ' + e.message));
  // The browser parses the raw <x-dc> template (literal "{{ c.rx }}" in SVG
  // attributes) before support.js renders it, and logs an attribute error per
  // binding. That is how the runtime works, not a regression - ignore those.
  const isTemplateParseNoise = (t) => /\{\{[^}]*\}\}/.test(t) && /attribute|Expected/i.test(t);
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    if (isTemplateParseNoise(t)) return;
    jsErrors.push('console.error: ' + t);
  });
  page.on('requestfailed', (req) => {
    // CDN or local asset failing to load is a real break.
    const f = req.failure();
    jsErrors.push('request failed: ' + req.url() + ' - ' + (f ? f.errorText : 'unknown'));
  });

  console.log('\nLoading ' + URL);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // 1. The runtime rendered the template.
  const root = page.locator('.nh-root');
  try {
    await root.first().waitFor({ state: 'visible', timeout: 10000 });
    ok('.nh-root is visible');
  } catch {
    fail('.nh-root never became visible - runtime did not render the template');
  }

  const textLen = (await page.locator('body').innerText()).trim().length;
  if (textLen < 200) fail('body has only ' + textLen + ' chars of text - page looks empty');
  else ok('body has ' + textLen + ' chars of text');

  // Raw {{ bindings }} on screen means a template expression blew up.
  const rawBindings = await page.evaluate(() =>
    (document.body.innerText.match(/\{\{[^}]*\}\}/g) || []).slice(0, 5));
  if (rawBindings.length) fail('unrendered template bindings visible: ' + rawBindings.join(' | '));
  else ok('no raw {{ }} bindings on screen');

  await page.screenshot({ path: path.join(OUT, '01-desktop.png') });

  // 2. Dev panel: switch through all three roles and toggle demo data.
  // The toggle is a <span onClick> reading "Dev" (last child of .nh-dev).
  const devBtn = page.locator('.nh-dev > span').filter({ hasText: /^\s*Dev\s*$/ }).first();
  if (await devBtn.count()) {
    const roles = ['Employee', 'Team leader', 'Manager'];
    for (const role of roles) {
      try {
        await devBtn.click();
        const opt = page.locator('.nh-devpanel span').filter({ hasText: new RegExp('^\\s*' + role + '\\s*$') }).first();
        await opt.waitFor({ state: 'visible', timeout: 3000 });
        await opt.click();
        await page.waitForTimeout(400);
        if (!(await root.first().isVisible())) fail('after switching to ' + role + ': .nh-root gone');
        else ok('role switch -> ' + role);
        await page.screenshot({ path: path.join(OUT, '02-role-' + role.replace(/\s+/g, '-').toLowerCase() + '.png') });
      } catch (e) {
        fail('could not switch to role "' + role + '" via dev panel: ' + firstLine(e));
      }
    }

    try {
      await devBtn.click();
      const demo = page.locator('.nh-devpanel').getByText(/demo data/i).first();
      await demo.waitFor({ state: 'visible', timeout: 3000 });
      await demo.click();
      await page.waitForTimeout(400);
      if (!(await root.first().isVisible())) fail('after Demo data toggle: .nh-root gone');
      else ok('demo data toggled (empty states rendered)');
      await page.screenshot({ path: path.join(OUT, '03-demo-off.png') });
      // toggle back so localStorage state doesn't leak into later steps
      await devBtn.click();
      await page.locator('.nh-devpanel').getByText(/demo data/i).first().click();
      await page.waitForTimeout(200);
    } catch (e) {
      fail('could not toggle Demo data via dev panel: ' + firstLine(e));
    }
  } else {
    note('no .nh-dev button found - skipping role/demo-data checks (update smoke.cjs if the dev panel moved)');
  }

  // 3. Mobile width still renders.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(400);
  if (!(await root.first().isVisible())) fail('at 375px: .nh-root not visible');
  else ok('renders at 375px');
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 8) fail('at 375px: page scrolls horizontally by ' + overflow + 'px');
  else ok('no horizontal scroll at 375px');
  await page.screenshot({ path: path.join(OUT, '04-mobile.png') });

  // 4. Collected JS errors.
  const uniq = [...new Set(jsErrors)];
  if (uniq.length) fail(uniq.length + ' JS/console/network error(s):\n    - ' + uniq.slice(0, 10).join('\n    - '));
  else ok('no JS errors, console errors, or failed requests');

  await browser.close();

  console.log('');
  if (problems.length) {
    console.log('SMOKE FAILED - ' + problems.length + ' problem(s). Screenshots in ' + OUT);
    process.exit(1);
  }
  console.log('SMOKE PASSED');
})().catch((e) => {
  console.error('smoke test crashed:', e);
  process.exit(1);
});
