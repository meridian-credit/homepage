"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { services } from "@/lib/data";
import { DEFAULT_STATE, deserializeStateFromParams, calculateEstimate, buildInquiryText } from "@/lib/pricing";

/* 주소(?service=, ?from=pricing …)로 넘어온 조건을 「현재 상황」 초안 글로 만든다. */
function draftFromQuery(query: URLSearchParams) {
  let message = query.get("message") || "";
  if (query.get("from") === "pricing") {
    const state = { ...DEFAULT_STATE, ...deserializeStateFromParams(query) };
    message = buildInquiryText(state, calculateEstimate(state));
  } else {
    const service = services.find(item => item.title === query.get("type") || item.slug === query.get("service"));
    const context = [
      service && `관심 서비스: ${service.title}`,
      query.get("bottleneck") && `상담 목적: ${query.get("bottleneck")}`,
      query.get("output") && `필요한 결과물: ${query.get("output")}`,
    ].filter(Boolean).join("\n");
    if (context) message = `${context}\n\n${message}`;
  }
  return message.slice(0, 4000);
}

/** 주소에 기대는 건 초안 하나뿐이다. 이 빈 자식만 Suspense 안에 두고 폼은 밖에서 한 번 그린다.
 *  그래야 /contact 가 정적으로 prerender 되고, 수화 때 폼이 새로 그려지며 먼저 친 글이 사라지지 않는다. */
export default function InquiryDraft({ onDraft }: { onDraft: (message: string) => void }) {
  const query = useSearchParams();
  const message = draftFromQuery(new URLSearchParams(query.toString()));
  useEffect(() => onDraft(message), [message, onDraft]);
  return null;
}
