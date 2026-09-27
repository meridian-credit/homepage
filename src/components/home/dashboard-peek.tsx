/* 홈의 대시보드 배너에 들어가는 화면. 캡처 이미지가 아니라 요소로 그린다.
   /portal 의 큰 화면과 같은 클래스(.db …)를 쓰므로 색·간격이 저절로 같다.
   여기서는 배너 폭에 맞게 항목을 줄인 축소판이다.

   이미지를 쓰지 않는 이유: 스크린샷은 글자가 흐려지고, 숫자를 고칠 때마다
   다시 찍어야 한다. 요소로 그리면 어느 해상도에서도 또렷하다. */

export default function DashboardPeek() {
  return (
    /* 그림이다. 안의 글자는 화면 모양을 보여 주려는 것이라 읽어 줄 내용이 아니고,
       크기도 배너 폭을 따라 줄어든다(최소 글자 12px 의 예외). role="img" 로 한 장의
       그림으로 읽히게 한다 — 이게 없으면 div 의 aria-label 은 읽히지도 않는다. */
    <div className="dpk" role="img" aria-label="MERIDIAN 세무 대시보드 화면 예시">
      <div className="dpk-win">
        <div className="db">
          <aside className="db-side">
            <p className="db-brand">MERIDIAN<span>TAX &amp; ADVISORY</span></p>
            <p className="db-co">㈜메리디안 데모</p>
            <p className="db-gr">개요</p>
            <p className="db-mi on">홈</p>
            <p className="db-gr">증빙</p>
            <p className="db-mi">세금계산서</p>
            <p className="db-mi">현금영수증</p>
            <p className="db-mi">신용카드</p>
            <p className="db-mi">통장</p>
            <p className="db-gr">장부·신고</p>
            <p className="db-mi">분개·전표</p>
            <p className="db-mi">재무제표</p>
            <p className="db-mi">부가세 리포트</p>
          </aside>

          <div className="db-main">
            <header className="db-bar">
              <span className="db-pick"><i></i>㈜메리디안 데모</span>
              <span className="db-search">거래처, 금액, 증빙 검색<b>⌘K</b></span>
              <span className="db-live"><i></i>반영 08-10 03:35</span>
            </header>

            <div className="db-body">
              <p className="db-eyebrow">종합 현황</p>
              <div className="db-h1row">
                <p className="db-h1">한눈에 보는 우리 회사</p>
                <div className="db-seg"><span className="on">최근 반영월</span><span>올해</span><span>이번달</span></div>
              </div>
              <p className="db-tagline"><b>2026년 7월 확정자료</b> 국세청 수집자료 기준</p>

              <div className="db-row2">
                <div className="db-vat">
                  <p className="k3">납부 예상 부가세 <span>2026년 7월 기준</span></p>
                  <p className="v3 num">6,351,500<em>원</em></p>
                  <p className="m3"><b>납부 예상</b> 매출세액 18,492,000원 &nbsp; 공제 매입세액 12,140,500원</p>
                </div>
                <div className="db-card">
                  <p className="k2">월별 추이</p>
                  <div className="ui-bars sm">
                    <div className="bg"><span className="b now" style={{ "--h": "96%" } as React.CSSProperties}></span><span className="b old" style={{ "--h": "22%" } as React.CSSProperties}></span><i>1월</i></div>
                    <div className="bg"><span className="b now" style={{ "--h": "8%" } as React.CSSProperties}></span><span className="b old" style={{ "--h": "8%" } as React.CSSProperties}></span><i>2월</i></div>
                    <div className="bg"><span className="b now" style={{ "--h": "9%" } as React.CSSProperties}></span><span className="b old" style={{ "--h": "10%" } as React.CSSProperties}></span><i>3월</i></div>
                    <div className="bg"><span className="b now" style={{ "--h": "18%" } as React.CSSProperties}></span><span className="b old" style={{ "--h": "12%" } as React.CSSProperties}></span><i>4월</i></div>
                    <div className="bg"><span className="b now" style={{ "--h": "11%" } as React.CSSProperties}></span><span className="b old" style={{ "--h": "22%" } as React.CSSProperties}></span><i>5월</i></div>
                    <div className="bg"><span className="b now" style={{ "--h": "14%" } as React.CSSProperties}></span><span className="b old" style={{ "--h": "16%" } as React.CSSProperties}></span><i>6월</i></div>
                  </div>
                  <p className="m2">최근 6개월 매출 512,880,000원 · 매입 349,610,000원</p>
                </div>
              </div>

              <div className="db-row3">
                <div className="db-card sm"><p className="k2">다음 부가세 신고</p><p className="v2">2기 예정 신고</p><p className="m2">예상액 확인 →</p></div>
                <div className="db-card sm"><p className="k2">불공제 후보</p><p className="v2">4건 · 1,240,000원</p><p className="m2">리스트 펼치기 ▾</p></div>
                <div className="db-card sm"><p className="k2">카드 자료</p><p className="v2">7월까지 반영</p><p className="m2">정상 반영 중 ✓</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
