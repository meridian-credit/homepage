import type { IconName } from "@admin/ui/icons";

/* 관리자가 다루는 콘텐츠 종류. 메뉴, 홈의 「사이트 내용」, 변경 기록의 거르기가 모두 이 목록에서 나온다.
   종류를 더할 때 여기 한 줄을 더한다(나머지 순서는 docs/plans/admin-backend/README.md 의 체크리스트).
   브라우저에서도 읽으므로 서버 전용 코드를 넣지 않는다. */
export type ContentKind = "schedule" | "faq";

export type ContentType = {
  kind: ContentKind;
  label: string;
  /* 「세무 일정을 저장했습니다」 · 「세무 일정이 돌아갑니다」 처럼 문장에 넣을 때. 받침에 맞춘 조사까지. */
  object: string;
  subject: string;
  href: string;
  icon: IconName;
  group: "site";
  /* 「사이트에서 보기」가 여는 공개 쪽. */
  sitePath: string;
  /* 쪽 머리의 설명: 이것이 사이트 어디에 나오는지. */
  appears: string;
};

export const CONTENT_TYPES: ContentType[] = [
  {
    kind: "schedule",
    label: "세무 일정",
    object: "세무 일정을",
    subject: "세무 일정이",
    href: "/schedule",
    icon: "calendar",
    group: "site",
    sitePath: "/portal",
    appears: "사이트 머리글의 일정 큐브와 고객 포털 안내창에 나옵니다. D-day 는 사이트가 그날 날짜로 계산하니 기한만 적으면 됩니다.",
  },
  {
    kind: "faq",
    label: "자주 묻는 질문",
    object: "자주 묻는 질문을",
    subject: "자주 묻는 질문이",
    href: "/faq",
    icon: "faq",
    group: "site",
    sitePath: "/faq",
    appears: "FAQ 페이지와 문의 페이지 아래에 이 순서대로 나옵니다. 구글 · 네이버 검색 결과에 쓰이는 정보도 이 목록으로 만듭니다.",
  },
];

export const NAV_GROUPS = [{ key: "site", label: "사이트 내용" }] as const;

export const contentType = (kind: ContentKind) => CONTENT_TYPES.find((t) => t.kind === kind)!;
export const isContentKind = (value: unknown): value is ContentKind => CONTENT_TYPES.some((t) => t.kind === value);
