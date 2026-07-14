import { expect, test } from "playwright/test";

import { E2E } from "./e2e.constants.js";

test("public availability and dashboard login do not overflow a 390px viewport", async ({
  page,
}) => {
  for (const url of [
    `${E2E.frontendUrl}/spaces`,
    `${E2E.dashboardUrl}/login`,
  ]) {
    await page.goto(url);
    const dimensions = await page.evaluate(() => ({
      viewport: (
        globalThis as unknown as {
          document: { documentElement: { clientWidth: number } };
        }
      ).document.documentElement.clientWidth,
      document: (
        globalThis as unknown as {
          document: { documentElement: { scrollWidth: number } };
        }
      ).document.documentElement.scrollWidth,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  }
});
