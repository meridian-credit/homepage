import { seoulToday } from "@/lib/schedule";
import { scheduleStatus } from "@admin/content/schedule";
import { readSchedule } from "@admin/lib/content";
import { requireAdmin } from "@admin/lib/session";
import { Shell } from "@admin/ui/shell";

/* 로그인한 관리자만 보는 화면들의 틀. 쪽마다 requireAdmin 을 다시 부른다 — 레이아웃의 검사만으로는
   쪽의 데이터가 보호되지 않는다(레이아웃과 쪽은 따로 그려진다).
   메뉴의 점: 세무 일정이 30일 안에 바닥나면 주황, 이미 바닥났으면 빨강. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const { level } = scheduleStatus(readSchedule().items, seoulToday());
  const siteUrl = process.env.PUBLIC_SITE_URL;
  return (
    <Shell
      user={{ name: user.name, username: user.username }}
      siteUrl={siteUrl}
      siteLabel={process.env.ADMIN_ENV_BAND ? "개발 사이트 열기" : "사이트 열기"}
      alerts={level === "ok" ? {} : { schedule: level }}
    >
      {children}
    </Shell>
  );
}
