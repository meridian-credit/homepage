import { requireAdmin } from "@admin/lib/session";
import TopBar from "../top-bar";

/* 로그인한 관리자만 보는 화면들의 틀. 쪽마다 requireAdmin 을 다시 부른다 — 레이아웃의 검사만으로는
   쪽의 데이터가 보호되지 않는다(레이아웃과 쪽은 따로 그려진다). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <>
      <TopBar email={user.email} siteUrl={process.env.PUBLIC_SITE_URL} />
      <main>{children}</main>
    </>
  );
}
