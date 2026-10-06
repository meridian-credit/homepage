import { readFaq } from "@admin/lib/content";
import { requireAdmin } from "@admin/lib/session";
import FaqForm from "./faq-form";

export const metadata = { title: "자주 묻는 질문" };

export default async function FaqPage() {
  await requireAdmin();
  const state = readFaq();
  return (
    <>
      <h1>자주 묻는 질문</h1>
      <p className="lead">FAQ 쪽과 문의 쪽 아래에 같은 목록이 나옵니다. 검색 엔진용 구조화 데이터도 이 목록으로 만듭니다.</p>
      <FaqForm initial={state.items} revision={state.revision} />
    </>
  );
}
