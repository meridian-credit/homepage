import { services } from "./data";

/* 서비스를 나누는 기준. 원본은 여기 하나다.
 *
 * 「정기 / 사안별」로 갈라 놓았는데 실제 업무 성격과 맞지 않았다.
 * 세무자문 · 회계감사 · 회계자문 · 재무자문 네 갈래로 다시 나눈다
 * (첨삭 #7 #29). 메뉴·목록·이동 띠가 전부 이 배열을 본다.
 *
 * 여기 없는 tax-advisory 는 세무자문 분류 페이지다. 목록에는 안 서지만
 * 주소는 검색 순위 때문에 그대로 살려 둔다. */
export const serviceGroups: Array<{ title: string; slugs: string[] }> = [
  {
    title: "세무자문",
    slugs: ["tax-bookkeeping", "tax-adjustment", "payroll-outsourcing"],
  },
  {
    title: "회계감사",
    slugs: ["audit-advisory"],
  },
  {
    title: "회계자문",
    slugs: ["pa", "ipo-advisory"],
  },
  {
    title: "재무자문",
    slugs: ["transaction-advisory", "valuation"],
  },
];

/* 네 갈래가 데리고 있는 한 줄 설명. 홈과 서비스 전체가 같이 쓴다. */
export const groupBlurbs: Record<string, string> = {
  세무자문: "기장, 신고, 세무조정과 경리 업무를 지원합니다.",
  회계감사: "재무제표를 감사하고 독립된 감사의견을 제시합니다.",
  회계자문: "결산 · 재무제표 작성과 상장 준비 회계업무를 지원합니다.",
  재무자문: "투자 검토와 재무보고에 필요한 실사와 평가를 지원합니다.",
};

/* 묶음 순서대로 편 여덟 개. 목록과 띠는 이 순서로 선다. */
export const orderedServices = serviceGroups.flatMap((g) =>
  g.slugs.map((slug) => {
    const found = services.find((x) => x.slug === slug);
    if (!found) throw new Error(`serviceGroups 에 없는 서비스: ${slug}`);
    return found;
  })
);

export const siteConfig = {
  name: "메리디안 택스 어드바이저리",
  title: "MERIDIAN",
  tagline: "좋은 장부가, 좋은 결정을 만듭니다.",
  description:
    "단순 신고 대행이 아닌 세무 관리. 매일의 장부에서 신고와 자문까지, 한 사람이 끝까지 책임지는 부티크 세무·재무 자문.",
  url: "https://www.meridianco.kr",
  email: "mscpa@dscpa.co.kr",
  kakaoChannelUrl: "https://pf.kakao.com/_xcAyvn",
  location: "Seoul · Online Meeting",
  /* 하단에 실제 사업장 주소를 적는다(첨삭 #39). 도로명 두 줄.
     location 은 「어디서 만나나」라 자리가 다르다 — 그대로 둔다. */
  address: ["서울시 강서구 마곡중앙로 171", "프라이빗타워Ⅱ 1210호"],
  /* 같은 주소를 검색엔진용 칸(schema.org PostalAddress)으로 나눈 것. 주소가 바뀌면 둘 다 고친다.
     우편번호는 확인한 값이 없어 적지 않는다. */
  postalAddress: {
    streetAddress: "마곡중앙로 171, 프라이빗타워Ⅱ 1210호",
    addressLocality: "강서구",
    addressRegion: "서울특별시",
    addressCountry: "KR",
  },
  tel: "02-6953-2820",
  founder: "박민상 회계사",
  affiliation:
    "박민상 공인회계사는 동성회계법인 소속이며, 본 사이트는 자문 · 인사이트 활동을 소개하기 위한 개인 브랜드 공간입니다. 회계감사 · 세무 기장 · 세무 조정 · 세무 신고 등 법정 업무는 모두 동성회계법인 명의로 정식 수행됩니다.",
  clientPortalUrl: "https://hometax-dashboard.vercel.app",
  pricingUrl: "/pricing",
};

/**
 * Image credits — CC BY/CC BY-SA 사진의 attribution.
 * 사진을 다시 추가할 때 채워주세요.
 */
export const imageCredits: Array<{
  title: string;
  photographer: string;
  license: string;
  source: string;
  sourceUrl: string;
}> = [];

/* ─────────────────────────────────────────────────────────────
   글 갈래.

   실제 글은 여섯 갈래인데 뒤 둘이 3편·1편뿐이라 목록에서 한 줄을 차지할
   값을 못 한다. 「세무일반」이 그 셋을 데리고 간다.
   메뉴와 /blog 의 거르는 단추가 이 표 하나를 같이 본다.
   ───────────────────────────────────────────────────────────── */
export const insightCategories = [
  { slug: "all", label: "전체", match: [] as string[] },
  { slug: "corporate", label: "법인세", match: ["법인세"] },
  { slug: "vat", label: "부가가치세", match: ["부가가치세"] },
  { slug: "income", label: "소득세", match: ["소득세"] },
  {
    slug: "general",
    label: "세무일반",
    match: ["세무일반", "원천세·4대보험", "상속·증여세", "기타"],
  },
  /* 실제로 한 일을 적는 자리. 해설 글과 읽는 목적이 다르다 —
     의뢰 배경 → 주요 검토 → 작성 자료 → 정리 결과 순으로 쓴다.
     글 머리말에 category: 업무경험 과 services: [세부 업무 주소] 를 적으면
     여기와 그 서비스 상세 아래에 같이 선다. */
  { slug: "case", label: "업무경험", match: ["업무경험", "업무 경험"] },
];

/* ─────────────────────────────────────────────────────────────
   상단 메뉴.

   일곱 칸이다. HOME 과 CONTACT 는 없앴다 — 왼쪽 로고가 이미 홈으로 가고,
   오른쪽 파란 버튼이 이미 문의로 간다. 한 줄에 같은 목적지를 두 번 두지
   않는다.

   앞에서부터 「누구냐 → 뭘 하냐 → 누가 하냐 → 누구를 돕냐 → 뭘 아냐 →
   무엇을 묻냐 → 어떻게 보여주냐」 순서다. 수임료(/pricing)는 지금 메뉴에 없다.
   열지 말지는 docs/IA_V2.md §7 에서 정한다. 자세한 근거도 그 문서에 있다.
   ───────────────────────────────────────────────────────────── */
export interface NavItem {
  href: string;
  label: string;
  hint?: string;
}

export interface NavColumn {
  title: string;
  items: NavItem[];
}

export interface NavEntry {
  href: string;
  label: string;
  /* 드롭다운 패널 위에 얹는 영어 눈금. 상단 줄은 한글로만 읽힌다. */
  eyebrow: string;
  items?: NavItem[];
  columns?: NavColumn[];
}

export const navMenu: NavEntry[] = [
  /* ABOUT 은 원페이지다. 앵커뿐이라 펼침판을 둘 게 없다 —
     칸 하나로 두고 눌러서 바로 간다. */
  { href: "/about", label: "ABOUT", eyebrow: "About" },
  {
    href: "/services",
    label: "SERVICE",
    eyebrow: "Service",
    /* 매달 돌아오는 일과 결정할 때만 있는 일은 사는 이유가 다르다.
       한 줄로 여섯 개를 세우면 그 차이가 안 보인다. */
    /* 메뉴도 같은 배열에서 나온다. 손으로 적어 두면 서비스가 하나
       늘었을 때 메뉴만 그대로 남는다. */
    columns: serviceGroups.map((g) => ({
      title: g.title,
      items: g.slugs.map((slug) => {
        const svc = orderedServices.find((x) => x.slug === slug)!;
        return { href: `/services/${slug}`, label: svc.title };
      }),
    })),
  },
  { href: "/members", label: "PEOPLE", eyebrow: "People" },
  { href: "/clients", label: "FOR WHO", eyebrow: "For Who" },
  {
    /* 메뉴 이름만 INSIGHTS → BLOG 로 바꾼다. 주소는 원래부터 /blog 였고
       검색 순위 때문에 건드리지 않는다.
       「자주 묻는 질문」은 화면 안 탭으로만 있어서 메뉴에서 바로 갈 수가
       없었다. 갈래들과 같은 줄에 한 칸으로 세운다. */
    href: "/blog",
    label: "BLOG",
    eyebrow: "Blog",
    items: insightCategories.map((c) => ({
      href: c.slug === "all" ? "/blog" : `/blog?cat=${c.slug}`,
      label: c.label,
    })),
  },
  /* 자주 묻는 질문. 글 모음 안의 탭이 아니라 제 쪽이다 — 목록을 지나야
     문답에 닿았고, 둘이 같은 것처럼 읽혔다. /blog 은 그대로 두고 /faq 를
     새로 판다. 없던 주소를 더하는 것이라 순위에서 잃는 게 없다. */
  { href: "/faq", label: "FAQ", eyebrow: "FAQ" },
  { href: "/portal", label: "DASHBOARD", eyebrow: "Portal" },
];

/* 예전 이름. 푸터와 검색이 아직 평면 목록을 쓴다. */
export const navLinks = navMenu.map(({ href, label }) => ({ href, label }));

/* ─────────────────────────────────────────────────────────────
   사람이 도착할 수 있는 모든 페이지.

   사이트 안 검색(/api/search)이 이걸 본다.
   /pricing 과 /preview 는 일부러 뺀다 — 둘 다 검색엔진에 내보내지 않는 페이지라
   (자기 metadata 가 noindex, /preview 는 robots.ts 도 막는다) 사이트 안 검색에만
   나오면 앞뒤가 안 맞는다.
   ───────────────────────────────────────────────────────────── */
export const sitePages: Array<{ href: string; label: string; hint: string; terms?: string }> = [
  { href: "/", label: "홈", hint: "메리디안" },
  { href: "/about", label: "회사 소개", hint: "메리디안" },
  { href: "/members", label: "회계사 소개", hint: "박민상 회계사" },
  { href: "/services", label: "서비스", hint: "네 갈래 · 여덟 가지" },
  { href: "/clients", label: "고객사", hint: "대표의 단계별" },
  { href: "/blog", label: "BLOG", hint: "세무·회계 실무 글" },
  { href: "/faq", label: "자주 묻는 질문", hint: "상담 전에 자주 나오는 것", terms: "비용 수임료 보수 회신 기장 이관 준비 서류" },
  { href: "/portal", label: "대시보드", hint: "고객 전용 화면" },
  /* terms 는 화면에 안 보이고 검색에만 쓰는 말이다. 연락처를 찾는 사람은 「전화번호」·「주소」로
     검색하는데, 그 말이 어디에도 없어 결과가 비었다. */
  { href: "/contact", label: "문의", hint: "상담 신청", terms: "연락처 전화번호 이메일 메일 주소 카카오톡 오시는 길" },
  { href: "/privacy", label: "개인정보 처리방침", hint: "문의 양식으로 받는 정보" },
];


/* ─────────────────────────────────────────────────────────────
   이번 분기 주요 일정.

   D-day 는 적어 두지 않는다. 하루만 지나도 틀린 숫자가 화면에 남는다.
   날짜만 두고 남은 날은 볼 때마다 센다.
   홈의 팝업과 헤더의 큐브가 이 목록 하나를 같이 본다.
   ───────────────────────────────────────────────────────────── */
export { scheduleDates } from "./schedule";
