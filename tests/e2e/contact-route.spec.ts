import { test, expect, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { siteConfig } from '../../src/lib/constants';

/* 문의 API 를 가짜 SES 앞에 세운 진짜 라우트로 확인한다. 다른 문의 테스트는 page.route 로 응답을
   지어내므로, 발송이 실패해도 200 을 주던 결함을 잡지 못했다.
   서버는 여기서 따로 띄운다. 공용 :3100 서버나 QA_BASE_URL 이 진짜 설정을 갖고 있으면 시험 문의가
   실제 메일함으로 가기 때문이다. 이 서버는 셸의 AWS_* 를 모두 지우고 가짜 키를 받으며, SES 주소
   (AWS_ENDPOINT_URL_SESV2)는 아래 가짜 SES 만 가리킨다. 주소 설정이 무시되더라도 가짜 키라 진짜 SES 는
   거절한다. */

const TO = 'inbox@example.test';
const FROM = 'no-reply@example.test';
const KEY_ID = 'AKIAFAKEFAKEFAKEFAKE';
let sesMode: 'ok' | 'error' | 'down' = 'ok';
const received: Array<Record<string, unknown>> = [];
let fakeSes: http.Server | undefined;
let app: ChildProcess | undefined;
let appLog = '';
let base = '';
let requestCount = 0;

async function freePort() {
  const server = net.createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as net.AddressInfo;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test.describe.configure({ mode: 'default' });

test.beforeAll(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '서버 쪽 검사라 한 프로젝트면 된다');

  // SES v2 SendEmail 은 POST /v2/email/outbound-emails 이고, 오류 종류는 x-amzn-ErrorType 헤더로 온다.
  fakeSes = http.createServer((request, response) => {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      if (sesMode === 'down') {
        request.socket.destroy();
        return;
      }
      received.push({ path: request.url, authorization: request.headers.authorization, ...JSON.parse(body) });
      if (sesMode === 'ok') {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ MessageId: `fake-${received.length}` }));
        return;
      }
      response.writeHead(400, { 'Content-Type': 'application/json', 'x-amzn-ErrorType': 'MessageRejected' });
      response.end(JSON.stringify({ message: `Email address is not verified: ${FROM}` }));
    });
  });
  await new Promise<void>(resolve => fakeSes!.listen(0, '127.0.0.1', resolve));
  const sesPort = (fakeSes.address() as net.AddressInfo).port;

  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: path.join(__dirname, '..', '..'),
    env: {
      ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('AWS_'))),
      NODE_ENV: 'production',
      AWS_ENDPOINT_URL_SESV2: `http://127.0.0.1:${sesPort}`,
      AWS_ACCESS_KEY_ID: KEY_ID,
      AWS_SECRET_ACCESS_KEY: 'fake-secret',
      CONTACT_FROM_EMAIL: FROM,
      CONTACT_TO_EMAIL: TO,
      CONTACT_ALLOWED_ORIGINS: base,
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
      CONTACT_RATE_LIMIT_REQUIRE_SHARED: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  app.stdout?.on('data', chunk => { appLog += chunk; });
  app.stderr?.on('data', chunk => { appLog += chunk; });

  const deadline = Date.now() + 20_000;
  while (true) {
    if (app.exitCode !== null) throw new Error(`next start 가 끝났다 (${app.exitCode}). 먼저 npm run build 했는지 확인한다.\n${appLog}`);
    const ready = await fetch(`${base}/api/contact`, { method: 'OPTIONS' }).then(r => r.status === 204, () => false);
    if (ready) break;
    if (Date.now() > deadline) throw new Error(`next start 가 20초 안에 뜨지 않았다.\n${appLog}`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
});

test.afterAll(async () => {
  app?.kill();
  await new Promise(resolve => fakeSes ? fakeSes.close(resolve) : resolve(undefined));
});

/* 요청마다 다른 IP·주소로 보내 메모리 속도 제한(10분에 5건)에 걸리지 않게 한다. */
function inquiry(overrides: Record<string, unknown> = {}) {
  requestCount += 1;
  return {
    headers: { 'X-Forwarded-For': `203.0.113.${requestCount}` },
    data: { name: '시험', email: `route-${requestCount}@example.com`, message: '실제 라우트 시험', elapsedMs: 5000, ...overrides },
  };
}

async function fillForm(page: Page, email: string) {
  await page.goto(`${base}/contact`);
  await page.getByLabel('이름', { exact: false }).fill('시험');
  await page.getByLabel('이메일', { exact: false }).fill(email);
  await page.getByLabel('현재 상황').fill('실제 라우트 시험');
  // 사람보다 빠른 제출(900ms 미만)은 서버가 막는다.
  await page.waitForFunction(() => performance.now() > 1000);
}

test('a sent inquiry is acknowledged and goes to CONTACT_TO_EMAIL', async ({ page }) => {
  sesMode = 'ok';
  const email = 'route-browser-ok@example.com';
  await fillForm(page, email);
  await page.getByRole('button', { name: '문의 보내기' }).click();
  await expect(page.getByRole('heading', { name: '문의가 접수되었습니다' })).toBeVisible();
  const sent = received.at(-1)!;
  expect(sent).toMatchObject({
    path: '/v2/email/outbound-emails',
    Destination: { ToAddresses: [TO] },
    ReplyToAddresses: [email],
    Content: { Simple: { Subject: { Data: '[홈페이지 문의] 시험', Charset: 'UTF-8' } } },
  });
  // 셸의 키가 아니라 서버에 준 키로, 서울 리전 SES 에 서명했다.
  expect(sent.authorization).toMatch(new RegExp(`^AWS4-HMAC-SHA256 Credential=${KEY_ID}/\\d{8}/ap-northeast-2/ses/aws4_request`));
  // 한글 표시 이름은 RFC 2047 encoded-word 로 간다.
  const from = String(sent.FromEmailAddress).match(/^=\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?= <(.+)>$/);
  expect(from && Buffer.from(from[1], 'base64').toString()).toBe(siteConfig.name);
  expect(from?.[2]).toBe(FROM);
});

test('a send SES rejects is reported to the visitor, not acknowledged', async ({ page }) => {
  sesMode = 'error';
  const email = 'route-browser-error@example.com';
  await fillForm(page, email);
  const response = page.waitForResponse(`${base}/api/contact`);
  await page.getByRole('button', { name: '문의 보내기' }).click();
  expect((await response).status()).toBe(502);
  await expect(page.locator('form [role=alert]')).toContainText('메일 전송에 실패했습니다');
  await expect(page.getByLabel('현재 상황')).toHaveValue('실제 라우트 시험');
  // 로그에는 오류 이름만 남고, 보낸 사람의 주소나 내용은 남지 않는다.
  await expect.poll(() => appLog).toContain('MessageRejected');
  expect(appLog).not.toContain(email);
  expect(appLog).not.toContain('실제 라우트 시험');
});

test('an unreachable SES is a failure too', async ({ request }) => {
  sesMode = 'down';
  const response = await request.post(`${base}/api/contact`, inquiry());
  expect(response.status()).toBe(502);
});

test('the speed check uses the time the browser measured', async ({ request }) => {
  sesMode = 'ok';
  const sentBefore = received.length;
  expect((await request.post(`${base}/api/contact`, inquiry({ elapsedMs: 300 }))).status()).toBe(400);
  expect((await request.post(`${base}/api/contact`, inquiry({ elapsedMs: undefined }))).status()).toBe(400);
  expect(received.length).toBe(sentBefore);
  // 기기 시계가 서버와 어긋나도 상관없다. 경과 시간만 본다.
  expect((await request.post(`${base}/api/contact`, inquiry({ elapsedMs: 60_000 }))).status()).toBe(200);
});
