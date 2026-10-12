import { redirect } from "next/navigation";
import { currentSession } from "@admin/lib/session";
import LoginForm from "./login-form";

export const metadata = { title: "로그인" };

export default async function LoginPage() {
  if (await currentSession()) redirect("/");
  return (
    <main className="login">
      <div className="card">
        <h1>메리디안 관리자</h1>
        <p className="lead">세무 일정과 자주 묻는 질문을 고치는 곳입니다.</p>
        <LoginForm />
      </div>
    </main>
  );
}
