"use client";

/* 검정 히어로 뒤에 까는 영상. 페이지마다 따로 붙이지 않고 이거 하나만 쓴다.

   자동재생은 muted + playsInline 이 없으면 브라우저가 막는다.
   움직임을 꺼 둔 사람에게는 포스터 한 장만 보인다. */

import { useRef } from "react";
import { useBackgroundVideo } from "@/lib/use-background-video";

export default function HeroVideo({ opacity = 0.55 }: { opacity?: number }) {
  const ref = useRef<HTMLVideoElement>(null);

  useBackgroundVideo(ref);

  return (
    <div className="hero-video" aria-hidden>
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="metadata"
        poster="/media/meridian-hero-poster.v1.webp"
        style={{ opacity }}
      >
        {/* 움직임을 꺼 둔 화면은 CSS 가 영상을 숨기고 포스터만 깐다. 숨겨도 video 는
            metadata 를 받으러 가므로, source 에 조건을 걸어 아예 받지 않게 한다. */}
        <source src="/media/meridian-hero.v1.webm" type="video/webm" media="(prefers-reduced-motion: no-preference)" />
        <source src="/media/meridian-hero.v1.mp4" type="video/mp4" media="(prefers-reduced-motion: no-preference)" />
      </video>
      {/* 글이 얹히는 자리를 눌러 준다. 안 누르면 흰 글씨가 뜬다. */}
      <div className="hero-video-veil" />
    </div>
  );
}
