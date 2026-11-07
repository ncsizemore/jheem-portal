import { expect, test } from "@playwright/test";
import {
  ajphStateLevelConfig,
  croiStateLevelConfig,
  cdcTestingConfig,
} from "../../src/config/model-configs";
import {
  resultBindings,
  routeResultArtifacts,
  stateResultArtifacts,
} from "./result-data-fixtures";

const studies = [
  {
    config: ajphStateLevelConfig,
    page: "/ryan-white-state-level",
    result: "/ryan-white-state-level/explorer/ajph",
    form: "Explore 11-state results",
    location: "AL",
    locationName: "Alabama",
    nav: "Ryan White: State-Level navigation",
    heading: "What would losing Ryan White services mean for your state?",
  },
  {
    config: croiStateLevelConfig,
    page: "/ryan-white-state-level",
    result: "/ryan-white-state-level/explorer/croi",
    form: "Explore 30-state results",
    location: "MD",
    locationName: "Maryland",
    nav: "Ryan White: State-Level navigation",
    heading: "What would losing Ryan White services mean for your state?",
  },
  {
    config: cdcTestingConfig,
    page: "/cdc-testing",
    result: "/cdc-testing/explorer",
    form: "Explore CDC testing results",
    location: "AL",
    locationName: "Alabama",
    nav: "CDC Testing navigation",
    heading: "What happens if funding for HIV testing stops?",
  },
];

test.beforeEach(async ({ page }) => {
  // No production data requests, simulation runs, or external services in this suite.
  await page.route("https://**/*", (route) => route.abort());
});

for (const study of studies) {
  for (const scenario of study.config.scenarios.filter(
    (item) => item.id === "cessation",
  )) {
    test(`${study.config.id} overview hands off ${scenario.id} with unavailable summaries`, async ({
      page,
    }) => {
      const baseUrl = resultBindings[study.config.id].baseUrl;
      await page.route(`${baseUrl}/state-summaries.json`, (route) =>
        route.fulfill({ status: 503, body: "Unavailable" }),
      );
      await routeResultArtifacts(
        page,
        baseUrl,
        await stateResultArtifacts(study.config.id, study.location),
      );
      await page.goto(study.page);
      const form = page.getByRole("form", { name: study.form, exact: true });
      await form
        .getByLabel("State", { exact: true })
        .selectOption(study.location);
      await form
        .getByLabel("Scenario", { exact: true })
        .selectOption(scenario.id);
      await form
        .getByRole("button", { name: "View results", exact: true })
        .click();
      await expect(page).toHaveURL(
        `${study.result}?loc=${study.location}&scenario=${scenario.id}`,
      );
      await expect(page.getByTestId("analysis-chart-region")).toHaveAttribute(
        "aria-busy",
        "false",
      );
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        study.locationName,
      );
      await expect(
        page.getByRole("button", { name: scenario.label, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      const nav = page.getByRole("navigation", {
        name: study.nav,
        exact: true,
      });
      await nav
        .getByRole("link", { name: "Study overview", exact: true })
        .click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        study.heading,
      );
      await expect(
        nav.getByRole("link", { name: "Study overview", exact: true }),
      ).toHaveAttribute("aria-current", "page");
    });
  }

  test(`${study.config.id} overview has correct coverage and a native form without JavaScript`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL,
    });
    const page = await context.newPage();
    await page.route("https://**/*", (route) => route.abort());
    await page.goto(study.page);
    const form = page.getByRole("form", { name: study.form, exact: true });
    await expect(
      form.getByLabel("State", { exact: true }).locator("option"),
    ).toHaveCount(study.config.locations.length + 1);
    expect(
      await form
        .getByLabel("State", { exact: true })
        .locator("option")
        .evaluateAll((options) =>
          options
            .map((option) => (option as HTMLOptionElement).value)
            .filter(Boolean)
            .sort(),
        ),
    ).toEqual([...study.config.locations].sort());
    await expect(
      form.getByLabel("Scenario", { exact: true }).locator("option"),
    ).toHaveCount(study.config.scenarios.length);
    await form
      .getByRole("button", { name: "View results", exact: true })
      .click();
    await expect(page).toHaveURL(study.page);
    await expect(form.getByLabel("State", { exact: true })).toBeFocused();
    await page
      .getByText(`View all ${study.config.locations.length} states`, {
        exact: true,
      })
      .click();
    const coverage = page.locator("details[open]");
    await expect(coverage.getByRole("link")).toHaveCount(
      study.config.locations.length,
    );
    await expect(
      coverage.getByRole("link", { name: study.locationName, exact: true }),
    ).toHaveAttribute(
      "href",
      `${study.result}?loc=${study.location}&scenario=cessation`,
    );
    // Observe the real native GET, without depending on the JS-only result viewer.
    await page.route(`**${study.result}?*`, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<h1>Result request received</h1>",
      }),
    );
    for (const scenario of study.config.scenarios) {
      await page.goto(study.page);
      await form
        .getByLabel("State", { exact: true })
        .selectOption(study.location);
      await form
        .getByLabel("Scenario", { exact: true })
        .selectOption(scenario.id);
      await form
        .getByRole("button", { name: "View results", exact: true })
        .click();
      await expect(page).toHaveURL(
        `${study.result}?loc=${study.location}&scenario=${scenario.id}`,
      );
    }
    await context.close();
  });
}

for (const study of [studies[0], studies[2]]) {
  test(`${study.page} overview fits desktop and narrow screens and exposes citation fallback`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(study.page);
    await page.evaluate(() => document.fonts.ready);
    const slug = study.config.id;
    await page.screenshot({
      path: testInfo.outputPath(`${slug}-desktop.png`),
      fullPage: true,
    });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const nav = page.getByRole("navigation", {
        name: study.nav,
        exact: true,
      });
      expect(
        await nav.evaluate(
          (node) =>
            node.firstElementChild!.scrollWidth <=
            node.firstElementChild!.clientWidth,
        ),
      ).toBe(true);
      await expect(
        nav.getByRole("link", { name: "Study overview", exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`${slug}-${width}.png`),
        fullPage: true,
      });
    }
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: () => Promise.reject(new Error("Clipboard unavailable")),
        },
        configurable: true,
      });
    });
    await page
      .getByRole("button", { name: "Copy citation", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Select and copy the citation below.",
    );
    await expect(page.locator("#publication .select-all")).toContainText(
      study.config.id === "cdc-testing" ? "82(4):e746–e754" : "116(5):732–735",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("state findings and presentation identify their respective studies", async ({
  page,
}) => {
  await page.goto("/ryan-white-state-level");
  await expect(page.locator("#findings")).toContainText(
    "Findings from the 11-state publication",
  );
  await expect(page.locator("#findings")).toContainText(
    "The 30-state CROI study uses different dates and assumptions",
  );
  await expect(
    page.getByRole("heading", { name: "The 30-state study at CROI 2026" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "11-state model fit" }),
  ).toHaveAttribute("href", "/ryan-white-state-level/calibration?model=ajph");
  await expect(
    page.getByRole("link", { name: "30-state model fit" }),
  ).toHaveAttribute("href", "/ryan-white-state-level/calibration?model=croi");
});
