import { getDb } from "@/lib/db/client";
import { listReviewsForAdmin } from "@/lib/website/reviews";
import { getPublicSiteOrigin } from "@/lib/site-url";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SitePreviewPane } from "@/components/site-preview-pane";
import { NewReviewDialog } from "./new-review-dialog";
import { ReviewRowActions } from "./review-row-actions";

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

export default async function WebsiteReviewsPage() {
  const db = getDb();
  const reviews = await listReviewsForAdmin(db);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Reviews</h1>
            <p className="text-sm text-muted-foreground">
              Manually entered — no automatic Google review verification.
            </p>
          </div>
          <NewReviewDialog />
        </div>

        {reviews.length === 0 ? (
          <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            No reviews yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">{review.customerName}</TableCell>
                    <TableCell>{review.rating} / 5</TableCell>
                    <TableCell className="text-muted-foreground">
                      {DATE_FMT.format(review.reviewDate)}
                    </TableCell>
                    <TableCell>{review.featured ? <Badge>Featured</Badge> : null}</TableCell>
                    <TableCell className="text-right">
                      <ReviewRowActions review={review} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <SitePreviewPane origin={getPublicSiteOrigin()} path="/reviews" />
    </div>
  );
}
