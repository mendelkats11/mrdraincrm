import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WebsiteAdminPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Website</h1>
        <p className="text-sm text-muted-foreground">
          Manage the content shown on the public site (mrdrainsk.com).
        </p>
      </div>

      <Link href="/website/editor">
        <Card className="h-full border-primary/30 bg-primary/5 transition-colors hover:bg-primary/10">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Website Editor</CardTitle>
            <ArrowRight className="size-4 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Home, Jobs, Services, Service Areas, and Reviews — open any of them and edit text,
            images, and content directly on the page.
          </CardContent>
        </Card>
      </Link>

      <div>
        <p className="mb-3 text-xs font-medium text-muted-foreground">Not yet in the editor</p>
        <Link href="/website/settings">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Branding & Contact</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Tagline, About page content, public contact info, default Call Now number.
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
