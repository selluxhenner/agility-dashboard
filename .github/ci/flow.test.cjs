// End-to-end flow test: the process the demo exists to show, driven through
// the real UI in headless Chromium. Runs in CI after the smoke test; locally:
//   python -m http.server 8765   then   node .github/ci/flow.test.cjs
//
// The story (docs/ACTIONS_PLAN.md, phase 2 exit test):
//   employee raises → lead sees it → lead asks one question → employee answers
//   → lead says no, with a reason → employee sees the no, the reason, the name
//   plus: hand-over lands in "waiting on", approve-and-assign names a team,
//   a question under an idea shows as a thread, everything survives a reload,
//   the sheet is a bottom sheet on a phone.

const { chromium } = require('playwright');

const URL = process.env.SMOKE_URL || 'http://localhost:8765/index.html';
const problems = [];
const ok = m => console.log('  ok ' + m);
const fail = m => { problems.push(m); console.log('  x  ' + m); };
const check = (cond, m) => (cond ? ok(m) : fail(m));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  const text = async () => (await page.locator('body').innerText());
  const dev = () => page.locator('.nh-dev > span').filter({ hasText: /^\s*Dev\s*$/ }).first();
  const role = async name => {
    await dev().click();
    await page.locator('.nh-devpanel span').filter({ hasText: new RegExp('^\\s*' + name + '\\s*$') }).first().click();
    await page.waitForTimeout(250);
  };
  const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Buttons are <span onClick> with exact text; getByText is case-insensitive and would hit body copy.
  const clickText = async (t, nth = 0) => { await page.locator('span, div').filter({ hasText: new RegExp('^\\s*' + esc(t).replace(/ /g, '\\s+') + '\\s*$') }).nth(nth).click(); await page.waitForTimeout(250); };
  const clickRow = async t => { await page.getByText(t, { exact: false }).first().click(); await page.waitForTimeout(250); };
  const sheet = () => page.locator('.nh-sheet');
  const sheetType = async t => { await sheet().locator('textarea').fill(t); await page.waitForTimeout(150); };

  console.log('\nLoading ' + URL);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.nh-root').first().waitFor({ state: 'visible' });

  // ── 1. employee raises a case routed to the team leader (r6: shift/overtime) ──
  await role('Employee');
  const TITLE = 'The Friday shift plan leaves line 3 with no overtime hours for the changeover';
  await page.locator('textarea').first().fill(TITLE);
  await page.waitForTimeout(200);
  check(/Send to T\. Vogel/.test(await text()), 'router proposes T. Vogel for a shift-plan problem');
  await clickText('Send to T. Vogel');
  let t = await text();
  check(t.indexOf(TITLE) >= 0 && /You raised this today/.test(t), 'employee: case appears in My cases as raised today');
  check(/Sent to T\. Vogel\. They owe you/.test(t), 'employee: clock sentence names the assignee and the due date');

  // ── 2. lead asks one question ──
  await role('Team leader');
  t = await text();
  check(t.indexOf(TITLE) >= 0 && /open 0 d/.test(t), 'lead: case is in the inbox at 0 d');
  await clickRow(TITLE);
  await clickText('Ask one question');
  check(await sheet().isVisible(), 'sheet opens for the question');
  check(/Type the question/.test(await sheet().innerText()), 'confirm is disabled until there is a question');
  await sheetType('Which shift — early or late?');
  await sheet().getByText('Send the question').click();
  await page.waitForTimeout(300);
  t = await text();
  check(!(await sheet().isVisible()), 'sheet closes after sending');
  check(/clock paused[\s\S]{0,120}waiting on Anonymous #4471/.test(t), 'lead: case row reads clock paused · waiting on the sender');
  check(/Waiting for Anonymous #4471 to answer\. The clock is paused/.test(t), 'lead: selected case explains the pause');
  check(!/Yes, do it/.test(t), 'lead: no actions while the question is out');

  // ── 3. employee answers ──
  await role('Employee');
  t = await text();
  check(/Question for you/.test(t), 'employee: row status is "Question for you"');
  check(/“Which shift — early or late\?”/.test(t), 'employee: sees the question text');
  await clickText('Answer T. Vogel');
  check(await sheet().isVisible(), 'reply sheet opens');
  await sheetType('The late shift, 14:00–22:00.');
  await sheet().getByText('Send the answer').click();
  await page.waitForTimeout(300);
  t = await text();
  check(/you answered: “The late shift, 14:00–22:00\.”\. The clock is running again/.test(t), 'employee: row shows the answer and that the clock resumed');
  check(!/Answer T\. Vogel/.test(t), 'employee: reply button gone once answered');

  // ── 4. lead says no, with a reason ──
  await role('Team leader');
  await clickRow(TITLE);
  t = await text();
  check(/“The late shift, 14:00–22:00\.”/.test(t) && /answered today/.test(t), 'lead: selected case shows the answer');
  check(/Yes, do it/.test(t), 'lead: actions are back');
  await clickText('No, and why');
  check(/Pick a reason/.test(await sheet().innerText()), 'no-sheet: confirm disabled until a reason is picked');
  await sheet().getByText('No time this quarter').click();
  await sheetType('Q4 at the earliest — the fixture team is on the 4-series until then');
  await sheet().getByText('Send the no').click();
  await page.waitForTimeout(300);
  t = await text();
  check(/Decided · no · no time/.test(t), 'lead: cleared list shows the no with its reason');
  check(t.indexOf('open 0 d') < 0 || !new RegExp(TITLE + '[\\s\\S]{0,200}open 0 d').test(t), 'lead: case left the inbox');

  // ── 5. employee sees the no ──
  await role('Employee');
  t = await text();
  check(/Declined/.test(t), 'employee: status Declined');
  check(/Answered “no” in 0 days — no time\./.test(t), 'employee: clock sentence carries the reason');
  check(/Q4 at the earliest — the fixture team/.test(t) && /T\. Vogel · today/.test(t), 'employee: sees the note, the name and the day');

  // ── 6. hand-over: the gauge case goes to Quality ──
  await role('Team leader');
  await clickRow('Tolerance drift on station 7');
  await clickText('Pass to H. Sander');
  check(/Hand to H\. Sander/.test(await sheet().innerText()), 'hand-sheet: map owner preselected');
  await sheetType('Quality owns the gauge — we only see the symptom');
  await sheet().getByText('Hand to H. Sander').click();
  await page.waitForTimeout(300);
  t = await text();
  check(/Handed over · H\. Sander/.test(t), 'lead: cleared list shows the hand-over target');
  check(/Tolerance drift on station 7[\s\S]{0,160}with H\. Sander · Quality/.test(t), 'lead: case now appears under "your team is waiting on"');

  // ── 7. manager approves with a team ──
  await role('Manager');
  await clickText('Ideas', 0);
  await page.waitForTimeout(200);
  const decidable = page.getByText('Approve and assign');
  const fundable = page.getByText('Fund a trial');
  if (await decidable.count()) await decidable.first().click(); else await fundable.first().click();
  await page.waitForTimeout(250);
  check(await sheet().isVisible(), 'assign sheet opens');
  check(/Pick at least one person/.test(await sheet().innerText()) || /Approve with|Fund it with/.test(await sheet().innerText()), 'assign sheet: confirm state depends on picked people');
  const chips = sheet().locator('span').filter({ hasText: /^[A-Z]{1,2}[A-Z]\. [A-Za-z]+$/ });
  const chipCount = await chips.count();
  check(chipCount >= 3, 'assign sheet offers people to pick (' + chipCount + ')');
  // make sure at least one is picked, then confirm
  const label = await sheet().innerText();
  if (/Pick at least one person/.test(label)) await chips.first().click();
  await page.waitForTimeout(150);
  await sheet().locator('span').filter({ hasText: /^(Approve with|Fund it with) \d/ }).first().click();
  await page.waitForTimeout(300);
  t = await text();
  check(/(Approved|Trial funded) today by B\. Hartmann/.test(t), 'manager: idea shows who approved it and when');
  check(/In trial/.test(t), 'manager: idea status moved to In trial');

  // ── 8. a question under an idea ──
  await role('Employee');
  await clickText('Ideas', 0);
  await page.waitForTimeout(200);
  await clickText('Ask a question');
  await sheetType('What happened at the pilot sites when a purchase went wrong?');
  await sheet().locator('span').filter({ hasText: /^Ask (the proposer|[A-Z]\. )/ }).first().click();
  await page.waitForTimeout(300);
  t = await text();
  check(/questions asked[\s\S]{0,80}“What happened at the pilot sites/i.test(t), 'idea: question shows as a thread under the idea');

  // ── 9. reload: everything persists ──
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.nh-root').first().waitFor({ state: 'visible' });
  await role('Employee');
  t = await text();
  check(/Declined/.test(t) && /Q4 at the earliest/.test(t), 'after reload: the no and its note are still there');

  // ── 10. phone: the sheet is a bottom sheet ──
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  // the rail is a drawer on a phone: open it, go to Ideas, open the question sheet
  await page.locator('.nh-burger').click();
  await page.waitForTimeout(300);
  await clickText('Ideas', 0);
  await page.waitForTimeout(300);
  await clickText('Ask a question');
  const box = await sheet().boundingBox();
  check(box && Math.abs((box.y + box.height) - 812) < 4 && box.x < 2, 'at 375px the sheet sits at the bottom edge, full width');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check(!(await sheet().isVisible()), 'Escape closes the sheet');

  check(errors.length === 0, errors.length ? 'JS errors: ' + errors.slice(0, 3).join(' | ') : 'no JS errors during the flow');

  await browser.close();
  console.log('');
  if (problems.length) { console.log('FLOW FAILED — ' + problems.length + ' problem(s)'); process.exit(1); }
  console.log('FLOW PASSED');
})().catch(e => { console.error('flow test crashed:', e); process.exit(1); });
