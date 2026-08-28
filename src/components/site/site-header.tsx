"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhoneForDisplay } from "@/lib/phone";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/gallery", label: "Gallery" },
  { href: "/reviews", label: "Reviews" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export interface ServiceAreaNavItem {
  slug: string;
  name: string;
}

export function SiteHeader({
  trackingNumber,
  serviceAreas,
}: {
  trackingNumber: string | null;
  serviceAreas: ServiceAreaNavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <Image
            src="/logo.png"
            alt="Mr. Drain Plumbing"
            width={140}
            height={103}
            priority
            className="h-12 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.slice(0, 2).map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-secondary text-primary" : "text-foreground/80 hover:text-primary",
                )}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="group relative">
            <Link
              href="/service-areas"
              aria-current={pathname.startsWith("/service-areas") ? "page" : undefined}
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/service-areas")
                  ? "bg-secondary text-primary"
                  : "text-foreground/80 hover:text-primary",
              )}
            >
              Service Areas
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </Link>
            {serviceAreas.length > 0 ? (
              <div className="invisible absolute top-full left-0 z-10 min-w-48 rounded-xl border border-black/5 bg-white p-1.5 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100">
                {serviceAreas.map((area) => (
                  <Link
                    key={area.slug}
                    href={`/service-areas/${area.slug}`}
                    className="block rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-secondary hover:text-primary"
                  >
                    {area.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {NAV_LINKS.slice(2).map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-secondary text-primary" : "text-foreground/80 hover:text-primary",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          {trackingNumber ? (
            <a
              href={`tel:${trackingNumber}`}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
            >
              <Phone className="size-4" aria-hidden="true" />
              {formatPhoneForDisplay(trackingNumber)}
            </a>
          ) : null}
          <Link
            href="/contact"
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-transform hover:scale-[1.02]"
          >
            Get a Free Quote
          </Link>
        </div>

        <button
          type="button"
          className="flex items-center justify-center rounded-md p-2 text-foreground lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open ? (
        <nav className="flex flex-col gap-1 border-t border-black/5 bg-white px-4 py-3 lg:hidden">
          {NAV_LINKS.slice(0, 2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/service-areas"
            onClick={() => setOpen(false)}
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-primary"
          >
            Service Areas
          </Link>
          {NAV_LINKS.slice(2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
