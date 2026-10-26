import { redirect } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { WeekReviewPage } from "@/components/weekoverzicht/review-page";
import { getRequestUser } from "@/lib/auth/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewPeriod } from "@/lib/weekly-review/period";
import { loadWeekReview, markWeekReviewSeen } from "@/lib/weekly-review/service";

export const metadata = { title: "Weekoverzicht" };

export default async function WeekoverzichtPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const period = reviewPeriod();
  const admin = createAdminClient();
  const review = await loadWeekReview(admin, user.id, period.weekStart, period.nextWeekStart, { create: true }).catch(() => null);
  if (review && !review.seen) await markWeekReviewSeen(admin, user.id, review.weekStart).catch(() => null);

  if (!review) {
    return (
      <div className="space-y-6">
        <PageHeader title="Weekoverzicht" />
        <EmptyState>Vorige week stond er niets op je naam om op terug te blikken.</EmptyState>
      </div>
    );
  }
  return <WeekReviewPage review={review} />;
}
