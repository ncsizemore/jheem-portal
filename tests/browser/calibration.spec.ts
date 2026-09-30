import { expect, test, type Page } from '@playwright/test';

// Use the immutable public bytes; only CORS is adapted for the test server's alternate port.
const bytes = new Map<string, Promise<Buffer>>();
async function delivery(page: Page, corrupt = false, beforeFulfill?: (url: string) => Promise<void>) {
  const requests: string[] = [];
  await page.route('https://d320iym4dtm9lj.cloudfront.net/calibration/**', async route => {
    const url = route.request().url(); requests.push(url);
    if (!bytes.has(url)) bytes.set(url, (async () => {
      const response = await page.request.get(url);
      expect(response.ok()).toBeTruthy();
      return response.body();
    })());
    const body = await bytes.get(url)!;
    await beforeFulfill?.(url);
    await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:corrupt ? Buffer.concat([body,Buffer.from(' ')]) : body});
  });
  await page.route('**/api/custom-sim**', route => route.abort());
  return requests;
}

test('loads only the selected fit, restores its URL, and distinguishes the city ensemble', async ({ page }) => {
  const requests=await delivery(page);
  await page.goto('/ryan-white/calibration?loc=C.12060&stage=ryan-white');
  await expect(page.getByRole('img',{name:/model fit and observed data/})).toBeVisible();
  await expect(page.getByText('80 posterior simulations',{exact:true})).toBeVisible();
  expect(requests.filter(u=>u.includes('/locations/'))).toHaveLength(1);
  await page.getByLabel('Stratification',{exact:true}).selectOption('age');
  await expect(page.getByLabel('Age group',{exact:true})).toBeVisible();
  await expect(page).toHaveURL(/facet=age/);
  expect(requests.filter(u=>u.includes('/locations/'))).toHaveLength(1);
  await page.getByLabel('Target',{exact:true}).selectOption('rw-non-adap-sex-risk-distribution');
  await expect(page.getByText('This fitting target is not exported', {exact:false})).toBeVisible();
  await expect(page.getByRole('img',{name:/model fit and observed data/})).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('img',{name:/model fit and observed data/})).toBeVisible();
});

test('clears the previous chart while loading and ignores a late response after a stage switch', async ({ page }) => {
  let release!: () => void;
  let started!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const pending = new Promise<void>(resolve => { started = resolve; });
  await delivery(page, false, async url => {
    if (url.endsWith('/locations/C.12060/ehe.json')) { started(); await held; }
  });
  try {
    await page.goto('/ryan-white/calibration?loc=C.12060&stage=ryan-white');
    await expect(page.getByRole('img', { name: /model fit and observed data/ })).toBeVisible();
    await page.getByLabel('Fit stage', { exact: true }).selectOption('ehe');
    await pending;
    await expect(page.getByText('Loading fit for Atlanta-Sandy Springs-Roswell, GA…', { exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: /model fit and observed data/ })).toHaveCount(0);
    await page.getByLabel('Fit stage', { exact: true }).selectOption('ryan-white');
    release();
    await expect(page.getByRole('heading', { name: 'People receiving non-ADAP Ryan White services' })).toBeVisible();
    await expect(page.getByText('80 posterior simulations', { exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: /model fit and observed data/ })).toBeVisible();
  } finally { release(); }
});

test('renders single-year intervals and an accessible table without inventing a time series', async ({ page }) => {
  await delivery(page);
  await page.goto('/ryan-white-state-level/calibration?model=ajph&loc=AL&stage=ryan-white&target=rw-state-adap-suppression');
  await expect(page.getByLabel('Single-year model estimate and intervals')).toBeVisible();
  await page.getByText('View data table', { exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Model', exact: true })).toHaveCount(1);
  await expect(page.getByRole('cell', { name: 'NASTAD ADAP data · AL', exact: true })).toBeVisible();
});

for (const model of ['ajph','croi']) test(`restores ${model} model and stage on a narrow screen`, async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await delivery(page);
  await page.goto(`/ryan-white-state-level/calibration?model=${model}&loc=AL&stage=ehe`);
  await expect(page.getByRole('img',{name:/model fit and observed data/})).toBeVisible();
  await expect(page.getByLabel('Model',{exact:true})).toHaveValue(model);
  await expect(page.getByText('1,000 posterior simulations',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByLabel('Fit stage',{exact:true}).selectOption('ryan-white');
  await expect(page.getByRole('heading',{name:'People receiving non-ADAP Ryan White services'})).toBeVisible();
});

test('does not fetch an unknown location and rejects corrupted metadata', async ({ page }) => {
  const requests=await delivery(page);
  await page.goto('/ryan-white/calibration?loc=UNKNOWN');
  await expect(page.getByRole('alert').filter({hasText:'not included'})).toBeVisible();
  expect(requests.filter(u=>u.includes('/locations/'))).toHaveLength(0);
  await page.unroute('https://d320iym4dtm9lj.cloudfront.net/calibration/**');
  await delivery(page,true);
  await page.goto('/ryan-white/calibration?loc=C.12060');
  await expect(page.getByRole('alert').filter({hasText:'could not be verified'})).toBeVisible();
  await expect(page.getByRole('img',{name:/model fit and observed data/})).toHaveCount(0);
  await page.unroute('https://d320iym4dtm9lj.cloudfront.net/calibration/**');
  await delivery(page);
  await page.getByRole('button',{name:'Retry loading'}).click();
  await expect(page.getByRole('img',{name:/model fit and observed data/})).toBeVisible();
});

test('presents model fit as contextual evidence rather than a primary workflow', async ({ page }) => {
  await page.goto('/ryan-white');
  await expect(page.getByRole('link', { name: 'View model fit' })).toHaveAttribute(
    'href',
    '/ryan-white/calibration',
  );
  await expect(page.locator('header nav').getByRole('link', { name: 'Model fit' })).toHaveCount(0);

  await page.goto('/ryan-white-state-level');
  await expect(page.getByRole('link', { name: 'View model fit' })).toHaveAttribute(
    'href',
    '/ryan-white-state-level/calibration?model=ajph',
  );
  await expect(page.locator('header nav').getByRole('link', { name: 'Model fit' })).toHaveCount(0);
});
