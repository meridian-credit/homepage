"use client";

/* 화면 폭을 렌더 도중에 바로 읽는다.
 *
 * useEffect 로 재면 첫 그림은 무조건 넓은 화면 것으로 그려지고, 그 다음
 * 프레임에 좁은 화면 것으로 갈아치운다 — 휴대폰에서 화면이 한 번 번쩍인다.
 * useSyncExternalStore 는 붙는 그 순간의 값을 그대로 쓴다.
 *
 * 서버에는 화면이 없다. 서버 값은 언제나 「좁지 않다」로 둔다.
 */

import { useCallback, useSyncExternalStore } from "react";

export function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/* 휴대폰 쪽(≤900px). 서비스 고르기(service-picker)를 누르면 펼쳐지는 목록으로 바꾸는 기준이다.
   스크롤 장면을 붙일지 쌓을지는 여기서 정하지 않는다 — CSS(STAGE_MEDIA)가 정한다. */
export function useHandheld(): boolean {
  return useMedia("(max-width: 900px)");
}

/** Keep the first client render identical to SSR before applying the preference. */
export function usePrefersReducedMotion(): boolean {
  return useMedia("(prefers-reduced-motion: reduce)");
}
