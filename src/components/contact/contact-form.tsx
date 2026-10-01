"use client";

import { Suspense, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { siteConfig } from "@/lib/constants";
import InquiryDraft from "./contact-inquiry";

const subscribeNothing = () => () => {};

/* 칸들은 비제어(uncontrolled)다. 서버 HTML 이 수화되기 전에 친 글은 DOM 에만 있는데,
   제어 칸이면 수화 뒤 첫 렌더가 빈 state 로 그 글을 덮는다(Next 16.3 이 싣는 React
   19.3 canary 는 수화 전 입력을 다시 보내 주지 않는다). 값은 보낼 때 FormData 로 읽는다. */
export default function ContactForm() {
  const formId = useId();
  const submitting = useRef(false);
  const startedAt = useRef(0);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  /* 서버 HTML 과 수화 전에는 false. 버튼은 수화 뒤에만 켠다. disabled 인 기본 버튼은
     Enter 암묵 제출도 막으므로(HTML 규격), JS 가 없거나 늦거나 깨져도 입력이 주소창이나
     빈 요청으로 새지 않는다. 그동안은 아래 안내가 직접 연락처를 알려 준다. */
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  /* 서버 HTML 을 수화해 붙었는지(처음 들어온 페이지), 클라이언트 이동으로 새로 그려졌는지. */
  const hydrating = useRef(!hydrated);
  const nameRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  /* 폼이 화면에 나타난 때(performance.now 기준). 보낼 때 여기서 잰 경과 시간으로 서버가
     너무 빠른 제출(900ms 미만)을 막는다. 기기 시계(Date.now)는 서버 시계와 어긋날 수 있어
     쓰지 않는다. performance.now 는 페이지를 연 순간부터 재는 단조 시계다.
     처음 들어온 페이지라면 폼은 JS 가 오기 전, 페이지를 연 순간(0)부터 보였다. 수화한
     때로 잡으면, JS 를 기다리며 다 써 둔 사람이 버튼이 켜지자마자 누를 때 막힌다. */
  useEffect(() => {
    startedAt.current = hydrating.current ? 0 : performance.now();
  }, []);

  /* 주소 초안은 사용자가 손대지 않은 칸에만 넣는다. value 가 defaultValue 그대로면 손대지
     않은 칸이다. 초안이 바뀌면 textarea 를 새로 그린다(key) — 브라우저가 칸을 「고친
     것」으로 표시해 두면 defaultValue 만 바꿔서는 글이 안 바뀌기 때문이다. */
  const applyDraft = useCallback((message: string) => {
    const field = messageRef.current;
    if (field && field.value !== field.defaultValue) return;
    setDraft(message);
  }, []);

  const fieldId = (field: string) => `${formId}-${field}`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setStatus("sending");
    setErrorMessage("");
    const fields = Object.fromEntries(new FormData(e.currentTarget));

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, elapsedMs: Math.round(performance.now() - startedAt.current) }),
        signal: AbortSignal.timeout(20000),
      });

      if (res.ok) {
        setStatus("sent");
      } else {
        let serverMessage = "";
        try {
          const data = await res.json();
          if (data && typeof data.error === "string") {
            serverMessage = data.error;
          }
        } catch {
          // ignore
        }
        setErrorMessage(res.status === 429 ? "요청이 많습니다. 잠시 후 다시 시도해 주세요." : serverMessage || `전송에 실패했습니다 (${res.status}).`);
        setStatus("error");
      }
    } catch {
      setErrorMessage("응답을 확인하지 못해 접수 여부가 확실하지 않습니다. 입력 내용은 유지됩니다. 잠시 후 확인하거나 직접 연락해 주세요.");
      setStatus("error");
    } finally {
      submitting.current = false;
      requestAnimationFrame(() => statusRef.current?.focus());
    }
  };

  const draftReader = (
    <Suspense fallback={null}>
      <InquiryDraft onDraft={applyDraft} />
    </Suspense>
  );

  if (status === "sent") {
    return (
      <>
        {draftReader}
        <div ref={statusRef} tabIndex={-1} role="status" className="py-20 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-foreground flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold tracking-tight mb-3">
            문의가 접수되었습니다
          </h3>
          <p className="text-muted leading-relaxed mb-8">
            전달해 주신 내용을 확인 후 회신드리겠습니다.
          </p>
          <button
            onClick={() => {
              startedAt.current = performance.now();
              setStatus("idle");
              /* 누른 단추가 사라지므로 초점을 새 폼 첫 칸으로 옮긴다. 두지 않으면 body 로 떨어진다. */
              requestAnimationFrame(() => nameRef.current?.focus());
            }}
            className="inline-flex items-center text-sm font-medium tracking-wider hover-underline"
          >
            새 문의 작성
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {draftReader}
      <form method="post" onSubmit={handleSubmit} className="space-y-8" aria-busy={status === "sending"}>
        {draft && <p className="text-sm text-muted">선택한 서비스·견적 조건을 아래 현재 상황에 담았습니다. 확인하고 수정해 주세요.</p>}
        <div className="sr-only" aria-hidden="true">
          <label htmlFor={fieldId("website")}>Website</label>
          <input
            id={fieldId("website")}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative">
            <label htmlFor={fieldId("name")} className="t-label block mb-3">
              이름 *
            </label>
            <input
              ref={nameRef}
              id={fieldId("name")}
              name="name"
              type="text"
              required
              autoComplete="name"
              maxLength={80}
              className="w-full px-0 py-3 bg-transparent text-base border-0 border-b border-border focus:outline-none focus:border-foreground transition-colors duration-300 placeholder:text-neutral-300"
              placeholder="홍길동"
            />
          </div>

          <div className="relative">
            <label htmlFor={fieldId("email")} className="t-label block mb-3">
              이메일 *
            </label>
            <input
              id={fieldId("email")}
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              className="w-full px-0 py-3 bg-transparent text-base border-0 border-b border-border focus:outline-none focus:border-foreground transition-colors duration-300 placeholder:text-neutral-300"
              placeholder="example@email.com"
            />
          </div>
        </div>

        <div className="relative">
          <label htmlFor={fieldId("phone")} className="t-label block mb-3">
            전화번호
          </label>
          <input
            id={fieldId("phone")}
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            className="w-full px-0 py-3 bg-transparent text-base border-0 border-b border-border focus:outline-none focus:border-foreground transition-colors duration-300 placeholder:text-neutral-300"
            placeholder="010-0000-0000"
          />
        </div>

        <div className="relative">
          <label htmlFor={fieldId("message")} className="t-label block mb-3">
            현재 상황 *
          </label>
          <textarea
            id={fieldId("message")}
            name="message"
            required
            rows={6}
            maxLength={4000}
            ref={messageRef}
            key={draft}
            defaultValue={draft}
            className="w-full px-0 py-3 bg-transparent text-base border-0 border-b border-border focus:outline-none focus:border-foreground transition-colors duration-300 resize-none placeholder:text-neutral-300"
            placeholder="매출 규모, 기존 기장 여부, 가장 급한 이슈를 세 줄 정도로 적어 주세요."
          />
        </div>

        {status === "error" && (
          <div ref={statusRef} tabIndex={-1} role="alert" className="flex items-center gap-3 py-4 px-5 bg-red-50 border border-red-100">
            <span className="w-5 h-5 rounded-full border border-red-400 flex items-center justify-center flex-shrink-0">
              <span className="text-red-500 text-xs font-bold">!</span>
            </span>
            <p className="text-sm text-red-600">
              {errorMessage || "전송에 실패했습니다. 잠시 후 다시 시도해 주세요."}
            </p>
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={!hydrated || status === "sending"}
            className="group w-full md:w-auto inline-flex items-center justify-center btn-blue rounded-[10px] px-12 py-4 text-sm font-medium tracking-wider transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === "sending" ? (
              <span className="flex items-center gap-3">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                전송 중...
              </span>
            ) : (
              <>
                문의 보내기
                <span className="ml-3 transition-transform duration-300 group-hover:translate-x-1">
                  &rarr;
                </span>
              </>
            )}
          </button>
          {!hydrated && (
            <p className="mt-4 text-sm text-muted">
              보내기 버튼이 켜지지 않으면{" "}
              <a href={`mailto:${siteConfig.email}`} className="underline underline-offset-4">이메일</a>이나{" "}
              <a href={siteConfig.kakaoChannelUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">카카오톡 채널</a>로 보내 주세요.
            </p>
          )}
        </div>
      </form>
    </>
  );
}
