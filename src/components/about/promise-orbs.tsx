/* 약속 두 개. 네모 칸 두 개 대신 원 두 개가 서로 물린다.

   붙은 무대에서는 대화가 다 날아간 뒤 천천히(1.4s) 올라오고, 두 번째 원이 0.35s 늦다.
   그 전환은 globals.css 가 data-show 를 보고 건다. 쌓은 판(휴대폰 · 움직임 끔)에서는
   처음부터 다 켜진 상태다. */

const PROMISES = [
  {
    num: "01",
    title: "메리디안은 천천히 가겠습니다.",
    body: "욕심내지 않겠습니다. 빠르게 성장하기보다는, 고객과 직원 모두가 만족할 수 있는 속도로 성장하겠습니다.",
  },
  {
    num: "02",
    title: "회계사가 직접 책임 지겠습니다.",
    body: "직접 소통하겠습니다. 직원에게 책임을 전가하지 않겠습니다.",
  },
];

/* show 를 켜는 시점은 위(PromiseStage)가 정한다. 대화가 다 날아간 다음이다. */
export default function PromiseOrbs({ show = false }: { show?: boolean }) {
  return (
    <div className="promise-orbs" data-show={show || undefined}>
      {PROMISES.map((p, i) => (
        <div key={p.num} className={`promise-orb promise-orb--${i === 0 ? "a" : "b"}`}>
          <div className="promise-orb-in">
            <p className="promise-orb-num">
              <span className="promise-orb-label">약속</span>
              <span className="promise-orb-no">{p.num}</span>
            </p>
            <h3 className="promise-orb-title" style={{ wordBreak: "keep-all" }}>
              {p.title}
            </h3>
            <p className="promise-orb-body" style={{ wordBreak: "keep-all" }}>
              {p.body}
            </p>
          </div>
        </div>
      ))}

      {/* 두 원 사이의 0° 선을 없앴다. 원 둘 사이를 세로로 가르니
          두 약속이 하나로 안 읽히고 갈라져 보였다. */}
    </div>
  );
}
