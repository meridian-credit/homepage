# 문의 페이지 Cloudflare 1102 대응

기존 배포 `c112e11` 이후 `/contact`에서 1102 오류가 보고됐다. Cloudflare의 최근 24시간 Worker 통계에는 `exceededResources` 9건이 있었다. 이는 Worker 전체 집계로, 해당 9건 전부의 URL이 `/contact`였다고 단정하지 않는다. 조사 중 직접 요청 8회는 200이었지만, 실시간 로그에서 기존 `/contact` 요청의 CPU 사용 시간이 249ms로 확인됐다. 정상 응답이 한 번 나왔다고 한도 초과 가능성이 해소되는 것은 아니다.

기존 구현은 문의 초안을 URL에서 읽기 위해 서버 페이지에서 `await searchParams`를 호출했다. 그 결과 고정된 문의 화면까지 매 요청마다 렌더링됐다. 회원별 서버 데이터가 필요 없는 페이지이므로 이 비용을 제거했다.

- `/contact`의 고정 화면과 기본 폼을 빌드 시 생성한다.
- 서비스·견적·기존 message 쿼리 해석을 작은 `ContactInquiry` 클라이언트 컴포넌트로 이동한다.
- Suspense 범위는 폼에 한정하고 기존 폼을 fallback으로 제공한다. JavaScript가 꺼져도 입력 화면과 직접 연락처는 표시된다.
- URL 변경 시 초안을 새로 적용하고, 같은 URL의 일반 입력·오류 재시도에서는 입력 상태를 유지한다.
- 문의 발송 API와 Cloudflare 요금제·리소스 한도는 변경하지 않는다.
- Wrangler가 만든 `.wrangler/` 임시 번들은 소스 lint 대상에서 제외한다.

빌드의 `/contact`가 `ƒ`에서 `○`로 바뀌었고, prerender manifest에 재검증 없는 정적 경로로 등록됐다. 이 조건과 JS 비활성 기본 폼을 회귀 테스트로 추가했다. 서비스 9개 맥락과 견적 전달, 성공·오류·429·timeout의 기존 브라우저 검사도 수행한다. 실제 메일 발송은 mock으로 차단한다.

1102의 정의는 [Cloudflare 오류 문서](https://developers.cloudflare.com/workers/observability/errors/) 참조. 이번 수정은 문의 페이지의 요청별 렌더링 비용을 제거하며, 검색·실제 문의 API 등 다른 동적 경로의 CPU 한도까지 해결했다는 의미는 아니다.

추가 실시간 로그에서 기존 배포의 `/contact` 요청이 `exceededCpu`로 끝난 것도 확인했다. 정적 페이지 전환만 한 중간 배포에서도 일반 요청 CPU가 37~66ms여서 어댑터 설정을 추가 수정했다. [OpenNext의 SSG 권장 설정](https://opennext.js.org/cloudflare/caching)에 따라 `staticAssetsIncrementalCache`와 `enableCacheInterception`을 활성화한다. 이미 생성된 페이지는 Next 서버를 실행하기 전에 정적 캐시에서 응답한다. 런타임 ISR은 사용하지 않으며 콘텐츠 갱신은 새 빌드·배포로 반영한다.

프리뷰 배포 설정을 `open-next.preview.config.mjs`, `wrangler.preview.jsonc`로 버전 관리한다. 기존 로컬 설정 파일에 의존하지 않는 실행 명령은 다음과 같다.

```sh
npm install --no-save --package-lock=false @opennextjs/cloudflare@1.20.6 wrangler@4.125.0
npx opennextjs-cloudflare build --config wrangler.preview.jsonc --openNextConfigPath open-next.preview.config.mjs
npx opennextjs-cloudflare deploy --config wrangler.preview.jsonc
```

> 2026-09-30: 두 설정 파일은 저장소에서 지웠다. 프리뷰 worker 도 2026-09-27 에 지웠다. 다시 쓰려면 `git show d135d60:wrangler.preview.jsonc` 처럼 꺼낸다.

배포 명령에는 기존 환경의 Cloudflare 자격 증명이 필요하다. 문의 API용 자격 증명을 새로 추가하거나 요금제를 변경하지 않는다.

## 최종 관측과 남은 한계

`d9b6b19` 배포 후 `/contact` 10회 모두 200, 보안 CSP 유지, 모바일의 내부 링크 진입과 견적 초안 전달 성공, 브라우저 JS 오류 0건을 확인했다. `x-opennext-cache: HIT`도 확인했다. 하지만 초기 요청 CPU는 278ms, 이후 9회는 29~67ms로 기록되어 어댑터 자체의 처리 비용은 여전히 남는다. 정적 캐시 적용만으로 1102 재발 방지가 완료됐다고 판단하지 않는다.

계정 구독 조회에는 Workers 유료 구독이 없었고, [Workers Free CPU 한도는 요청당 10ms](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)다. 한도 초과를 간헐적으로 허용하는 여유가 있어 200과 1102가 번갈아 나타날 수 있다. 안정적으로 이 Next.js 어댑터를 운영하려면 Workers Paid로 전환하거나, HTML/RSC를 Worker 실행 없이 제공하는 별도 정적 배포 구조 또는 다른 Next.js 호스팅으로 옮겨야 한다. 요금제 변경은 실행하지 않았다.

검증: 문의 관련 24개 시나리오와 정적 렌더링/JS 비활성 8개 시나리오 통과. 최초 실행의 Firefox timeout 테스트는 테스트 산출물 정리 경합으로 종료 단계에서 실패해 단독 재실행했고 통과했다. 앱 기능 assertion 실패는 아니었다. lint 오류 0, 기존 이미지 경고 3.
