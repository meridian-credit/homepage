import { contentType } from "@admin/content/registry";
import { readFaq } from "@admin/lib/content";
import { requireAdmin } from "@admin/lib/session";
import { PageHeader } from "@admin/ui/page-header";
import FaqEditor from "./faq-editor";

export const metadata = { title: "자주 묻는 질문" };

export default async function FaqPage() {
  await requireAdmin();
  const state = readFaq();
  const type = contentType("faq");
  const site = process.env.PUBLIC_SITE_URL;
  const siteUrl = site ? `${site}${type.sitePath}` : undefined;
  return (
    <>
      <PageHeader title={type.label} desc={type.appears} siteHref={siteUrl} historyHref="/history?type=faq" />
      <FaqEditor data={{ items: state.items }} revision={state.revision} siteUrl={siteUrl} />
    </>
  );
}
