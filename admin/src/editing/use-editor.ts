"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ContentKind } from "@admin/content/registry";
import type { Change, Published, SaveResult } from "@admin/content/types";

/* 편집 화면이 함께 쓰는 저장 흐름(docs/plans/admin-backend/ui.md 「저장의 일생」). 종류마다 다른 것은 config 로 받는다.
   - 작업본: 화면을 열면 서버의 값과 판 번호를 받고, 무엇을 고치든 브라우저 안의 작업본만 바뀐다.
   - 바뀐 것: 마지막으로 저장된 값과 작업본을 종류의 describe() 로 비교해 센다. 고쳤다가 원래대로 돌리면 0 이다.
   - 저장: 「저장하고 반영」 또는 Ctrl+S. 결과마다 저장 막대가 다르게 답한다.
   - 이 기기 보관: 바뀐 것이 있으면 localStorage 에 둔다. 로그인 만료 · 관리자 재배포 · 연결 끊김은 모두 결국
     새로고침으로 끝나는데, 그때 적던 글이 사라지지 않게 한다. 저장하거나 버리면 지운다. 로그아웃해도 지운다.
     공용 컴퓨터라도 일정 · FAQ 는 어차피 공개되는 글이라 위험이 작다. 글(초안)이 들어오면 다시 본다.
   - 떠날 때 경고: 바뀐 것이 있으면 브라우저가 한 번 묻는다. */

export type Phase = "idle" | "invalid" | "saving" | "saved" | "failed" | "signed-out" | "conflict" | "discarded";

export type EditorConfig<D, S> = {
  kind: ContentKind;
  data: D;
  revision: number;
  toState: (data: D) => S;
  payload: (state: S) => D;
  describe: (before: D, after: D) => { changes: Change[]; summary: string };
  /* 저장을 막는 곳의 수. 브라우저에서 서버와 같은 규칙으로 센다. */
  issues: (state: S) => number;
  save: (data: D, revision: number) => Promise<SaveResult<D>>;
  /* 고칠 곳이 있어 저장을 막았을 때: 첫 고칠 곳을 펴고 그 칸으로 초점을 옮긴다. */
  onInvalid: (state: S) => void;
  /* 저장했을 때: 열려 있던 입력칸 · 새 일정 칸을 닫는다. */
  onSaved?: () => void;
  /* 작업본 밖에 적다 만 것이 있으면 그 까닭(예: 새 일정 칸에 적고 [목록에 추가]를 안 눌렀다). 저장을 막고 알린다 —
     「저장했습니다」 뒤에 그 칸이 닫히면서 적은 것이 소리 없이 사라지지 않게. */
  blocker?: () => { message: string; focus: () => void } | null;
};

export const DRAFT_PREFIX = "meridian-admin:draft:";
const LOST_PREFIX = "meridian-admin:lost:";

/* v: 작업본 모양의 판. 편집 화면의 상태 모양을 바꾸면 올린다 — 옛 모양의 작업본은 권하지 않고 버린다. */
const DRAFT_VERSION = 1;
type Draft<D, S> = { v: number; at: string; revision: number; base: D; state: S };

/* 저장소 읽기는 실패할 수 있다(사생활 보호 창, 막힌 저장소). 실패하면 보관 없이 그냥 동작한다. */
const storage = {
  get(area: "local" | "session", key: string) {
    try {
      return (area === "local" ? localStorage : sessionStorage).getItem(key);
    } catch {
      return null;
    }
  },
  set(area: "local" | "session", key: string, value: string) {
    try {
      (area === "local" ? localStorage : sessionStorage).setItem(key, value);
    } catch {}
  },
  remove(area: "local" | "session", key: string) {
    try {
      (area === "local" ? localStorage : sessionStorage).removeItem(key);
    } catch {}
  },
};

/* 화면을 연 순간 저장소에 있던 값 하나. 처음 읽은 값을 붙들고 있다가 clear() 하면 사라진다.
   서버 HTML 과 첫 수화 때는 null 이라 화면이 어긋나지 않는다. */
function useLoadedValue(area: "local" | "session", key: string) {
  const [store] = useState(() => {
    let loaded: string | null | undefined;
    const listeners = new Set<() => void>();
    return {
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      get() {
        if (loaded === undefined) loaded = storage.get(area, key);
        return loaded;
      },
      clear() {
        loaded = null;
        listeners.forEach((l) => l());
      },
    };
  });
  const value = useSyncExternalStore(store.subscribe, store.get, () => null);
  /* store.get 은 첫 수화 전에도 저장소를 읽어 붙든다. 보관 effect 가 그보다 먼저 지우지 않도록 그것으로 확인한다. */
  return [value, store.clear, store.get] as const;
}

const parse = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export function useEditor<D, S>(config: EditorConfig<D, S>) {
  const router = useRouter();
  const { kind, describe, payload, toState } = config;
  const draftKey = DRAFT_PREFIX + kind;
  const lostKey = LOST_PREFIX + kind;

  const [base, setBase] = useState(config.data);
  const [state, setState] = useState(() => config.toState(config.data));
  const [revision, setRevision] = useState(config.revision);
  const [phase, setPhase] = useState<Phase>("idle");
  const [invalidMessage, setInvalidMessage] = useState("");
  const [outcome, setOutcome] = useState<{ warnings: string[]; published: Published } | null>(null);
  const [conflict, setConflict] = useState<{ at: string; actor: string } | null>(null);
  /* 변경 취소 · 이어서 고치기 바로 전의 작업(되살리기용). why 는 막대 문구를 고른다. */
  const [undo, setUndo] = useState<{ state: S; base: D; revision: number; why: "discard" | "resume" } | null>(null);
  const leaving = useRef(false);

  const { changes, summary } = useMemo(() => describe(base, payload(state)), [describe, payload, base, state]);
  const count = changes.length;
  const issueCount = config.issues(state);

  /* ── 이 기기에 남은 작업본 ── */
  const [draftRaw, clearDraftNotice, loadedDraft] = useLoadedValue("local", draftKey);
  /* 보관된 작업본 중 아직 바뀐 것이 있는 것만 「이어서 고치기」로 권한다. 읽을 수 없거나 빈 것은 없는 셈 친다. */
  const pendingDraft = useCallback(
    (raw: string | null) => {
      const d = parse<Draft<D, S>>(raw);
      if (!d || d.v !== DRAFT_VERSION) return null;
      try {
        const pending = describe(d.base, payload(d.state));
        return pending.changes.length ? { ...d, summary: pending.summary } : null;
      } catch {
        return null;
      }
    },
    [describe, payload]
  );
  const draft = useMemo(() => pendingDraft(draftRaw), [pendingDraft, draftRaw]);
  const [lostRaw, clearLost] = useLoadedValue("session", lostKey);
  const lost = useMemo(() => parse<Change[]>(lostRaw), [lostRaw]);

  /* 바뀐 것이 있으면 보관하고, 없으면 지운다. 남아 있던 작업본을 이어 쓸지 묻는 동안에는 지우지만 않는다 —
     띠를 두고 새로 고치기 시작했으면 새 것을 보관한다(띠가 권하는 옛 것은 화면이 기억하고 있다). */
  useEffect(() => {
    if (phase === "saving") return;
    if (count > 0)
      storage.set("local", draftKey, JSON.stringify({ v: DRAFT_VERSION, at: new Date().toISOString(), revision, base, state }));
    else if (pendingDraft(loadedDraft()) === null) storage.remove("local", draftKey);
  }, [draftRaw, loadedDraft, pendingDraft, phase, count, draftKey, revision, base, state]);

  const resumeDraft = () => {
    if (!draft) return;
    /* 지금 화면에서도 고친 것이 있으면 [되살리기]로 돌아올 수 있게 둔다. */
    if (count > 0) {
      setUndo({ state, base, revision, why: "resume" });
      setPhase("discarded");
    } else setPhase("idle");
    /* 남은 작업본은 그때의 판 번호로 저장한다. 그 사이 누가 저장했으면 충돌로 막혀 덮어쓰지 않는다. */
    setBase(draft.base);
    setState(draft.state);
    setRevision(draft.revision);
    clearDraftNotice();
  };
  const dropDraft = () => {
    storage.remove("local", draftKey);
    clearDraftNotice();
  };

  /* ── 저장 ── */
  const save = async () => {
    const c = config;
    if (phase === "saving") return;
    if (c.issues(state) > 0) {
      setInvalidMessage("");
      setPhase("invalid");
      c.onInvalid(state);
      return;
    }
    const blocked = c.blocker?.();
    if (blocked) {
      setInvalidMessage(blocked.message);
      setPhase("invalid");
      blocked.focus();
      return;
    }
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement.id : "";
    setPhase("saving");
    setOutcome(null);
    let result: SaveResult<D>;
    try {
      result = await c.save(c.payload(state), revision);
    } catch {
      /* 요청 자체가 실패했다(연결 끊김, 관리자 앱이 막 새로 배포되어 옛 화면의 액션을 못 찾음).
         잡지 않으면 오류 화면으로 바뀌면서 적던 내용이 사라진다. */
      setPhase("failed");
      return;
    } finally {
      /* 저장하는 동안 편집 칸을 잠갔다가(inert) 풀면서, 있던 자리로 초점을 돌려준다. 그 자리가 없어졌으면(저장하며
         입력칸이 닫힘, 막대의 단추가 바뀜) 막대의 결과 글로 옮긴다 — 초점이 쪽 맨 위로 튀지 않게. */
      requestAnimationFrame(() => {
        const back = focused ? document.getElementById(focused) : null;
        if (back?.isConnected && back.getClientRects().length) back.focus();
        else document.getElementById("savebar-title")?.focus();
      });
    }
    if (result.ok) {
      setBase(result.saved);
      setState(c.toState(result.saved));
      setRevision(result.revision);
      setOutcome({ warnings: result.warnings, published: result.published });
      setPhase(result.published.ok ? "saved" : "idle");
      storage.remove("local", draftKey);
      c.onSaved?.();
      /* 메뉴의 점, 홈, 반영 실패 띠를 서버의 새 값으로 다시 그린다. 편집 화면의 작업본은 그대로다. */
      router.refresh();
      return;
    }
    if (result.reason === "signed-out") setPhase("signed-out");
    else if (result.reason === "conflict") {
      setConflict(result.latest);
      setPhase("conflict");
    } else {
      setInvalidMessage(result.message);
      setPhase("invalid");
    }
  };
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  /* Ctrl/⌘+S 로도 저장한다(바뀐 것이 있을 때만). 엑셀에 익숙한 손버릇. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (count > 0) void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count]);

  /* 저장하지 않고 떠나면 브라우저가 한 번 묻는다. */
  useEffect(() => {
    if (count === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!leaving.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [count]);

  /* 「저장했습니다」 · 「변경을 취소했습니다」는 8초 뒤 닫는다. */
  useEffect(() => {
    if (phase !== "saved" && phase !== "discarded") return;
    const timer = setTimeout(() => setPhase("idle"), 8000);
    return () => clearTimeout(timer);
  }, [phase]);

  const discard = () => {
    setUndo({ state, base, revision, why: "discard" });
    setState(toState(base));
    setPhase("discarded");
  };
  const restoreDiscarded = () => {
    if (undo) {
      setState(undo.state);
      setBase(undo.base);
      setRevision(undo.revision);
    }
    setUndo(null);
    setPhase("idle");
  };

  /* 충돌 뒤 최신 내용 불러오기: 저장하지 못한 내 변경을 이 탭에 적어 두고 새로 연다. 새 화면이 위에 띄워
     다시 넣을 수 있게 한다. 이 기기 보관은 지운다 — 옛 판 번호의 작업본을 다시 권하면 또 충돌한다. */
  const reloadLatest = () => {
    storage.set("session", lostKey, JSON.stringify(changes));
    storage.remove("local", draftKey);
    leaving.current = true;
    window.location.reload();
  };

  /* 저장 막대가 보일 상태. 고칠 곳을 다 고치면 「고칠 곳」에서 「저장하지 않은 변경」으로 돌아간다. */
  const bar: Phase | "dirty" | "hidden" =
    phase === "idle" || (phase === "invalid" && issueCount === 0 && !invalidMessage)
      ? count > 0
        ? "dirty"
        : "hidden"
      : phase;

  return {
    state,
    setState,
    base,
    revision,
    phase,
    bar,
    count,
    summary,
    changes,
    issueCount,
    invalidMessage,
    outcome,
    conflict,
    draft,
    lost,
    saving: phase === "saving",
    save,
    discard,
    restoreDiscarded,
    resumeDraft,
    dropDraft,
    dismissLost: () => {
      storage.remove("session", lostKey);
      clearLost();
    },
    reloadLatest,
    undoWhy: undo?.why ?? "discard",
    closeBar: () => setPhase("idle"),
    /* 이 기기에 보관했다고 알린 뒤 다른 쪽으로 보낼 때(다시 로그인): 떠날 때 경고를 끈다. */
    leave: () => {
      leaving.current = true;
    },
  };
}

export type Editor = ReturnType<typeof useEditor<unknown, unknown>>;
