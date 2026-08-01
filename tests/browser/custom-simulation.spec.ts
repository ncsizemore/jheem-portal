import { expect, test, type Page } from '@playwright/test';

interface CustomSimulationRequest {
  action: 'lookup' | 'launch';
  modelId: string;
  location: string;
  parameters: Record<string, number>;
}

async function captureCustomSimulationRequests(page: Page) {
  const requests: CustomSimulationRequest[] = [];
  await page.route('**/api/custom-sim', async (route) => {
    requests.push(route.request().postDataJSON() as CustomSimulationRequest);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'not_found' }),
    });
  });
  return requests;
}

test('a shared custom-simulation link is lookup-only and restores exact inputs', async ({ page }) => {
  const requests = await captureCustomSimulationRequests(page);

  await page.goto('/ryan-white/custom?loc=C.12580&a=1&o=2&r=3');

  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toEqual({
    action: 'lookup',
    modelId: 'ryan-white',
    location: 'C.12580',
    parameters: { adap_loss: 1, oahs_loss: 2, other_loss: 3 },
  });

  await expect(page.getByLabel('1 Location')).toHaveValue('C.12580');
  await expect(page.getByLabel('ADAP suppression loss')).toHaveValue('1');
  await expect(page.getByLabel('OAHS suppression loss')).toHaveValue('2');
  await expect(page.getByLabel('Other suppression loss')).toHaveValue('3');
  await expect(page.getByLabel('ADAP suppression loss')).toHaveAttribute('step', '1');

  const origin = new URL(page.url()).origin;
  await expect(page.getByLabel('Shareable link to this configuration')).toHaveValue(
    `${origin}/ryan-white/custom?loc=C.12580&a=1&o=2&r=3`,
  );

  await page.getByLabel('ADAP suppression loss').fill('4');
  await expect(page).toHaveURL(`${origin}/ryan-white/custom?loc=C.12580&a=4&o=2&r=3`);
  await expect(page.getByLabel('Shareable link to this configuration')).toHaveValue(
    `${origin}/ryan-white/custom?loc=C.12580&a=4&o=2&r=3`,
  );
  expect(requests).toHaveLength(1);
});

test('the Run Simulation button is the only path that requests a launch', async ({ page }) => {
  const requests: CustomSimulationRequest[] = [];
  await page.route('**/api/custom-sim', async (route) => {
    requests.push(route.request().postDataJSON() as CustomSimulationRequest);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'triggered',
        scenarioKey: 't2026-a50-o30-r40',
        requestId: 'v1:ryan-white:C.12580:t2026-a50-o30-r40',
        dataUrl: 'https://example.invalid/result.json',
        runId: 12345,
      }),
    });
  });
  await page.route('**/api/custom-sim/status?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'running', phase: 'queued', label: 'Waiting to start...' }),
    });
  });

  await page.goto('/ryan-white/custom');
  expect(requests).toHaveLength(0);

  await page.getByLabel('1 Location').selectOption('C.12580');
  const runButton = page.getByRole('button', { name: 'Run Simulation', exact: true });
  await expect(runButton).toBeEnabled();
  expect(requests).toHaveLength(0);

  await runButton.click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toEqual({
    action: 'launch',
    modelId: 'ryan-white',
    location: 'C.12580',
    parameters: { adap_loss: 50, oahs_loss: 30, other_loss: 40 },
  });
  await expect(page.getByText('Waiting to start...', { exact: true })).toBeVisible();
});

test('an unknown shared-link location cannot trigger lookup or launch', async ({ page }) => {
  const requests = await captureCustomSimulationRequests(page);

  await page.goto('/ryan-white/custom?loc=NOT-A-CITY&a=1&o=2&r=3');

  const origin = new URL(page.url()).origin;
  await expect(page.getByLabel('1 Location')).toHaveValue('');
  await expect(page.getByLabel('Shareable link to this configuration')).toHaveValue(
    `${origin}/ryan-white/custom?a=1&o=2&r=3`,
  );
  await expect(page.getByRole('button', { name: 'Run Simulation', exact: true })).toBeDisabled();
  expect(requests).toHaveLength(0);
});
