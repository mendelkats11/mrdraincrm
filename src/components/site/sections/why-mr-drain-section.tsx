import { Clock, DollarSign, MapPin, Sparkles } from "lucide-react";

const POINTS = [
  {
    icon: MapPin,
    title: "Local & family-owned",
    body: "Based right here in Saskatoon — we know the area and the neighbourhoods we serve.",
  },
  {
    icon: DollarSign,
    title: "Upfront, honest pricing",
    body: "You'll know the cost before we start. No surprise fees, no upselling.",
  },
  {
    icon: Clock,
    title: "Fast response",
    body: "We show up when we say we will, and we move quickly on urgent issues.",
  },
  {
    icon: Sparkles,
    title: "Clean, respectful work",
    body: "We treat your home like our own — clean workspace, clear communication.",
  },
] as const;

export function WhyMrDrainSection({ heading, body }: { heading?: string; body?: string }) {
  return (
    <section className="bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <h2 className="text-3xl font-bold text-brand-navy">{heading || "Why Mr. Drain"}</h2>
          {body ? <p className="max-w-xl text-foreground/70">{body}</p> : null}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((point) => (
            <div key={point.title} className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <point.icon className="size-6" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-brand-navy">{point.title}</h3>
              <p className="text-sm text-foreground/70">{point.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
