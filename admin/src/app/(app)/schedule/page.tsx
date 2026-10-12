import { seoulToday } from "@/lib/schedule";
import { contentType } from "@admin/content/registry";
import { readSchedule } from "@admin/lib/content";
import { requireAdmin } from "@admin/lib/session";
import { PageHeader } from "@admin/ui/page-header";
import ScheduleEditor from "./schedule-editor";

export const metadata = { title: "세무 일정" };

export default async function SchedulePage() {
  await requireAdmin();
  const state = readSchedule();
  const type = contentType("schedule");
  const site = process.env.PUBLIC_SITE_URL;
  const siteUrl = site ? `${site}${type.sitePath}` : undefined;
  return (
    <>
      <PageHeader title={type.label} desc={type.appears} siteHref={siteUrl} historyHref="/history?type=schedule" />
      <ScheduleEditor
        data={{ items: state.items, reviewedAt: state.reviewedAt }}
        revision={state.revision}
        today={seoulToday()}
        siteUrl={siteUrl}
      />
    </>
  );
}
