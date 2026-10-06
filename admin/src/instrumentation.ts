/* 앱이 뜰 때 한 번: 콘텐츠 표 이전 → 처음이면 코드 값으로 채우기 → 로그인 표 이전.
   배포 스크립트는 이 앱이 먼저 떠서 이 일을 끝낸 뒤에 공개 사이트를 빌드한다(공개 빌드가 같은 DB 를 읽는다). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { migrate, seed } = await import("@admin/lib/db");
  migrate();
  seed();
  const { getMigrations } = await import("better-auth/db/migration");
  const { authOptions } = await import("@admin/lib/auth");
  const { runMigrations } = await getMigrations(authOptions());
  await runMigrations();
}
