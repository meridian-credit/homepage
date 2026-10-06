import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const scriptSrc = [
  "script-src 'self' 'unsafe-inline'",
  "https://va.vercel-scripts.com",
  isDev ? "'unsafe-eval'" : "",
]
  .filter(Boolean)
  .join(" ");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self'",
  "frame-src 'none'",
  "child-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  scriptSrc,
  "script-src-attr 'none'",
  "connect-src 'self' https://vitals.vercel-insights.com https://*.vercel-insights.com",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "meridianco.kr" }],
        destination: "https://www.meridianco.kr/:path*",
        permanent: true,
      },
      {
        /* 문답이 /blog 안의 탭이던 시절 주소. 메뉴가 여기로 보냈으니
           남이 받아 둔 링크가 있을 수 있다. 문답은 /faq 로 아주 옮겼으니 영구(308)로 보낸다 —
           임시(307)면 검색엔진이 옛 주소를 계속 붙들고 있는다. */
        source: "/blog",
        has: [{ type: "query", key: "tab", value: "faq" }],
        destination: "/faq",
        permanent: true,
      },
      {
        source: "/practice",
        destination: "/services",
        permanent: true,
      },
      {
        source: "/practice/:path*",
        destination: "/services/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        // **이 규칙이 반드시 먼저 와야 한다.** 아래 와일드카드 규칙도 /contract
        // 하나를 매칭하는데, Vercel은 :path*가 빈 값일 때 목적지를
        // ".../contract/"로 만든다(끝에 슬래시가 남는다). 그러면 계약 앱이
        // 슬래시를 떼려고 /contract로 되돌리고, 그 응답이 다시 여기로 들어와
        // 무한히 돈다. 로컬 next start는 같은 설정에서도 슬래시를 안 남기므로
        // 이 문제는 배포한 뒤에만 드러난다 — 순서를 바꾸지 말 것.
        source: "/contract",
        destination: "https://taxchat-one.vercel.app/contract",
      },
      {
        // 계약 시스템은 별도 Vercel 프로젝트(taxchat)에 있고, 이 주소로만
        // 드러낸다. 앱 자체가 basePath로 /contract 아래에 살기 때문에
        // 경로를 그대로 넘긴다 — 잘라 보내면 앱이 자기 링크를 잘못 만든다.
        source: "/contract/:path*",
        destination: "https://taxchat-one.vercel.app/contract/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        // **/contract 아래는 제외한다.** 여기 헤더는 이 홈페이지를 위한
        // 것이고, 넘겨준 계약 앱은 자기 헤더를 따로 갖고 있다. 둘이 겹치면
        // 브라우저가 더 빡빡한 쪽으로 합쳐서 앱이 조용히 깨진다 — 특히
        // 아래 Permissions-Policy의 camera=()는 프리랜서가 신분증을
        // 촬영하는 기능을 통째로 막는다(계약 앱은 camera=(self)를 쓴다).
        source: "/((?!contract(?:/|$)).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Origin-Agent-Cluster", value: "?1" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Download-Options", value: "noopen" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
      {
        // public/media 는 이름에 버전(v1 …)을 단다. 내용이 바뀌면 이름을 바꾸므로
        // 한 번 받은 파일은 다시 물을 필요가 없다. 기본값(max-age=0)이면 영상·포스터를
        // 페이지마다 다시 확인한다.
        source: "/media/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/preview",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
