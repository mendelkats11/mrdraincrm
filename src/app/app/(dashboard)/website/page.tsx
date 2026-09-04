import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// "Homepage" no longer has its own tile here — editing the homepage now
// happens in the visual editor above, which renders and edits the real
// sections directly instead of a form-next-to-an-iframe layout. The rest
// stay here until each gets the same in-context treatment.
const SECTIONS = [
  {
    href: "/website/services",
    label: "Services",
    description: "The 20-item service catalog shown on the public site.",
  },
  {
    href: "/website/service-areas",
    label: "Service Areas",
    description: "Neighbourhoods/communities served, with copy, images, and Call Now numbers.",
  },
  {
    href: "/website/gallery",
    label: "Gallery",
    description: "Real completed-job photos shown publicly.",
  },
  {
    href: "/website/reviews",
    label: "Reviews",
    description: "Manually entered customer testimonials.",
  },
  {
    href: "/website/settings",
    label: "Branding & Contact",
    description: "Tagline, About page content, public contact info, default Call Now number.",
  },
] as const;

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
            Open the homepage as it actually looks, and edit text, images, and sections directly on
            the page.
          </CardContent>
        </Card>
      </Link>

      <div>
        <p className="mb-3 text-xs font-medium text-muted-foreground">Not yet in the editor</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{section.label}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {section.description}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
