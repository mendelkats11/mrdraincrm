import { getDb } from "@/lib/db/client";
import { listReviewsForAdmin } from "@/lib/website/reviews";
import { EditorShell } from "../editor-shell";
import { ReviewsEditor } from "./reviews-editor";

export const dynamic = "force-dynamic";

export default async function WebsiteEditorReviewsPage() {
  const db = getDb();
  const reviews = await listReviewsForAdmin(db);

  return (
    <div className="-m-6">
      <EditorShell active="reviews" />
      <ReviewsEditor reviews={reviews} />
    </div>
  );
}
