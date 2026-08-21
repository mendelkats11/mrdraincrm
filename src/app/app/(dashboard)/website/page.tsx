import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    href: "/website/homepage",
    label: "Homepage",
    description: "Which sections show on the homepage, in what order.",
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
  );
}
