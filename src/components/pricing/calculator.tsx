"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  pricingLinkWarning,
  ADD_ONS,
  CUSTOM_FLAGS,
  DEFAULT_STATE,
  EXTRA_PAYEE_PRESETS,
  formatHeadcount,
  getIndustryPricingBasis,
  getPricingProfileLabel,
  getPricingTable,
  PRICING,
  REVENUE_OPTIONS,
  REVENUE_PRESETS,
  SETUP_MODES,
  STAFF_PRESETS,
  STAFF_RANGE_MAX,
  STEP_FLOW,
  annualLabel,
  buildInquiryText,
  buildSummaryText,
  calculateEstimate,
  describeRevenueTier,
  deserializeStateFromParams,
  formatCadenceLabel,
  formatCompactWon,
  formatNumber,
  formatRevenueLabel,
  formatStaffCount,
  formatWon,
  getFilteredIndustries,
  getIndustry,
  getNearestRevenueIndex,
  parseCurrencyInput,
  serializeStateToParams,
  type BusinessType,
  type CalcState,
  type PayrollMode,
  type SetupModeKey,
} from "@/lib/pricing";

/* ─── Reducer ─── */

type Action =
  | { type: "setBusinessType"; value: BusinessType }
  | { type: "setIndustry"; id: string }
  | { type: "setRevenue"; value: number }
  | { type: "setStaff"; value: number }
  | { type: "setNonEmployeePayees"; value: number }
  | { type: "setPayrollMode"; value: PayrollMode }
  | { type: "setSetupMode"; value: SetupModeKey }
  | { type: "toggleAddOn"; id: string }
  | { type: "toggleFlag"; id: string }
  | { type: "hydrate"; partial: Partial<CalcState> };

function reducer(state: CalcState, action: Action): CalcState {
  switch (action.type) {
    case "setBusinessType":
      return { ...state, businessType: action.value };
    case "setIndustry": {
      const ind = getIndustry(action.id);
      return { ...state, industryId: ind.id, complexity: ind.complexity };
    }
    case "setRevenue":
      return { ...state, revenue: Math.max(0, action.value) };
    case "setStaff":
      return { ...state, staffCount: Math.max(0, Math.min(STAFF_RANGE_MAX, action.value)) };
    case "setNonEmployeePayees":
      return {
        ...state,
        nonEmployeePayeeCount: Math.max(0, Math.min(STAFF_RANGE_MAX, action.value)),
      };
    case "setPayrollMode":
      return {
        ...state,
        payrollMode: action.value,
        addOns:
          action.value === "fourInsurance"
            ? state.addOns
            : state.addOns.filter((id) => id !== "insuranceAdmin"),
      };
    case "setSetupMode":
      return { ...state, setupMode: action.value };
    case "toggleAddOn": {
      const set = new Set(state.addOns);
      if (set.has(action.id)) set.delete(action.id);
      else set.add(action.id);
      return { ...state, addOns: [...set] };
    }
    case "toggleFlag": {
      const set = new Set(state.customFlags);
      if (set.has(action.id)) set.delete(action.id);
      else set.add(action.id);
      return { ...state, customFlags: [...set] };
    }
    case "hydrate":
      return { ...state, ...action.partial };
    default:
      return state;
  }
}

/* ─── Component ─── */

const REVENUE_MARKERS = [50_000_000, 300_000_000, 1_000_000_000, 10_000_000_000] as const;

export default function PricingCalculator() {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const [industryQuery, setIndustryQuery] = useState("");
  const [revenueDirectOpen, setRevenueDirectOpen] = useState(false);
  const [ctaMessage, setCtaMessage] = useState<{ text: string; tone: "neutral" | "success" | "error" } | null>(null);
  const [linkWarning, setLinkWarning] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const industryInputRef = useRef<HTMLInputElement | null>(null);
  const revenueInputRef = useRef<HTMLInputElement | null>(null);
  const ctaTimerRef = useRef<number | null>(null);

  const estimate = useMemo(() => calculateEstimate(state), [state]);
  const selectedIndustry = useMemo(() => getIndustry(state.industryId), [state.industryId]);
  const selectedPricing = useMemo(
    () => getPricingTable(state.businessType, state.industryId),
    [state.businessType, state.industryId],
  );
  const visibleAddOns = useMemo(
    () =>
      ADD_ONS.filter(
        (addon) => addon.id !== "insuranceAdmin" || state.payrollMode === "fourInsurance",
      ),
    [state.payrollMode],
  );
  const filteredIndustries = useMemo(() => getFilteredIndustries(industryQuery).slice(0, 8), [industryQuery]);

  /* ─ Hydrate only from explicit share URLs. */
  useEffect(() => {
    let partial: Partial<CalcState> | null = null;
    try {
      const search = window.location.search;
      if (search) {
        const params = new URLSearchParams(search);
        // URL hydration is a one-time synchronization with the browser.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLinkWarning(pricingLinkWarning(params));
        const fromUrl = deserializeStateFromParams(params);
        if (Object.keys(fromUrl).length > 0) partial = fromUrl;
      }
    } catch {
      /* ignore */
    }
    if (partial) {
      const merged: CalcState = { ...DEFAULT_STATE, ...partial };
      dispatch({ type: "hydrate", partial });
      if (!REVENUE_OPTIONS.includes(merged.revenue)) {
        setRevenueDirectOpen(true);
      }
    }
    setHydrated(true);
  }, []);

  /* Keep public calculation conditions in the URL so Back restores the estimate. */
  useEffect(() => {
    if (!hydrated) return;
    const query = serializeStateToParams(state);
    window.history.replaceState(null, '', `${window.location.pathname}?${query}`);
  }, [hydrated, state]);

  /* ─ CTA flash message timer ─ */
  useEffect(() => {
    if (!ctaMessage) return;
    if (ctaTimerRef.current) window.clearTimeout(ctaTimerRef.current);
    ctaTimerRef.current = window.setTimeout(() => setCtaMessage(null), 2400);
    return () => {
      if (ctaTimerRef.current) window.clearTimeout(ctaTimerRef.current);
    };
  }, [ctaMessage]);

  /* ─ Helpers ─ */

  const buildShareUrl = useCallback(() => {
    const params = serializeStateToParams(state);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, [state]);

  const contactHref = useMemo(() => {
    const params = serializeStateToParams(state);
    params.set('from', 'pricing');
    return `/contact?${params.toString()}`;
  }, [state]);

  const onSelectIndustry = useCallback((id: string) => {
    dispatch({ type: "setIndustry", id });
    setIndustryQuery("");
  }, []);

  const onCopySummary = useCallback(async () => {
    const text = buildSummaryText(state, estimate);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy(text);
      }
      setCtaMessage({ text: "요약을 복사했습니다.", tone: "success" });
    } catch {
      setCtaMessage({ text: "요약 복사에 실패했습니다.", tone: "error" });
    }
  }, [state, estimate]);

  const onCopyInquiry = useCallback(async () => {
    const text = buildInquiryText(state, estimate);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy(text);
      }
      setCtaMessage({ text: "문의 내용을 복사했습니다.", tone: "success" });
    } catch {
      setCtaMessage({ text: "문의 내용 복사에 실패했습니다.", tone: "error" });
    }
  }, [state, estimate]);

  const onShareLink = useCallback(async () => {
    const url = buildShareUrl();
    const payload = { title: "수임료 계산기 견적", text: buildSummaryText(state, estimate), url };
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(payload);
        setCtaMessage({ text: "공유 패널을 열었습니다.", tone: "success" });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCtaMessage({ text: "공유 링크를 복사했습니다.", tone: "success" });
      } else {
        fallbackCopy(url);
        setCtaMessage({ text: "공유 링크를 복사했습니다.", tone: "success" });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setCtaMessage({ text: "공유 링크 생성에 실패했습니다.", tone: "error" });
    }
  }, [state, estimate, buildShareUrl]);

  /* ─ Render ─ */

  const monthlyTier = describeRevenueTier(selectedPricing.monthlyTiers, state.revenue);
  const revenueIndex = getNearestRevenueIndex(state.revenue);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
      {linkWarning && <p role="status" className="lg:col-span-12 text-sm text-muted">{linkWarning}</p>}
      {/* ─── Wizard ─── */}
      <section className="lg:col-span-7 xl:col-span-7">
        <div className="mb-6">
          <p className="t-label mb-2">
            Estimator
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            항목을 조정하면 즉시 계산됩니다
          </h2>
          <p className="mt-2 text-sm text-muted">
            아래 조건을 바꿔보세요. 오른쪽 견적이 실시간으로 업데이트됩니다.
          </p>
        </div>

        <div className="space-y-4">
          {STEP_FLOW.map((step) => (
              <article
                key={step.id}
                data-step={step.id}
                className="bg-card border border-border"
              >
                <div className="flex items-start justify-between p-5 md:p-6 pb-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <span className="text-xs font-semibold tracking-[0.2em] tabular-nums text-subtle">
                      {String(step.id).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base md:text-lg font-bold tracking-tight">
                        {step.title}
                      </h3>
                    </div>
                  </div>
                </div>

                  <div className="px-5 md:px-6 pb-6 md:pb-7 border-t border-border pt-5 md:pt-6 space-y-5">
                    {/* ─ Step 1: Business type ─ */}
                    {step.id === 1 && (
                      <>
                        <p className="text-xs text-muted leading-relaxed">
                          사업자 형태에 따라 기본 요율이 달라집니다.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(["corporate", "sole"] as const).map((type) => {
                            const isSelected = state.businessType === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => dispatch({ type: "setBusinessType", value: type })}
                                className={`text-left rounded-[10px] px-4 py-4 border transition-all ${
                                  isSelected
                                    ? "border-foreground bg-card"
                                    : "border-border hover:border-strong"
                                }`}
                                aria-pressed={isSelected}
                              >
                                <strong className="block text-sm font-bold">
                                  {PRICING[type].label}
                                </strong>
                                <span className="block mt-1 text-xs text-muted leading-relaxed">
                                  {type === "corporate"
                                    ? "법인세 신고/조정료와 월 기장료를 함께 계산합니다."
                                    : "종합소득세 신고료와 월 기장료를 기준으로 계산합니다."}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* ─ Step 2: Industry ─ */}
                    {step.id === 2 && (
                      <>
                        <p className="text-xs text-muted leading-relaxed">
                          업종을 검색하거나 목록에서 선택하세요.
                        </p>

                        {/* Search filter */}
                        <div className="flex items-center border border-border bg-card focus-within:border-foreground transition-colors">
                          <input
                            ref={industryInputRef}
                            type="text"
                            autoComplete="off"
                            placeholder="예: 온라인 쇼핑몰, 건설, 카페, 무역"
                            value={industryQuery}
                            onChange={(e) => setIndustryQuery(e.target.value)}
                            className="flex-1 px-4 py-3 text-sm bg-transparent outline-none"
                          />
                          {industryQuery &&
                            industryQuery.toLowerCase() !== selectedIndustry.label.toLowerCase() && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIndustryQuery("");
                                  industryInputRef.current?.focus();
                                }}
                                className="text-xs text-muted hover:text-foreground px-3"
                              >
                                지우기
                              </button>
                            )}
                        </div>

                        {/* Always-visible industry list */}
                        <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto border border-border p-2">
                          {filteredIndustries.length === 0 ? (
                            <button
                              type="button"
                              onClick={() => onSelectIndustry("other")}
                              className="text-left rounded-[10px] px-3 py-2.5 hover:bg-card transition-colors"
                            >
                              <strong className="block text-sm">기타·잘 모르겠음</strong>
                              <span className="block text-xs text-muted mt-0.5">
                                일반 업종 기준으로 먼저 계산하고, 상담 중에 조정합니다.
                              </span>
                            </button>
                          ) : (
                            filteredIndustries.map((industry) => {
                              const isSelected = industry.id === selectedIndustry.id;
                              return (
                                <button
                                  key={industry.id}
                                  type="button"
                                  onClick={() => onSelectIndustry(industry.id)}
                                  className={`text-left rounded-[10px] px-3 py-2.5 transition-colors ${
                                    isSelected
                                      ? "btn-blue"
                                      : "hover:bg-card"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <strong className="block text-sm">
                                        {industry.label}
                                      </strong>
                                      <span className={`block text-xs mt-0.5 leading-relaxed ${isSelected ? "text-neutral-300" : "text-muted"}`}>
                                        {industry.description}
                                      </span>
                                    </div>
                                    <span className={`flex-shrink-0 text-xs uppercase tracking-wider ${isSelected ? "text-neutral-400" : "text-subtle"}`}>
                                      {getPricingProfileLabel(industry.id)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>

                      </>
                    )}

                    {/* ─ Step 3: Revenue ─ */}
                    {step.id === 3 && (
                      <>
                        <p className="text-xs text-muted leading-relaxed">
                          자주 쓰는 구간은 슬라이더로, 더 정확한 숫자가 있으면 직접 입력으로 바꿔도 됩니다.
                        </p>

                        <div className="bg-card border border-border p-4 md:p-5">
                          <div className="flex items-baseline justify-between mb-3">
                            <span className="text-xs text-muted uppercase tracking-wider">
                              현재 선택한 연매출
                            </span>
                            <strong className="text-2xl font-bold tabular-nums">
                              {state.revenue > 0 ? formatRevenueLabel(state.revenue) : "미입력"}
                            </strong>
                          </div>
                          {/* 슬라이더는 누를 자리가 24px 는 돼야 한다(WCAG 2.5.8). 뿌리 글자가 15px 이라
                              h-6(1.5rem)은 22.5px 이다 — px 로 적는다. 선 두께는 브라우저가 그대로 그린다. */}
                          <input
                            type="range"
                            min={0}
                            max={REVENUE_OPTIONS.length - 1}
                            step={1}
                            value={revenueIndex}
                            onChange={(e) => {
                              const idx = Number(e.target.value);
                              dispatch({ type: "setRevenue", value: REVENUE_OPTIONS[idx] ?? REVENUE_OPTIONS[0] });
                            }}
                            className="w-full h-[24px] accent-foreground"
                            aria-label="연매출 슬라이더"
                          />
                          <div className="relative mt-1 h-9 text-xs text-subtle uppercase tracking-wider">
                            {REVENUE_MARKERS.map((amount) => {
                              const markerIndex = REVENUE_OPTIONS.indexOf(amount);
                              const left = `${(markerIndex / (REVENUE_OPTIONS.length - 1)) * 100}%`;
                              const alignmentClass =
                                markerIndex === 0
                                  ? "translate-x-0 text-left"
                                  : markerIndex === REVENUE_OPTIONS.length - 1
                                    ? "-translate-x-full text-right"
                                    : "-translate-x-1/2 text-center";

                              return (
                                <span
                                  key={amount}
                                  className={`absolute top-0 ${alignmentClass}`}
                                  style={{ left }}
                                >
                                  {formatRevenueLabel(amount)}
                                </span>
                              );
                            })}
                          </div>
                          <p className="mt-3 text-xs text-muted leading-relaxed">
                            {state.revenue > 0
                              ? `${monthlyTier} 구간 기준으로 계산합니다.`
                              : "연매출을 넣으면 즉시 계산됩니다."}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {REVENUE_PRESETS.map((amount) => {
                            const isActive = state.revenue === amount;
                            return (
                              <button
                                key={amount}
                                type="button"
                                onClick={() => dispatch({ type: "setRevenue", value: amount })}
                                className={`text-xs rounded-[10px] px-3 py-1.5 border transition-colors ${
                                  isActive
                                    ? "btn-blue border-transparent"
                                    : "border-border hover:border-strong text-muted"
                                }`}
                              >
                                {formatRevenueLabel(amount)}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setRevenueDirectOpen((open) => !open);
                            window.requestAnimationFrame(() => revenueInputRef.current?.focus());
                          }}
                          className="text-xs text-muted hover:text-foreground underline underline-offset-4"
                        >
                          {revenueDirectOpen ? "슬라이더로 입력하기" : "정확한 숫자 직접 입력"}
                        </button>

                        {revenueDirectOpen && (
                          <div className="flex items-center border border-border bg-card focus-within:border-foreground">
                            <input
                              ref={revenueInputRef}
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              value={state.revenue > 0 ? formatNumber(state.revenue) : ""}
                              onChange={(e) =>
                                dispatch({ type: "setRevenue", value: parseCurrencyInput(e.target.value) })
                              }
                              className="flex-1 px-4 py-3 text-sm bg-transparent outline-none tabular-nums"
                              placeholder="0"
                            />
                            <span className="px-4 text-sm text-muted">원</span>
                          </div>
                        )}

                      </>
                    )}

                    {/* ─ Step 4: Staff + payroll ─ */}
                    {step.id === 4 && (
                      <>
                        <p className="text-xs text-muted leading-relaxed">
                          직원 수와 별도로, 대표·프리랜서·기타소득자·직원 외 4대보험 대상 인원도 같이 반영합니다.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-card border border-border p-4 md:p-5">
                            <div className="flex items-baseline justify-between mb-3">
                              <span className="text-xs text-muted uppercase tracking-wider">
                                직원 수
                              </span>
                              <strong className="text-2xl font-bold tabular-nums">
                                {formatStaffCount(state.staffCount)}
                              </strong>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={STAFF_RANGE_MAX}
                              step={1}
                              value={state.staffCount}
                              onChange={(e) => dispatch({ type: "setStaff", value: Number(e.target.value) })}
                              className="w-full h-[24px] accent-foreground"
                              aria-label="직원 수 슬라이더"
                            />
                            <div className="relative mt-1 h-5 text-xs text-subtle uppercase tracking-wider">
                              {([0, 5, 10, 30] as const).map((n) => {
                                const pct = (n / STAFF_RANGE_MAX) * 100;
                                return (
                                  <span
                                    key={n}
                                    className={`absolute top-0 ${n === 0 ? "translate-x-0" : "-translate-x-1/2"}`}
                                    style={{ left: `${pct}%` }}
                                  >
                                    {n === 30 ? "30+" : n}
                                  </span>
                                );
                              })}
                            </div>
                            <p className="mt-3 text-xs text-muted leading-relaxed">
                              급여 지급 직원 기준입니다. 대표, 프리랜서, 기타소득자는 아래에서 따로 입력합니다.
                            </p>
                          </div>

                          <div className="bg-card border border-border p-4 md:p-5">
                            <div className="flex items-baseline justify-between mb-3">
                              <span className="text-xs text-muted uppercase tracking-wider">
                                직원 외 신고 인원
                              </span>
                              <strong className="text-2xl font-bold tabular-nums">
                                {formatHeadcount(state.nonEmployeePayeeCount)}
                              </strong>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={STAFF_RANGE_MAX}
                              step={1}
                              value={state.nonEmployeePayeeCount}
                              onChange={(e) =>
                                dispatch({
                                  type: "setNonEmployeePayees",
                                  value: Number(e.target.value),
                                })
                              }
                              className="w-full h-[24px] accent-foreground"
                              aria-label="직원 외 신고 인원 슬라이더"
                            />
                            <div className="relative mt-1 h-5 text-xs text-subtle uppercase tracking-wider">
                              {([0, 5, 10, 30] as const).map((n) => {
                                const pct = (n / STAFF_RANGE_MAX) * 100;
                                return (
                                  <span
                                    key={n}
                                    className={`absolute top-0 ${n === 0 ? "translate-x-0" : "-translate-x-1/2"}`}
                                    style={{ left: `${pct}%` }}
                                  >
                                    {n === 30 ? "30+" : n}
                                  </span>
                                );
                              })}
                            </div>
                            <p className="mt-3 text-xs text-muted leading-relaxed">
                              대표, 프리랜서, 기타소득자, 직원 외 4대보험 대상 인원을 입력합니다.
                            </p>
                          </div>

                          <div className="bg-card border border-border p-4 md:p-5">
                            <div className="mb-2">
                              <p className="text-xs text-muted uppercase tracking-wider">
                                급여 형태
                              </p>
                            </div>
                            <div className="space-y-2">
                              {(["none", "simple", "fourInsurance"] as const).map((mode) => {
                                const isSelected = state.payrollMode === mode;
                                const labels = {
                                  none: { title: "급여 없음", desc: "원천세와 연말정산이 없는 경우" },
                                  simple: { title: "간단 급여", desc: "급여 지급은 있으나 4대보험 업무는 단순한 경우" },
                                  fourInsurance: {
                                    title: "4대보험 포함",
                                    desc: "입퇴사, 보수총액, 4대보험 연계 업무까지 포함",
                                  },
                                };
                                return (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => dispatch({ type: "setPayrollMode", value: mode })}
                                    className={`w-full text-left rounded-[10px] px-3 py-3 border transition-colors ${
                                      isSelected
                                        ? "border-foreground bg-card"
                                        : "border-border hover:border-strong"
                                    }`}
                                    aria-pressed={isSelected}
                                  >
                                    <strong className="block text-sm">{labels[mode].title}</strong>
                                    <span className="block text-xs text-muted mt-0.5 leading-relaxed">
                                      {labels[mode].desc}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="mb-2 text-xs text-muted uppercase tracking-wider">
                              직원 수 빠른 선택
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {STAFF_PRESETS.map((count) => {
                                const isActive = state.staffCount === count;
                                return (
                                  <button
                                    key={count}
                                    type="button"
                                    onClick={() => dispatch({ type: "setStaff", value: count })}
                                    className={`text-xs rounded-[10px] px-3 py-1.5 border transition-colors ${
                                      isActive
                                        ? "btn-blue border-transparent"
                                        : "border-border hover:border-strong text-muted"
                                    }`}
                                  >
                                    {count >= 30 ? "30명+" : `${count}명`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 text-xs text-muted uppercase tracking-wider">
                              직원 외 신고 인원 빠른 선택
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {EXTRA_PAYEE_PRESETS.map((count) => {
                                const isActive = state.nonEmployeePayeeCount === count;
                                return (
                                  <button
                                    key={count}
                                    type="button"
                                    onClick={() =>
                                      dispatch({ type: "setNonEmployeePayees", value: count })
                                    }
                                    className={`text-xs rounded-[10px] px-3 py-1.5 border transition-colors ${
                                      isActive
                                        ? "btn-blue border-transparent"
                                        : "border-border hover:border-strong text-muted"
                                    }`}
                                  >
                                    {count >= 30 ? "30명+" : `${count}명`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                      </>
                    )}

                    {/* ─ Step 5: Setup mode ─ */}
                    {step.id === 5 && (
                      <>
                        <p className="text-xs text-muted leading-relaxed">
                          첫 해 1회성 세팅비만 반영합니다. 월 기장료 구조는 그대로 유지됩니다.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(Object.keys(SETUP_MODES) as SetupModeKey[]).map((key) => {
                            const mode = SETUP_MODES[key];
                            const isSelected = state.setupMode === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => dispatch({ type: "setSetupMode", value: key })}
                                className={`text-left rounded-[10px] px-4 py-4 border transition-colors ${
                                  isSelected
                                    ? "border-foreground bg-card"
                                    : "border-border hover:border-strong"
                                }`}
                                aria-pressed={isSelected}
                              >
                                <div className="flex items-baseline justify-between gap-2">
                                  <strong className="text-sm">{mode.label}</strong>
                                  <span className="text-xs text-muted tabular-nums">
                                    {mode.once > 0 ? `+${formatCompactWon(mode.once)}` : "0원"}
                                  </span>
                                </div>
                                <span className="block text-xs text-muted mt-1 leading-relaxed">
                                  {mode.description}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* ─ Step 6: Add-ons + flags ─ */}
                    {step.id === 6 && (
                      <>
                        <p className="text-xs text-muted leading-relaxed">
                          반복성 있는 추가 대행업무만 체크하세요. 복잡한 예외는 별도 협의 상태로만 표시합니다.
                        </p>

                        <div>
                          <p className="t-label mb-2">
                            추가 대행업무
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {visibleAddOns.map((addon) => {
                              const isSelected = state.addOns.includes(addon.id);
                              return (
                                <button
                                  key={addon.id}
                                  type="button"
                                  onClick={() => dispatch({ type: "toggleAddOn", id: addon.id })}
                                  className={`text-left rounded-[10px] px-4 py-3 border transition-colors flex items-start gap-3 ${
                                    isSelected
                                      ? "border-foreground bg-card"
                                      : "border-border hover:border-strong"
                                  }`}
                                  aria-pressed={isSelected}
                                >
                                  <span
                                    className={`mt-0.5 w-4 h-4 border flex items-center justify-center text-xs flex-shrink-0 ${
                                      isSelected ? "btn-blue border-transparent" : "border-border"
                                    }`}
                                  >
                                    {isSelected ? "✓" : ""}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <strong className="block text-sm">{addon.title}</strong>
                                    <span className="block text-xs text-muted mt-0.5 leading-relaxed">
                                      {addon.description}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted tabular-nums flex-shrink-0">
                                    월 {formatCompactWon(addon.monthly)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <p className="t-label mb-2">
                            별도 협의가 필요한 경우
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {CUSTOM_FLAGS.map((flag) => {
                              const isSelected = state.customFlags.includes(flag.id);
                              return (
                                <button
                                  key={flag.id}
                                  type="button"
                                  onClick={() => dispatch({ type: "toggleFlag", id: flag.id })}
                                  className={`text-left rounded-[10px] px-4 py-3 border transition-colors flex items-start gap-3 ${
                                    isSelected
                                      ? "border-foreground bg-card"
                                      : "border-border hover:border-strong"
                                  }`}
                                  aria-pressed={isSelected}
                                >
                                  <span
                                    className={`mt-0.5 w-4 h-4 border flex items-center justify-center text-xs flex-shrink-0 ${
                                      isSelected ? "btn-blue border-transparent" : "border-border"
                                    }`}
                                  >
                                    {isSelected ? "✓" : ""}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <strong className="block text-sm">{flag.title}</strong>
                                    <span className="block text-xs text-muted mt-0.5 leading-relaxed">
                                      {flag.description}
                                    </span>
                                  </div>
                                  <span className="text-xs uppercase tracking-wider text-subtle flex-shrink-0">
                                    별도 협의
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                      </>
                    )}
                  </div>
              </article>
          ))}
        </div>

      </section>

      {/* ─── Result panel ─── */}
      <aside
        id="pricingResultPanel"
        className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24 self-start"
      >
        <div className="bg-card border border-border">
          <div className="px-5 md:px-6 pt-6 pb-5 border-b border-border">
            <span
              className={`inline-block text-xs uppercase tracking-[0.15em] px-2 py-1 border ${
                estimate.isCustom || estimate.needsRevenue
                  ? "border-accent-bright text-accent bg-surface"
                  : "border-border text-muted"
              }`}
            >
              {estimate.needsRevenue
                ? "연매출 입력 필요"
                : estimate.isCustom
                  ? "별도 협의 조건 있음"
                  : "즉시 계산 가능"}
            </span>
            <h2 className="mt-3 text-2xl md:text-[1.625rem] font-bold tracking-tight">
              {estimate.needsRevenue
                ? "입력이 필요합니다"
                : estimate.isCustom
                  ? "예상 시작가와 상담 포인트"
                  : "예상 보수"}
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              {estimate.needsRevenue
                ? "연매출을 넣으면 월 기장료와 연 신고료가 바로 계산됩니다."
                : estimate.isCustom
                  ? "체크한 조건은 표준 계산 범위를 넘어가므로, 아래 금액은 시작가 기준입니다."
                  : "질문형 입력 기준으로 정리한 참고용 추정치이며, 세부적인 사정에 따라 수임료는 달라질 수 있습니다."}
            </p>
          </div>

          {/* Total card */}
          <div className="px-5 md:px-6 py-6 border-b border-border">
            <span className="t-label">
              {estimate.needsRevenue
                ? "연매출 입력 후 계산"
                : estimate.isCustom
                  ? "예상 월 기장료 시작가"
                  : "예상 월 기장료"}
            </span>
            <strong className="block mt-2 text-4xl md:text-5xl font-bold tracking-tighter tabular-nums">
              {estimate.needsRevenue ? "-" : formatCompactWon(estimate.monthlyTotal)}
            </strong>
            <p className="mt-2 text-xs text-muted">
              {estimate.needsRevenue ? "연매출을 입력하면 계산됩니다" : `${formatWon(estimate.monthlyTotal)} / VAT 별도`}
            </p>
          </div>

          {/* Mini metric grid */}
          <div className="grid grid-cols-2 border-b border-border">
            <MiniMetric
              label="연 신고/조정료"
              value={estimate.needsRevenue ? "-" : formatWon(estimate.annualTotal)}
              borderRight
            />
            <MiniMetric
              label="초기 세팅비"
              value={
                estimate.needsRevenue
                  ? "-"
                  : estimate.setupFee > 0
                    ? formatWon(estimate.setupFee)
                    : "해당 없음"
              }
              note={estimate.needsRevenue ? undefined : estimate.setupAdvisory || undefined}
            />
            <MiniMetric
              label="첫 해 총 예상액"
              value={estimate.needsRevenue ? "-" : formatWon(estimate.firstYearTotal)}
              borderRight
              borderTop
            />
            <MiniMetric
              label="월 환산 총액"
              value={estimate.needsRevenue ? "-" : formatWon(estimate.monthlyEquivalent)}
              borderTop
            />
            <div className="col-span-2 border-t border-border px-4 py-3 bg-card">
              <span className="t-label">산정 기준</span>
              <strong className="block text-sm mt-1 leading-snug">
                {selectedPricing.label} · {selectedIndustry.label} (
                {getIndustryPricingBasis(state.industryId)})
              </strong>
            </div>
          </div>

          {/* CTA */}
          <div className="px-5 md:px-6 py-5 border-b border-border">
            <strong className="block text-sm">
              이 견적을 바로 전달하거나 상담으로 이어갈 수 있습니다.
            </strong>
            <p
              className={`mt-1 text-xs leading-relaxed ${
                ctaMessage?.tone === "success"
                  ? "text-accent"
                  : ctaMessage?.tone === "error"
                    ? "text-red-700"
                    : "text-muted"
              }`}
            >
              {ctaMessage?.text ??
                "공유 링크 복사 또는 문의 내용 복사로 지금 상태를 바로 전달할 수 있습니다."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onShareLink}
                className="text-xs font-medium tracking-wider uppercase btn-blue rounded-[10px] px-4 py-2.5 transition-colors"
              >
                견적 링크 복사
              </button>
              <button
                type="button"
                onClick={onCopyInquiry}
                className="text-xs font-medium tracking-wider uppercase rounded-[10px] px-4 py-2.5 border border-border text-muted hover:text-foreground hover:border-foreground transition-colors"
              >
                문의 내용 복사
              </button>
              <a
                href={contactHref}
                className="text-xs font-medium tracking-wider uppercase rounded-[10px] px-4 py-2.5 border border-border text-muted hover:text-foreground hover:border-foreground transition-colors"
              >
                상담 신청
              </a>
            </div>
          </div>

          {/* Breakdown */}
          <div className="px-5 md:px-6 py-5 border-b border-border">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="t-label text-foreground">
                산정 내역
              </h3>
              <button
                type="button"
                onClick={onCopySummary}
                className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
              >
                요약 복사
              </button>
            </div>
            {estimate.needsRevenue ? (
              <p className="text-sm text-muted">
                연매출을 입력하면 월 기장료, 연 신고료, 첫 해 총액을 바로 계산합니다.
              </p>
            ) : (
              <ul className="space-y-3">
                {estimate.breakdown.map((item, i) => (
                  <li
                    key={`${item.title}-${i}`}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <strong className="block">{item.title}</strong>
                      <span className="block text-xs text-muted mt-0.5 leading-relaxed">
                        {item.description}
                      </span>
                    </div>
                    <span className="flex-shrink-0 tabular-nums text-right">
                      <span className="text-xs text-muted">{formatCadenceLabel(item.cadence)}</span>
                      {formatCompactWon(item.price)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Included */}
          <div className="px-5 md:px-6 py-5 border-b border-border">
            <h3 className="t-label text-foreground mb-3">
              이 금액에 포함된 기본 범위
            </h3>
            <ul className="space-y-2">
              {selectedPricing.included.map((item) => (
                <li key={item.title} className="text-sm">
                  <strong className="block">{item.title}</strong>
                  <span className="block text-xs text-muted mt-0.5 leading-relaxed">
                    {item.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Notes */}
          <div className="px-5 md:px-6 py-5">
            <ul className="space-y-2 text-xs text-muted leading-relaxed">
              {estimate.isCustom && !estimate.needsRevenue && (
                <li>
                  <strong className="text-foreground">별도 협의 사유.</strong>{" "}
                  {estimate.customReasons.join(", ")}
                </li>
              )}
              {estimate.setupFee > 0 && (
                <li>
                  <strong className="text-foreground">초기 세팅비.</strong>{" "}
                  {SETUP_MODES[state.setupMode].label} 상태가 반영된 1회성 세팅비{" "}
                  {formatWon(estimate.setupFee)}이 첫 해 총액에 포함됩니다.
                </li>
              )}
              {estimate.setupAdvisory && (
                <li>
                  <strong className="text-foreground">복구 범위 안내.</strong> {estimate.setupAdvisory}
                </li>
              )}
              <li className="pt-2 text-subtle">
                {annualLabel(state.businessType)} 기준으로 연 신고료를 산정합니다.
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ─── Subcomponents ─── */

function MiniMetric({
  label,
  value,
  note,
  borderRight = false,
  borderTop = false,
}: {
  label: string;
  value: string;
  note?: string;
  borderRight?: boolean;
  borderTop?: boolean;
}) {
  return (
    <div
      className={`px-4 py-4 ${borderRight ? "border-r border-border" : ""} ${
        borderTop ? "border-t border-border" : ""
      }`}
    >
      <span className="t-label">{label}</span>
      <strong className="block text-sm md:text-base mt-1 tabular-nums">{value}</strong>
      {note && <p className="text-xs text-subtle mt-1 leading-relaxed">{note}</p>}
    </div>
  );
}

function fallbackCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}
