import { NextRequest, NextResponse } from "next/server";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { siteConfig } from "@/lib/constants";

const MAX_BODY_BYTES = 20_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_WINDOW = "10 m";
const RATE_LIMIT_MAX = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SUBMISSION_MS = 900;
const MAX_SUBMISSION_MS = 12 * 60 * 60 * 1000;
const MAX_MESSAGE_URLS = 3;
const ALLOWED_METHODS = "OPTIONS, POST";
const METHOD_HEADERS = {
  Allow: ALLOWED_METHODS,
  "Cache-Control": "no-store",
};
const DIRECT_CONTACT_HINT = `${siteConfig.email}로 직접 보내 주세요.`;
const SEND_FAILED_MESSAGE = `메일 전송에 실패했습니다. 잠시 후 다시 시도하거나 ${DIRECT_CONTACT_HINT}`;
/* 문의 메일은 우리 AWS 계정의 서울 리전 SES 로 보낸다. meridianco.kr 은 이 리전에 인증돼 있다.
   키는 SDK 가 표준 환경 변수(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)에서 읽는다. SDK 기본값에는
   시간 제한이 없어서, SES 가 답하지 않으면 방문자가 끝없이 기다린다. */
const ses = new SESv2Client({
  region: "ap-northeast-2",
  requestHandler: { connectionTimeout: 3_000, requestTimeout: 10_000 },
});
const REQUIRE_SHARED_RATE_LIMIT =
  process.env.CONTACT_RATE_LIMIT_REQUIRE_SHARED === "true";

type RateLimitScope = "ip" | "email";
type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  unavailable?: boolean;
};

const memoryRateLimit = new Map<string, { count: number; resetAt: number }>();
const upstashRedis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;
const upstashLimiters = upstashRedis
  ? {
      ip: new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW),
        prefix: "homepage:contact:ip",
      }),
      email: new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW),
        prefix: "homepage:contact:email",
      }),
    }
  : null;
let lastRateLimitWarningAt = 0;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(
  data: Record<string, unknown>,
  key: string,
  maxLength: number
) {
  const value = data[key];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function readNumber(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === "number" ? value : Number.NaN;
}

function singleLine(value: string) {
  return value.replace(/[\r\n]+/g, " ");
}

function parseAllowedOrigins(value: string | undefined) {
  if (!value) return [];

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .flatMap((origin) => {
      try {
        return [new URL(origin).origin];
      } catch {
        return [];
      }
    });
}

const allowedRequestOrigins = new Set([
  new URL(siteConfig.url).origin,
  ...parseAllowedOrigins(process.env.CONTACT_ALLOWED_ORIGINS),
  ...(process.env.NODE_ENV === "production"
    ? []
    : [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3100",
        "http://127.0.0.1:3100",
      ]),
]);

function isAllowedBrowserRequest(request: NextRequest) {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (
    secFetchSite &&
    !["same-origin", "same-site", "none"].includes(secFetchSite)
  ) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return allowedRequestOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

function getByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

async function readLimitedText(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) return { text: "", tooLarge: false };

  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return { text: "", tooLarge: true };
    }
    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return { text, tooLarge: false };
}

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function summarizeError(error: unknown) {
  const summary: Record<string, string | number | boolean> = {};
  if (error instanceof Error) {
    summary.name = error.name;
  }
  if (isRecord(error)) {
    for (const key of ["name", "code", "status", "statusCode"]) {
      const value = error[key];
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        summary[key] = value;
      }
    }
    // AWS SDK 오류는 HTTP 상태를 $metadata 안에 둔다.
    const metadata = error.$metadata;
    if (isRecord(metadata) && typeof metadata.httpStatusCode === "number") {
      summary.httpStatusCode = metadata.httpStatusCode;
    }
  }
  return Object.keys(summary).length > 0 ? summary : { name: "UnknownError" };
}

function warnRateLimitFallback(error: unknown) {
  const now = Date.now();
  if (now - lastRateLimitWarningAt < 60_000) return;
  lastRateLimitWarningAt = now;
  console.warn("Contact rate limit fallback", summarizeError(error));
}

function logEmailFailure(error: unknown) {
  console.error("Contact email failed", summarizeError(error));
}

function withinMemoryRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  for (const [rateKey, entry] of memoryRateLimit) {
    if (entry.resetAt <= now) memoryRateLimit.delete(rateKey);
  }

  const current = memoryRateLimit.get(key);
  if (!current) {
    memoryRateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    /* 위의 정리는 다음 문의가 와야 돈다. 문의가 드문 사이트라 그 사이 IP·이메일이 몇 시간씩 메모리에
       남았다. 처리방침은 「길어야 20분」이라고 적었으니 창이 끝나면 스스로 지운다. 그사이 같은 키로 새
       창이 열렸으면 그 창은 건드리지 않는다. unref — 이 타이머 때문에 프로세스가 안 끝나면 안 된다. */
    setTimeout(() => {
      const entry = memoryRateLimit.get(key);
      if (entry && entry.resetAt <= Date.now()) memoryRateLimit.delete(key);
    }, RATE_LIMIT_WINDOW_MS).unref?.();
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000)
      ),
    };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

async function withinRateLimit(
  scope: RateLimitScope,
  key: string
): Promise<RateLimitResult> {
  const limiter = upstashLimiters?.[scope];
  if (limiter) {
    try {
      const result = await limiter.limit(key);
      /* Upstash 가 5초 안에 답하지 않으면 라이브러리는 막지 않고 { success: true, reason: "timeout" } 을
         돌려준다. 한도를 확인하지 못한 답이므로 Upstash 오류와 똑같이 다룬다. */
      if (result.reason !== "timeout") {
        return {
          allowed: result.success,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((result.reset - Date.now()) / 1000)
          ),
        };
      }
      warnRateLimitFallback({ name: "RateLimitTimeout" });
    } catch (error) {
      warnRateLimitFallback(error);
    }
  }

  if (REQUIRE_SHARED_RATE_LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: 60,
      unavailable: true,
    };
  }

  return withinMemoryRateLimit(`${scope}:${key}`);
}

function rateLimitError(limit: RateLimitResult) {
  if (limit.unavailable) {
    return jsonError("요청 제한 시스템을 확인 중입니다. 잠시 후 다시 시도해 주세요.", 503, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  return jsonError("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429, {
    "Retry-After": String(limit.retryAfterSeconds),
  });
}

function jsonError(
  message: string,
  status: number,
  headers?: Record<string, string>
) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...headers,
      },
    }
  );
}

function methodNotAllowed() {
  return NextResponse.json(
    { error: "허용되지 않는 메서드입니다." },
    {
      status: 405,
      headers: METHOD_HEADERS,
    }
  );
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: METHOD_HEADERS,
  });
}

export function HEAD() {
  return new Response(null, {
    status: 405,
    headers: METHOD_HEADERS,
  });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;

export async function POST(request: NextRequest) {
  if (!isAllowedBrowserRequest(request)) {
    return jsonError("허용되지 않은 요청입니다.", 403);
  }

  const userAgent = request.headers.get("user-agent")?.trim() ?? "";
  if (!userAgent || userAgent.length > 512) {
    return jsonError("요청 헤더가 올바르지 않습니다.", 400);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError("JSON 형식으로 요청해 주세요.", 415);
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      return jsonError("요청 본문 길이가 올바르지 않습니다.", 400);
    }
    if (contentLength > MAX_BODY_BYTES) {
      return jsonError("문의 내용이 너무 깁니다.", 413);
    }
  }

  const clientKey = getClientKey(request);
  const ipLimit = await withinRateLimit("ip", clientKey);
  if (!ipLimit.allowed) {
    return rateLimitError(ipLimit);
  }

  let rawBody = "";
  try {
    const result = await readLimitedText(request);
    if (result.tooLarge) {
      return jsonError("문의 내용이 너무 깁니다.", 413);
    }
    rawBody = result.text;
  } catch {
    return jsonError("요청 본문을 읽을 수 없습니다.", 400);
  }

  if (getByteLength(rawBody) > MAX_BODY_BYTES) {
    return jsonError("문의 내용이 너무 깁니다.", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonError("JSON 본문을 확인해 주세요.", 400);
  }

  if (!isRecord(body)) {
    return jsonError("요청 본문 형식이 올바르지 않습니다.", 400);
  }

  const honeypot = readString(body, "website", 256);
  if (honeypot) {
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const name = readString(body, "name", 80);
  const email = readString(body, "email", 254).toLowerCase();
  const phone = readString(body, "phone", 40);
  const message = readString(body, "message", 4000);
  /* 폼이 보인 뒤 보낼 때까지 걸린 시간. 브라우저가 자기 단조 시계로 재서 보낸다. 시작 시각을
     받아 서버 시계로 빼면 기기 시계가 몇 분만 어긋나도 음수가 되어 계속 막힌다. */
  const elapsedMs = readNumber(body, "elapsedMs");

  if (!name || !email || !message) {
    return jsonError("필수 항목을 입력해 주세요.", 400);
  }

  if (!EMAIL_PATTERN.test(email)) {
    return jsonError("이메일 형식을 확인해 주세요.", 400);
  }

  if (
    !Number.isFinite(elapsedMs) ||
    elapsedMs < MIN_SUBMISSION_MS ||
    elapsedMs > MAX_SUBMISSION_MS
  ) {
    return jsonError("문의 양식을 새로고침한 뒤 다시 시도해 주세요.", 400);
  }

  const messageUrlCount = message.match(/https?:\/\//gi)?.length ?? 0;
  if (messageUrlCount > MAX_MESSAGE_URLS) {
    return jsonError("문의 내용의 링크 수를 줄여 주세요.", 400);
  }

  const emailLimit = await withinRateLimit("email", email);
  if (!emailLimit.allowed) {
    return rateLimitError(emailLimit);
  }

  /* 보내는 주소(no-reply@meridianco.kr)는 SES 에 인증된 도메인이어야 한다. 이 값이 없으면 보내지 않고
     설정 오류로 답한다. 이 값이 메일을 보내도 되는 서버라는 표시이기도 하다. 개발자 PC 에 AWS 자격 증명이
     있어도, 이 값을 넣지 않은 서버는 메일을 보내지 않는다. */
  const fromEmail = process.env.CONTACT_FROM_EMAIL;
  if (!fromEmail) {
    return jsonError(`메일 전송 설정이 완료되지 않았습니다. ${DIRECT_CONTACT_HINT}`, 500);
  }

  try {
    const text = [
      "새로운 홈페이지 문의가 접수되었습니다.",
      "",
      `이름: ${name}`,
      `이메일: ${email}`,
      `전화번호: ${phone || "-"}`,
      "",
      message,
    ].join("\n");

    const html = `
      <h2>새로운 문의가 접수되었습니다.</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">이름</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(name)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">이메일</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(email)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">전화번호</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(phone || "-")}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">내용</td>
          <td style="padding: 8px; border: 1px solid #ddd; white-space: pre-wrap;">${escapeHtml(message)}</td>
        </tr>
      </table>
    `;

    /* 표시 이름에 한글이 있으면 SES 는 RFC 2047 encoded-word 로 적어 달라고 한다. */
    const fromName = `=?UTF-8?B?${Buffer.from(siteConfig.name).toString("base64")}?=`;
    const { MessageId } = await ses.send(
      new SendEmailCommand({
        FromEmailAddress: `${fromName} <${fromEmail}>`,
        Destination: { ToAddresses: [process.env.CONTACT_TO_EMAIL || siteConfig.email] },
        ReplyToAddresses: [email],
        Content: {
          Simple: {
            Subject: { Data: `[홈페이지 문의] ${singleLine(name)}`, Charset: "UTF-8" },
            Body: {
              Text: { Data: text, Charset: "UTF-8" },
              Html: { Data: html, Charset: "UTF-8" },
            },
          },
        },
      })
    );

    if (!MessageId) {
      logEmailFailure({ name: "MissingMessageId" });
      return jsonError(SEND_FAILED_MESSAGE, 502);
    }

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    /* SES 가 거절하거나(MessageRejected, AccessDenied 등) 닿지 않으면 SDK 가 예외를 던진다. 어느 쪽이든
       메일은 가지 않았으므로 방문자에게 실패로 알린다. */
    logEmailFailure(error);
    return jsonError(SEND_FAILED_MESSAGE, 502);
  }
}
