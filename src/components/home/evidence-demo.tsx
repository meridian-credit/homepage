"use client";
import { useState, useRef, useEffect } from 'react';
import { useInViewOnce } from "@/lib/in-view";
import { usePrefersReducedMotion as useReducedMotion } from "@/lib/use-media";
import { evidenceData } from '@/lib/evidence-demo';

const periods = [{ id: 'm', label: '이번 달' }, { id: 'l', label: '지난달' }, { id: 'q', label: '이번 분기' }, { id: 'y', label: '올해' }] as const;
type Period = typeof periods[number]['id'];
const metrics = [{"label": "매출 합계", "values": {"m": "184,920,000", "l": "171,340,000", "q": "512,880,000", "y": "1,946,220,000"}, "compare": {"m": "전년 동월 +12.3%", "l": "전년 동월 +8.1%", "q": "전년 동기 +10.4%", "y": "전년 +14.2%"}, "down": false}, {"label": "매입 합계", "values": {"m": "121,405,000", "l": "118,220,000", "q": "349,610,000", "y": "1,332,880,000"}, "compare": {"m": "전년 동월 +4.8%", "l": "전년 동월 +3.2%", "q": "전년 동기 +5.1%", "y": "전년 +6.0%"}, "down": true}, {"label": "잠정 손익", "values": {"m": "48,595,000", "l": "38,200,000", "q": "118,510,000", "y": "434,300,000"}, "compare": {"m": "전년 동월 +28.7%", "l": "전년 동월 +19.4%", "q": "전년 동기 +23.9%", "y": "전년 +31.1%"}, "down": false}, {"label": "부가세 예상", "values": {"m": "6,351,500", "l": "5,312,000", "q": "16,327,000", "y": "61,334,000"}, "compare": {"m": "불공제 후보 4건", "l": "불공제 후보 2건", "q": "불공제 후보 9건", "y": "불공제 후보 27건"}, "down": false}];
function DemoNumber({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInViewOnce(ref);
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (!visible || reduced) return;
    let frame = 0;
    const start = performance.now();
    const target = Number(value.replaceAll(',', ''));
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 650, 1);
      setDisplay(Math.round(target * (1 - Math.pow(1 - progress, 3))).toLocaleString('ko-KR'));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, visible, reduced]);
  return <span ref={ref} className="val num">{reduced ? value : display}</span>;
}
function Formula({ text }: { text: string }) {
  return text.split(/(<br>|<em>.*?<\/em>)/).map((part, i) => part === '<br>' ? <br key={i} /> : part.startsWith('<em>') ? <em key={i}>{part.slice(4, -5)}</em> : part);
}
export default function EvidenceDemo() {
  const [period, setPeriod] = useState<Period>('m');
  const [metric, setMetric] = useState(0);
  const detail = evidenceData[period][metric];
  return <section id="evid" style={{ background: 'var(--w-2)' }}>
    <div className="wrap">
      <p className="tick rise">숫자를 누르면</p>
      <h2 className="sec rise">그 숫자가 어디서 왔는지 나옵니다<span className="dot-b">.</span></h2>
      <p className="lede rise"><span className="s">합계만 보여주고 끝내지 않습니다.</span><span className="s">계산식과 집계 건수, 원본 증빙까지 이어집니다.</span></p>
      <div className="panel rise" style={{ background: 'var(--w)' }}>
        <div className="tabs" role="tablist" aria-label="기간">
          {periods.map((item, index) => <button key={item.id} id={`period-${item.id}`} className="tab" role="tab" aria-selected={period === item.id} aria-controls="period-panel" tabIndex={period === item.id ? 0 : -1} onClick={() => setPeriod(item.id)} onKeyDown={event => {
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? 3 : event.key === 'ArrowRight' ? (index + 1) % 4 : event.key === 'ArrowLeft' ? (index + 3) % 4 : -1;
            if (next < 0) return;
            event.preventDefault(); setPeriod(periods[next].id); document.getElementById(`period-${periods[next].id}`)?.focus();
          }}>{item.label}</button>)}
        </div>
        <div id="period-panel" role="tabpanel" aria-labelledby={`period-${period}`}>
          <div className="kpis">{metrics.map((item, index) => <button key={item.label} className="kpi" aria-pressed={metric === index} aria-controls="evidence-detail" onClick={() => setMetric(index)}>
            <span className="lab">{item.label}</span><DemoNumber value={item.values[period]} />
            <span className={`cmp${item.down ? ' dn' : ''}`}>{item.compare[period]}</span>
          </button>)}</div>
          <div className="evid" id="evidence-detail" aria-live="polite">
            <div><h3>계산식</h3><div className="formula"><Formula text={detail.f} /></div><p className="evid-note">표시된 숫자는 예시입니다. 실제 고객 데이터가 아닙니다.</p></div>
            <div><h3>{detail.t}</h3><p className="rnote">{detail.n}</p><div className="rows">{detail.r.map(([label, value], index) => <div className="rw" key={index}><span>{label}</span><span>{value}</span></div>)}</div></div>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
