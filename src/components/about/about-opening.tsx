"use client";

/* 홈 첫 화면. 장면은 둘뿐이다.

   ① 영상이 화면을 채우고 그 위에 이름이 선다.
   ② 스크롤하면 영상이 본문 열 폭의 판으로 줄어 화면 위에 남고,
      그 밑에서 「무엇을 하는 회사인가」가 올라온다.
      영상을 아예 끄면 다음 화면이 흰 바탕에 글 한 덩어리뿐이라
      위아래로 570px 이 빈다. 판을 남겨 화면을 둘로 나눈다.

   ── 본초자오선 장면은 여기서 뺐다 ─────────────────────────
   지구본이 돌고 광선이 지나가는 그 장면은 /about 의 §① 로 옮겼다.
   첫 화면에서 이름의 유래부터 꺼내면, 세무·회계 자문사라는 걸 알기도
   전에 스크롤이 끝난다. 다시 여기로 가져오지 말 것.

   ── 좁은 화면에서는 붙이지 않는다 ────────────────────────
   프레임마다 clip-path 를 다시 쓰는 일이 휴대폰에서 제일 무겁다.
   넘김이 끊기고 빠르게 굴리면 화면이 튀던 원인이 그것이라, 좁은 화면은
   영상 한 판과 설명 한 판을 그냥 위아래로 쌓는다. */

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { preload } from "react-dom";
import { useBackgroundVideo } from "@/lib/use-background-video";
import { STAGE_MEDIA, useScrollProgress, type ScrollRange } from "@/lib/use-scroll-progress";
import Wordmark from "@/components/brand/wordmark";

/* 이 구간을 지나는 동안 0 → 1. 그게 모든 움직임의 시계다("start start" → "end end"). */
const WHOLE: ScrollRange = [[0, 0], [1, 1]];

/* DOM 은 하나다. 붙일지 쌓을지는 CSS 가 정한다(globals.css 「홈 첫 화면」).
   서버 HTML 이 휴대폰에서도 처음부터 맞는 판이라, 수화가 레이아웃을 갈아 끼우지 않는다.
   여기서 하는 일은 둘뿐이다 — 진행도(--p)를 넣고, 이름이 날아갈 거리를 잰다. */
export default function AboutOpening() {
  const ref = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLHeadingElement>(null);
  useBackgroundVideo(ref);
  useScrollProgress(ref, WHOLE, { media: STAGE_MEDIA });

  /* ① 이름이 내려오는 길. 화면 한가운데(크게) → 글판 왼쪽 위 제자리(작게).
     가는 거리와 줄어드는 비율은 화면마다 달라서 잰다. 첫 그림 전에 한 번, 폭이 바뀔 때,
     붙임이 켜지고 꺼질 때, 글꼴이 다 온 뒤에 잰다. 값은 CSS 변수로 넘긴다. */
  useLayoutEffect(() => {
    const root = ref.current;
    const box = nameRef.current;
    const fly = flyRef.current;
    const ink = box?.querySelector<HTMLElement>(".brand-lockup");
    const pin = root?.firstElementChild;
    if (!root || !box || !fly || !ink || !pin) return;
    const query = matchMedia(STAGE_MEDIA);
    let width = 0;
    let live = true;
    const measure = () => {
      width = window.innerWidth;
      if (!live) return;
      if (!query.matches) {
        delete root.dataset.fly;
        return;
      }
      /* 잴 때는 움직임을 잠시 끈다. 안 그러면 「이미 옮겨진 자리」를 새 기준으로 잡는다. */
      fly.style.transform = "none";
      const r = ink.getBoundingClientRect();
      fly.style.transform = "";
      /* 붙은 판 기준으로 잰다. 판이 화면 맨 위에 붙어 있을 때 이름이 판 한가운데에 선다.
         창 기준으로 재면 판이 위로 흘러간 뒤에 잰 값이 스크롤만큼 어긋난다. */
      const frame = pin.getBoundingClientRect();
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      /* 처음 크기는 영상 위 이름(.about-logo)과 같다 — clamp(3.2rem, 13vw, 13rem). */
      const startPx = Math.min(Math.max(3.2 * rem, window.innerWidth * 0.13), 13 * rem);
      const nowPx = parseFloat(getComputedStyle(box).fontSize) || startPx;
      root.style.setProperty("--fly-x", `${frame.width / 2 - (r.left - frame.left + r.width / 2)}px`);
      root.style.setProperty("--fly-y", `${frame.height / 2 - (r.top - frame.top + r.height / 2)}px`);
      root.style.setProperty("--fly-s", String(startPx / nowPx));
      root.dataset.fly = "";
    };
    /* 가로가 안 바뀐 resize 는 무시한다. 주소창이 접힐 때마다 오는 세로만 바뀐 resize 에
       다시 재면 로고가 한 칸씩 뛴다. */
    const onResize = () => {
      if (window.innerWidth !== width) measure();
    };
    measure();
    void document.fonts?.ready.then(measure);
    window.addEventListener("resize", onResize);
    query.addEventListener("change", measure);
    return () => {
      live = false;
      window.removeEventListener("resize", onResize);
      query.removeEventListener("change", measure);
    };
  }, []);

  return (
    <div ref={ref} className="about-stage">
      <div className="about-stage-pin">
        {/* ⓪ 영상. 붙은 무대에서는 제일 뒤에 깔렸다가 본문 열 폭의 판으로 줄어 위에 남는다.
            쌓은 판에서는 첫 판이다. */}
        <div className="about-video">
          <HomeFilm />
          {/* 흰 이름이 얹히는 자리를 눌러 준다. 안 누르면 밝은 장면에서 이름이 사라진다. */}
          <div className="about-video-veil" />
          {/* 영상 위 이름은 보이기만 한다. 페이지 제목(h1)은 아래 글판의 이름 하나다. */}
          <p className="about-logo" aria-hidden="true">
            <Wordmark mark={false} />
          </p>
        </div>

        {/* ① 무엇을 하는 회사인가. 붙은 무대에서는 로고가 이 판 안에 있다가 처음에는 화면
            한가운데 크게 서 있고, 영상이 줄어드는 동안 제자리로 내려온다. 이름 하나가 계속
            같은 이름으로 남아 있어야 「같은 것이 옮겨 갔다」로 읽힌다. */}
        <div className="about-close">
          <What nameRef={nameRef} flyRef={flyRef} />
        </div>
      </div>
    </div>
  );
}

/* 첫 화면 영상. /media 의 파일은 불변 캐시다. 내용을 바꾸면 이름의 v 숫자를 올린다. */
const HOME_FILM_POSTER = "/media/home-hero-poster.v1.webp";
/* 움직임을 꺼 둔 화면에서는 영상을 숨긴다(globals.css). 숨겨도 video 는 source 를 받으므로,
   source 마다 조건을 걸어 맞는 source 가 없게 한다 — 그러면 아무것도 받지 않는다. */
const MOTION = "(prefers-reduced-motion: no-preference)";
const PHONE = `${MOTION} and (max-width: 540px) and (orientation: portrait)`;

/* webm 이 먼저다 — 같은 화질에 mp4 보다 15% 작다.
   휴대폰은 가운데 720×720 을 잘라 둔 판을 받는다(webm 922 → 619KB).
   휴대폰의 영상 판은 폭보다 높이가 길거나 같다(globals.css .about-video). 그러면 cover 는
   높이에 맞춰 키우고, 1280 폭 원본에서 보이는 것은 가운데 720px 안쪽이다. 그래서
   잘린 판은 포스터(원본 비율)와 같은 자리 · 같은 배율로 보인다. 영상이 시작될 때 튀지 않고,
   원본보다 확대되지도 않는다.
   판이 폭보다 낮아지는 곳(541px 이상 · 가로 화면)은 원본을 받는다.
   (media 는 불러올 때 한 번 고른다. 불러온 뒤 가로로 돌리면 잘린 판이 확대되어 보인다.) */
function HomeFilm() {
  /* 포스터가 첫 화면의 LCP 다. 서버 HTML 의 <head> 에 preload 로 실어 CSS·JS 보다
     먼저 받게 한다. 움직임을 꺼 둔 화면에는 영상이 안 보이니 미리 받지 않는다. */
  preload(HOME_FILM_POSTER, { as: "image", fetchPriority: "high", media: MOTION });
  return (
    <video muted loop playsInline preload="metadata" poster={HOME_FILM_POSTER}>
      <source src="/media/home-hero.square.v1.webm" type="video/webm" media={PHONE} />
      <source src="/media/home-hero.square.v1.mp4" type="video/mp4" media={PHONE} />
      <source src="/media/home-hero.v1.webm" type="video/webm" media={MOTION} />
      <source src="/media/home-hero.v1.mp4" type="video/mp4" media={MOTION} />
    </video>
  );
}

/* 무슨 회사인가. 첫 화면이 이 한 판을 위해 있다 —
   영상 다음에 바로 이게 와야 무엇을 파는 곳인지가 읽힌다. */
function What({
  nameRef,
  flyRef,
}: {
  nameRef: React.Ref<HTMLDivElement>;
  flyRef: React.Ref<HTMLHeadingElement>;
}) {
  return (
    /* 넓은 화면은 좌우로 나눈다.
       왼쪽은 「누구인가」— 로고와 업(業) 한 줄. 크게 세운다.
       오른쪽은 「무엇을 해주는가」— 설명과 갈 곳.
       한 줄로 쌓아 두면 가운데 580px 만 쓰고 좌우가 통째로 비었다.
       좁은 화면에서는 두 묶음이 그냥 위아래로 쌓인다. */
    <div className="about-what">
      <div className="about-what-id">
        {/* 회사 이름. 표식은 빼고 글자만 쓴다.
            넓은 화면에서는 이 로고가 처음에 화면 한가운데 크게 섰다가
            여기로 내려온다. 그 움직임은 .about-logo-fly 가 맡는다. */}
        <div className="about-what-name" ref={nameRef}>
          <h1 className="about-logo-fly" ref={flyRef}>
            <Wordmark mark={false} />
            {/* 워드마크만으로는 「Meridian.」 한 단어다. 무엇을 하는 곳인지 제목에 같이 둔다. */}
            <span className="sr-only"> — 세무·회계 자문</span>
          </h1>
        </div>
        {/* 업(業)을 한 줄로 먼저 박는다. 이 줄이 없으면 아래 설명이
            무엇에 대한 설명인지 모른 채 읽힌다.
            고객이 제일 먼저 말한 것도 이것이다 — 영상 바로 아래서
            세무·회계 자문사라는 걸 알 수 있어야 한다. */}
        <p className="about-what-kind">세무 · 회계 자문</p>
      </div>
      <div className="about-what-say">
      <p className="about-what-body">
        <span className="s">매일의 기장부터 세무조정, 세무자문, 가치평가까지</span>
        <span className="s"><strong>회계사가 직접 맡습니다.</strong></span>
      </p>
      {/* 여기까지가 「무엇을 하는가」. 한 줄 더 — 그 일이 어디에 모이는지. */}
      <p className="about-what-more">
        <span className="s">그리고 그 모든 것을 한 화면에서 보는</span>
        <span className="s">
          회사 전용 <strong className="hl">세무 대시보드</strong>까지.
        </span>
      </p>
      {/* 같은 사이트 안이라 Link 로 간다. 주소는 그대로 — 바꾸면 검색 순위가 흔들린다.
          <a> 로 두면 페이지를 통째로 다시 받아서 느리고, 린트도 막는다. */}
      <div className="about-what-cta">
        <Link className="about-btn about-btn--fill" href="/contact">
          상담하기
        </Link>
        <Link className="about-btn about-btn--line" href="/services">
          하는 일 자세히 보기
        </Link>
      </div>
      </div>
    </div>
  );
}
