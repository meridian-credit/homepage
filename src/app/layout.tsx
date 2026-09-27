import { toSafeJsonLd } from "@/lib/json-ld";
import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
/* 본문 Pretendard · 제목 Wanted Sans. 방문자 컴퓨터에 폰트가 깔려 있는지와 무관하게
   같은 화면이 나오게 직접 싣는다. next/font 로는 unicode-range 별 쪼개기를 못 쓴다.
   - site-fonts: 사이트 글자만 남긴 조각(scripts/fonts/subset.mjs 가 빌드 때 만든다).
     페이지마다 실제로 받는 폰트가 이것뿐이다.
   - 원래 92조각: 사이트에 없는 글자(검색어 · 문의 입력)가 들어올 때만 받는다.
   CSS 에서 import 해야 Next 가 파일마다 해시 이름을 붙여 불변 캐시로 싣는다. */
import "@/fonts/generated/site-fonts.css";
import "@/fonts/pretendard/PretendardVariable.css";
import "@/fonts/wanted/WantedSansVariable.css";
import "./globals.css";
import Header from "@/components/layout/header";
import GlassFilterDefs from "@/components/layout/glass-filter";
import ScrollCue from "@/components/layout/scroll-cue";
import Footer from "@/components/layout/footer";
import SmoothScrollProvider from "@/components/providers/smooth-scroll-provider";
import { siteConfig, insightCategories } from "@/lib/constants";
import { getAllPosts } from "@/lib/posts";
import ScrollToTop from "@/components/layout/scroll-to-top";

/* 워드마크 'Meridian.' 을 찍는 서체(.brand-word, 600 정체만 쓴다).
   이름만 부르고 안 불러오면 방문자 화면에서는 Georgia 로 떨어진다.
   안 쓰는 굵기·이탤릭까지 부르면 그 파일도 첫 화면에 preload 된다. */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: "600",
  style: "normal",
  variable: "--font-serif",
  display: "swap",
});


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2A2A2A",
};

const searchVerification = {
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : {}),
  ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
    ? {
        other: {
          "naver-site-verification":
            process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
        },
      }
    : {}),
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.title} | ${siteConfig.name}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: ["회계사무소", "세무", "감사", "회계", "컨설팅", "서울"],
  authors: [{ name: siteConfig.founder }],
  ...(Object.keys(searchVerification).length > 0
    ? { verification: searchVerification }
    : {}),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${siteConfig.title} | ${siteConfig.name}`,
    description: siteConfig.description,
    type: "website",
    locale: "ko_KR",
    siteName: siteConfig.name,
    images: [{ url: "/home-hero-poster.jpg", alt: "Meridian 세무·회계 자문" }],
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home-hero-poster.jpg"],
    title: `${siteConfig.title} | ${siteConfig.name}`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: siteConfig.name,
  alternateName: siteConfig.title,
  url: siteConfig.url,
  description: siteConfig.description,
  email: siteConfig.email,
  /* 국제 표기. 02-… 앞의 0 을 국가 번호로 바꾼다. */
  telephone: siteConfig.tel.replace(/^0/, "+82-"),
  address: { "@type": "PostalAddress", ...siteConfig.postalAddress },
  areaServed: "KR",
  inLanguage: "ko-KR",
  founder: {
    "@type": "Person",
    name: siteConfig.founder,
  },
  logo: new URL("/images/logo.png", siteConfig.url).toString(),
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  inLanguage: "ko-KR",
  publisher: {
    "@type": "Organization",
    name: siteConfig.name,
  },
};

/* 글이 한 편도 없는 블로그 갈래의 메뉴 주소. 메뉴는 이걸 빼고 그린다.
   빌드 때 한 번 센다 — 글은 content/posts 에 있고 배포마다 다시 만든다. */
function emptyInsightLinks() {
  const posts = getAllPosts();
  return insightCategories
    .filter((c) => c.match.length > 0 && !posts.some((p) => c.match.includes(p.category)))
    .map((c) => `/blog?cat=${c.slug}`);
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme="light" className={cormorant.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toSafeJsonLd(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toSafeJsonLd(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        {/* 새로고침하면 맨 위에서 시작한다. */}
        <ScrollToTop />
        {/* 헤더 유리가 뒤를 휘게 하는 필터. 화면에 안 보이지만 이게 있어야 굴절이 돈다. */}
        <GlassFilterDefs />
        <SmoothScrollProvider>
          <Header hiddenNav={emptyInsightLinks()} />
          <a href="#main-content" className="skip-link">본문 바로가기</a>
          <main id="main-content" tabIndex={-1} className="flex-1 pt-20">{children}</main>
          <Footer />
        </SmoothScrollProvider>
        <ScrollCue />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
