import { defineConfig, devices } from "@playwright/test";
import { ADMIN, CONTENT_DB, DIR, ENV, PUBLIC } from "./tests/e2e-env";

/* 관리자 앱 시험. 두 앱을 먼저 빌드해 둔다: npm run build && npx next build admin
     npx playwright test -c admin/playwright.config.ts
   관리자와, 같은 DB 를 읽는 공개 사이트를 따로 띄운다. DB 는 매번 새로 만든다.
   공개 사이트는 저장 반영 때 쪽을 새로 그려 .next 에 덮어쓴다. 그래서 이 시험 뒤의 .next 에는 시험용 FAQ 가
   남는다 — 공개 시험(tests/e2e)은 이보다 먼저 돌리거나, 이 시험 뒤에 다시 빌드하고 돌린다. */
export default defineConfig({
  testDir: "./tests",
  outputDir: "./.e2e/results",
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: { ...devices["Desktop Chrome"], trace: "retain-on-failure" },
  webServer: [
    {
      command: `rm -rf "${DIR}" && mkdir -p "${DIR}" && npx next start admin -p 3310`,
      cwd: "..",
      url: `${ADMIN}/api/health`,
      env: ENV,
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      /* 포트는 PORT 로 준다. 공개 사이트가 뜬 뒤 자기 /api/revalidate 를 부를 때 이 값을 쓴다(src/instrumentation.ts). */
      command: "npx next start",
      cwd: "..",
      url: PUBLIC,
      env: { CONTENT_DB, REVALIDATE_SECRET: ENV.REVALIDATE_SECRET, PORT: "3210" },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
