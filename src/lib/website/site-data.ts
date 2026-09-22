// Static content for the entire public website (Sep 2026) - replaces the
// Neon Postgres-backed CMS entirely. The business no longer uses the private
// admin app/CRM, so a live database is unnecessary overhead and cost for a
// site whose content changes rarely; this file is now the single source of
// truth for every service/area/settings value the public site renders.
// Content changes go through editing this file directly (same "prompt me"
// workflow already used all along), not a live database or admin UI.
//
// All data here is either the business's real, previously-live content
// (settings, area addresses/Maps links, portfolio job details, gallery
// captions) or newly-written replacement copy in the same voice, for the
// handful of services/areas whose original database rows became
// unrecoverable when the Neon project hit its usage quota. No fabricated
// business facts (licensing, insurance, years in business, review counts)
// appear anywhere in this file - see docs/DESIGN_SYSTEM.md §3.

import { termsOfServiceContent, privacyPolicyContent } from "./legal-content";

export interface Faq {
  question: string;
  answer: string;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  content: string;
  faqs: Faq[];
  imageKey: string | null;
}

export interface ServiceArea {
  id: string;
  name: string;
  slug: string;
  copy: string;
  faqs: Faq[];
  images: string[];
  callrailTrackingNumber: string | null;
  businessAddress: string;
  googleMapsUrl: string;
}

export interface PortfolioJob {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageKey: string;
  serviceAreaSlug: string | null;
}

export interface GalleryPhoto {
  id: string;
  storageKey: string;
  caption: string;
}

export const siteSettings = {
  businessName: "Mr. Drain Plumber",
  businessAddress: "147 Dagnone Ln, Saskatoon, SK S7V 0R1",
  tagline: "Need a Plumber in Saskatoon? We'll Get It Fixed Fast.",
  footerTagline: "Mr. Drain - Local, reliable plumbing",
  aboutHeading: "About Mr. Drain Plumbing",
  aboutBody: [
    "Mr. Drain Plumbing is a locally owned and operated plumbing company serving Saskatoon and the surrounding area. We show up on time, explain what's actually wrong, and do the job right the first time, no upsells, no surprises.",
    "We are happy to be serving Saskatoon with stellar service for quite a while, and look forward to continue doing so!",
    "Please contact us for any issues you have, and we will make sure to take care of it and leave you satisfied.",
  ].join("\n"),
  publicContactEmail: "info@mrdrainsk.com",
  defaultCallrailTrackingNumber: "639-307-3028",
  reviewsPageEnabled: false,
  termsOfServiceContent,
  privacyPolicyContent,
};

export const serviceAreas: ServiceArea[] = [
  {
    id: "area-brighton",
    name: "Brighton",
    slug: "brighton",
    copy: "Brighton is one of Saskatoon's newest growing neighbourhoods, and new-build plumbing brings its own issues. Fixture defects, improperly sealed connections, and settling pipes are all things we catch early for Brighton homeowners.",
    faqs: [
      {
        question: "Is there an extra charge to service Brighton?",
        answer: "No - Brighton is part of our standard Saskatoon service area.",
      },
      {
        question: "What plumbing issues are common in new Brighton homes?",
        answer:
          "As one of Saskatoon's newest neighbourhoods, Brighton homes more often see new-build issues - fixture defects, improperly sealed connections, or settling-related pipe movement - rather than aging-pipe problems.",
      },
      {
        question: "Do you handle emergency plumbing calls in Brighton?",
        answer: "Yes.",
      },
    ],
    images: ["public-assets/services/d8f31fa0-afed-4558-a5b6-d580d2f82476.jpeg"],
    callrailTrackingNumber: null,
    businessAddress: "147 Dagnone Ln, Saskatoon, SK S7V 0R1",
    googleMapsUrl:
      "https://www.google.com/maps/place/Mr.+Drain+Plumber+of+Brighton+Saskatoon/@52.1503592,-106.8292168,11z/data=!4m6!3m5!1s0x5304f3f013b7ac99:0xe39d43857740f53d!8m2!3d52.1301506!4d-106.5506666!16s%2Fg%2F11nv043gvd",
  },
  {
    id: "area-rosewood",
    name: "Rosewood",
    slug: "rosewood",
    copy: "Rosewood is a fast-growing neighbourhood on Saskatoon's south side, with a mix of newer builds and homes now old enough to need their first major plumbing work. We handle both new-construction issues and the early signs of aging pipes for Rosewood homeowners.",
    faqs: [
      {
        question: "Is there an extra charge to service Rosewood?",
        answer: "No - Rosewood is part of our standard Saskatoon service area.",
      },
      {
        question: "What plumbing issues are common in Rosewood homes?",
        answer:
          "Rosewood has a mix of newer and established homes, so we see everything from new-build fixture issues to aging shut-off valves and water heaters reaching the end of their lifespan.",
      },
      {
        question: "Do you handle emergency plumbing calls in Rosewood?",
        answer: "Yes.",
      },
    ],
    images: ["public-assets/services/3f54873f-7504-4f6a-b06c-258a246b009f.jpeg"],
    callrailTrackingNumber: null,
    businessAddress: "1354 Kingsmere Blvd, Saskatoon, SK S7J 5H8",
    googleMapsUrl:
      "https://www.google.com/maps/place/Mr.+Drain+Plumber+of+Rosewood+Saskatoon/@52.1501295,-106.8292175,11z/data=!4m7!3m6!1s0x5304f3a83ac3d221:0x7bc3a00e5e23016a!8m2!3d52.0913909!4d-106.57587!16s%2Fg%2F11nvht9czy",
  },
  {
    id: "area-college-park",
    name: "College Park",
    slug: "college-park",
    copy: "College Park is one of Saskatoon's more established neighbourhoods, so we see a fair share of aging pipes, older water heaters, and outdated fixtures that are due for an upgrade. We're familiar with the plumbing common to homes built in this part of the city.",
    faqs: [
      {
        question: "Is there an extra charge to service College Park?",
        answer: "No - College Park is part of our standard Saskatoon service area.",
      },
      {
        question: "What plumbing issues are common in College Park homes?",
        answer:
          "As an established neighbourhood, College Park homes more often need work on aging pipes, older water heaters, and original fixtures than new-build issues.",
      },
      {
        question: "Do you handle emergency plumbing calls in College Park?",
        answer: "Yes.",
      },
    ],
    images: ["public-assets/services/f9bc967b-0dd7-4ada-bf3b-a068becaf30c.jpeg"],
    callrailTrackingNumber: null,
    businessAddress: "82 Leddy Crescent, Saskatoon, SK S7H 3Y8",
    googleMapsUrl:
      "https://www.google.com/maps/place/Mr.+Drain+Plumber+of+College+Park+Saskatoon/@52.1496701,-106.8292188,11z/data=!4m7!3m6!1s0x5304f36358848093:0x8f801c298727c541!8m2!3d52.1172504!4d-106.5973438!16s%2Fg%2F11nv2wzm70",
  },
  {
    id: "area-stonebridge",
    name: "Stonebridge",
    slug: "stonebridge",
    copy: "Stonebridge is another of Saskatoon's newer neighbourhoods, and like other recently built areas, most of the plumbing calls we get here involve new-construction issues rather than aging infrastructure. We check for fixture defects and improperly sealed connections other new homes in the area commonly run into.",
    faqs: [
      {
        question: "Is there an extra charge to service Stonebridge?",
        answer: "No - Stonebridge is part of our standard Saskatoon service area.",
      },
      {
        question: "What plumbing issues are common in new Stonebridge homes?",
        answer:
          "Similar to other newer Saskatoon neighbourhoods, Stonebridge homes more often see new-build issues like fixture defects or improperly sealed connections rather than aging-pipe problems.",
      },
      {
        question: "Do you handle emergency plumbing calls in Stonebridge?",
        answer: "Yes.",
      },
    ],
    images: ["public-assets/services/a1f2b3a3-d231-4269-b99e-1e214343b98e.jpeg"],
    callrailTrackingNumber: null,
    businessAddress: "235 Galloway Rd, Saskatoon, SK S7T 0B2",
    googleMapsUrl:
      "https://www.google.com/maps/place/Mr.+Drain+Plumber+of+Stonebridge+Saskatoon/@52.1498998,-106.8292181,11z/data=!4m7!3m6!1s0x5304f17ed3902691:0xcbb1c49548b8d98b!8m2!3d52.0821878!4d-106.6349732!16s%2Fg%2F11nvs770ws",
  },
  {
    id: "area-martensville",
    name: "Martensville",
    slug: "martensville",
    copy: "Just north of Saskatoon, Martensville homeowners get the same fast response and straightforward pricing as anywhere else in our service area - no extra trip charge for being outside the city limits.",
    faqs: [
      {
        question: "Do you charge extra to travel to Martensville?",
        answer:
          "No - Martensville homeowners get the same pricing and response as anywhere else in our service area, with no extra trip charge for being outside Saskatoon city limits.",
      },
      {
        question: "Is Martensville considered part of Saskatoon?",
        answer:
          "No, Martensville is a separate town just north of Saskatoon, but it's fully within our regular service area.",
      },
      {
        question: "Do you handle emergency plumbing calls in Martensville?",
        answer: "Yes.",
      },
    ],
    images: ["public-assets/services/ec664868-e988-4870-9480-ddd4438042b2.jpeg"],
    callrailTrackingNumber: "639-740-0615",
    businessAddress: "570 Klassen Crescent, Martensville, SK S0K 0A2",
    googleMapsUrl:
      "https://www.google.com/maps/place/Mr.+Drain+Plumber+of+Martensville/@52.1440406,-107.3237762,9z/data=!4m7!3m6!1s0x53045db19c662be3:0x6be816af3c9d6fd8!8m2!3d52.2969989!4d-106.658759!16s%2Fg%2F11zf6jm9rj",
  },
  {
    id: "area-warman",
    name: "Warman",
    slug: "warman",
    copy: "Just northwest of Saskatoon, Warman homeowners get the same fast response and straightforward pricing as anywhere else in our service area - no extra trip charge for being outside the city limits.",
    faqs: [
      {
        question: "Do you charge extra to travel to Warman?",
        answer:
          "No - Warman homeowners get the same pricing and response as anywhere else in our service area, with no extra trip charge for being outside Saskatoon city limits.",
      },
      {
        question: "Is Warman considered part of Saskatoon?",
        answer:
          "No, Warman is a separate town just northwest of Saskatoon, but it's fully within our regular service area.",
      },
      {
        question: "Do you handle emergency plumbing calls in Warman?",
        answer: "Yes.",
      },
    ],
    images: ["public-assets/services/20258713-c60f-4372-a891-d0545d548315.jpeg"],
    callrailTrackingNumber: null,
    businessAddress: "202 Brooklyn Cres, Warman, SK S0K 0A1",
    googleMapsUrl:
      "https://www.google.com/maps/place/Mr.+Drain+Plumber+of+Warman/@52.147717,-107.323766,9z/data=!4m7!3m6!1s0x53045d6b098f9957:0x7376e5cc4981030b!8m2!3d52.3203676!4d-106.5953099!16s%2Fg%2F11zxdjg77m",
  },
];

export const services: Service[] = [
  {
    id: "service-drain-snaking",
    name: "Drain Snaking",
    slug: "drain-snaking",
    description:
      "Mechanical drain snaking to clear stubborn clogs in sinks, tubs, and main lines that a plunger can't fix.",
    content: [
      "A drain snake (also called an auger) physically breaks up or pulls out whatever's blocking a pipe - hair, grease buildup, foreign objects, or a partial clog that's built up over time. It's usually the first thing we try on a stubborn clog before considering anything more involved like hydro jetting.",
      "We run the snake from the nearest cleanout or fixture drain until it reaches the blockage, then work it through until water flows freely again. For recurring clogs in the same spot, we'll also check whether something structural - like a pipe with a belly in it - is causing debris to keep collecting there.",
    ].join("\n\n"),
    faqs: [
      {
        question: "How is snaking different from hydro jetting?",
        answer:
          "Snaking physically breaks up or pulls out a specific clog. Hydro jetting uses high-pressure water to scour the entire inside of the pipe. Snaking is usually the right call for a single, localized blockage.",
      },
      {
        question: "Will snaking damage my pipes?",
        answer:
          "Done correctly, no. We match the snake and cable size to the pipe to avoid scratching or damaging older or more fragile pipe material.",
      },
    ],
    imageKey: "public-assets/gallery/49312765-d0fe-46e3-921b-8617686d2442.jpeg",
  },
  {
    id: "service-hydro-jetting",
    name: "Hydro Jetting",
    slug: "hydro-jetting",
    description:
      "High-pressure water jetting that scours grease, scale, and root intrusion out of drain and sewer lines completely.",
    content: [
      "Hydro jetting sends water through the line at high pressure to strip built-up grease, mineral scale, and root intrusion off the inside walls of the pipe - not just punch a hole through the clog like a snake does. It's the right call for lines with a history of repeat clogging, or ones that haven't been cleaned in years.",
      "We inspect the line first (camera inspection where needed) to make sure the pipe is in good enough condition for jetting, then run the jetter from a cleanout until the full length of the line is clear.",
    ].join("\n\n"),
    faqs: [
      {
        question: "Is hydro jetting safe for older pipes?",
        answer:
          "It depends on the pipe's condition. We check the line first and won't jet a pipe that's too deteriorated to handle the pressure safely.",
      },
      {
        question: "How often should a main line be jetted?",
        answer:
          "It depends on usage and history - a line with recurring grease buildup or root intrusion benefits from periodic jetting, while a healthy line may not need it for years.",
      },
    ],
    imageKey: "public-assets/gallery/d17677a7-0fca-42ec-a298-34f879f38430.jpeg",
  },
  {
    id: "service-toilet-replacement",
    name: "Toilet Replacement",
    slug: "toilet-replacement",
    description:
      "Toilet removal and replacement, including reseating the flange and hooking up the new unit correctly.",
    content: [
      "A toilet that rocks, runs constantly, or leaks at the base usually isn't worth repeatedly patching - especially on an older unit. We remove the old toilet, check and reseat the wax ring and flange (a common source of hidden leaks and floor damage), and install the new unit level and properly secured.",
      "We can work with a toilet you've already purchased or help you pick a reliable model that fits your bathroom's rough-in dimensions.",
    ].join("\n\n"),
    faqs: [
      {
        question: "How long does a toilet replacement take?",
        answer:
          "A straightforward swap is usually a same-visit job, assuming there's no unexpected flange or subfloor damage underneath.",
      },
      {
        question: "Do you haul away the old toilet?",
        answer: "Yes, disposal of the old unit is included.",
      },
    ],
    imageKey: null,
  },
  {
    id: "service-hot-water-tank-replacement",
    name: "Hot Water Tank Replacement",
    slug: "hot-water-tank-replacement",
    description:
      "Water heater replacement - tank or tankless - including removal of the old unit and proper venting and supply hookup.",
    content: [
      "A water heater nearing the end of its life often shows warning signs first: rusty water, a tank that's noisy or slow to recover, or visible corrosion at the base. Once it's past the point of a reasonable repair, we replace it with a properly sized new unit - tank-style or tankless, depending on what fits your household and space.",
      "Replacement includes removing and disposing of the old tank, running new supply and venting connections to code, and making sure the new unit is properly strapped and set up before we leave.",
    ].join("\n\n"),
    faqs: [
      {
        question: "Tank or tankless - which is better?",
        answer:
          "It depends on your household's hot water usage, available space, and budget. We can walk you through the tradeoffs for your specific situation.",
      },
      {
        question: "How long does a water heater last?",
        answer:
          "Most tank-style water heaters last 8-12 years. Once one starts showing rust, leaks, or repeated pilot/element failures, replacement is usually more cost-effective than another repair.",
      },
    ],
    imageKey: "public-assets/gallery/cd816b05-eb1a-4995-84d1-98b2adc330e0.jpeg",
  },
  {
    id: "service-boiler-replacement",
    name: "Boiler Replacement",
    slug: "boiler-replacement",
    description:
      "Residential and light commercial boiler replacement, including re-piping the mechanical room to current standards.",
    content: [
      "Replacing a boiler is more involved than swapping a water heater - it usually means re-piping part of the mechanical room to bring the install up to current standards, not just disconnecting and reconnecting the same lines. We size the new boiler correctly for the space it's heating and make sure the whole system - circulators, expansion tank, zone valves - is working together properly before we finish.",
      "We work on both single-family residential systems and smaller commercial mechanical rooms.",
    ].join("\n\n"),
    faqs: [
      {
        question: "How do I know if I need a new boiler instead of a repair?",
        answer:
          "Frequent breakdowns, rising repair costs, or a unit that's simply too old to find parts for are all signs it's time to replace rather than keep repairing.",
      },
      {
        question: "Do you work on commercial boiler systems?",
        answer: "Yes, we handle both residential and smaller light-commercial mechanical rooms.",
      },
    ],
    imageKey: "public-assets/gallery/af48d8a8-287f-4a3e-93ab-4280842832d6.jpeg",
  },
  {
    id: "service-sump-pump",
    name: "Sump Pump",
    slug: "sump-pump",
    description:
      "Sump pump installation, replacement, and inspection to help keep basements dry through spring melt and heavy rain.",
    content: [
      "A failed sump pump is one of the fastest ways a basement floods, and it usually happens at the worst possible time - during heavy rain or spring melt, when the pump is actually needed. We install and replace sump pumps, check that the discharge line is routed properly away from the foundation, and can add a battery backup for households worried about losing power during a storm.",
      "If your existing pump is just old or noisy rather than fully failed, we can inspect it and tell you honestly whether it's worth replacing now or monitoring.",
    ].join("\n\n"),
    faqs: [
      {
        question: "How often should a sump pump be replaced?",
        answer:
          "Most sump pumps last 7-10 years. If yours is older than that or you're not sure of its age, it's worth having it checked.",
      },
      {
        question: "Do you install battery backup sump pumps?",
        answer:
          "Yes, for households who want protection against pump failure during a power outage.",
      },
    ],
    imageKey: null,
  },
  {
    id: "service-bathroom-renovations",
    name: "Bathroom Renovations",
    slug: "bathroom-renovations",
    description:
      "Plumbing for bathroom renovations - rough-in, relocated fixtures, and final installation for a full or partial remodel.",
    content: [
      "Bathroom renovations covers everything under the plumbing side of a remodel: rough-in for a moved sink or shower, running new supply and drain lines to a relocated toilet, and the final hookup of your new fixtures once the finishing work is done.",
      "We can work directly with your contractor or designer if it's a larger renovation, or handle the plumbing side start to finish for a simpler update like a vanity or shower swap.",
    ].join("\n\n"),
    faqs: [
      {
        question: "Can you move plumbing to a different spot in the bathroom?",
        answer:
          "Yes, relocating supply and drain lines for a new layout is a normal part of a renovation - it just needs to be planned before the walls close up.",
      },
      {
        question: "Do you work with my contractor or designer?",
        answer:
          "Yes, we regularly coordinate the plumbing rough-in and final hookup around a broader renovation timeline.",
      },
    ],
    imageKey: "public-assets/gallery/1df2d43c-9d6e-4fba-8f52-95f72ae687d8.jpeg",
  },
  {
    id: "service-repiping",
    name: "Repiping",
    slug: "repiping",
    description:
      "Whole-home or partial repiping for aging, corroded, or undersized water lines that keep causing recurring problems.",
    content: [
      "Old or failing water lines don't always announce themselves with an obvious leak - sometimes it's discoloured water, dropping water pressure, or a string of small leaks in the same area that's really one bigger problem. Repiping replaces the old lines (often galvanized steel or aging copper) with modern piping suited to your home.",
      "We can repipe a whole house or just the section that's actually causing problems, depending on the age and condition of the rest of the system.",
    ].join("\n\n"),
    faqs: [
      {
        question: "How do I know if I need a full repipe?",
        answer:
          "Recurring leaks in different spots, persistently low water pressure, or visibly corroded galvanized pipe are all signs the whole system may be near the end of its life rather than needing another one-off repair.",
      },
      {
        question: "Do I need to move out during a repipe?",
        answer:
          "Not usually for a partial repipe. A full whole-home repipe may require some rooms to be without water temporarily while work is underway.",
      },
    ],
    imageKey: "public-assets/gallery/f818a513-4523-4210-8214-1e250a77a5cd.jpeg",
  },
  {
    id: "service-drain-cleaning",
    name: "Drain Cleaning",
    slug: "drain-cleaning",
    description:
      "Routine and emergency drain cleaning for kitchens, bathrooms, and main sewer lines - serving Saskatoon and surrounding communities.",
    content: [
      "Fast, effective drain cleaning in Saskatoon - kitchen, bathroom, and main line clogs cleared with snaking or hydro jetting, whichever fits the actual problem. A slow or fully blocked drain is one of the most common calls we get, and most of the time it's fixable in a single visit.",
      "For a recurring clog in the same drain, we'll also look at what's actually causing it - grease buildup, root intrusion, or a structural issue with the pipe itself - rather than just clearing it again and again.",
    ].join("\n\n"),
    faqs: [
      {
        question: "Why does my drain keep clogging in the same spot?",
        answer:
          "A recurring clog in the same location is often a sign of something structural - grease buildup, root intrusion, or a low spot in the pipe collecting debris - rather than bad luck.",
      },
      {
        question: "Can you clear a fully blocked main line?",
        answer:
          "Yes - main line blockages are one of the most common things we handle, usually with snaking or hydro jetting depending on the cause.",
      },
    ],
    imageKey: "public-assets/gallery/9b136ef1-dbe6-4c6e-ada1-6cc35d41b505.jpeg",
  },
  {
    id: "service-faucet-repair-installation",
    name: "Faucet Repair & Installation",
    slug: "faucet-repair-installation",
    description:
      "Faucet repair and installation for kitchens and bathrooms - fixing drips, replacing worn cartridges, or installing a new faucet.",
    content: [
      "A dripping or hard-to-turn faucet is almost always a worn cartridge, washer, or valve seat - a straightforward fix rather than a sign you need a whole new fixture. We repair what can be repaired, and when a faucet is genuinely at the end of its life or you're upgrading, we handle the full swap including any supply line work needed.",
    ].join("\n\n"),
    faqs: [
      {
        question: "Why does my faucet keep dripping after a repair?",
        answer:
          "If a drip comes back quickly after a repair, it's often because the wrong replacement part was used, or a second component (like the valve seat) also needs attention.",
      },
      {
        question: "Can you install a faucet I already bought?",
        answer: "Yes, we're happy to install a faucet you've purchased yourself.",
      },
    ],
    imageKey: "public-assets/gallery/4fd018bb-6269-4598-a9ce-81fb9e4efae2.jpeg",
  },
  {
    id: "service-garbage-disposal-installation",
    name: "Garbage Disposal Installation",
    slug: "garbage-disposal-installation",
    description:
      "Garbage disposal installation and replacement, including proper connection to your kitchen drain and dishwasher line.",
    content: [
      "Installing a garbage disposal means more than just bolting it under the sink - it needs to be properly wired, connected to the drain trap, and if you have a dishwasher, plumbed into that line correctly too. We install new disposals and replace failed units, matching the horsepower to your household's typical use.",
    ].join("\n\n"),
    faqs: [
      {
        question: "How long do garbage disposals last?",
        answer:
          "Typically 8-12 years with normal use, though a jammed motor or leaking seal can end one sooner.",
      },
      {
        question: "Can any sink fit a garbage disposal?",
        answer:
          "Most standard kitchen sinks can, but it depends on your existing plumbing and electrical setup - we can confirm during the visit.",
      },
    ],
    imageKey: null,
  },
  {
    id: "service-water-softener-installation",
    name: "Water Softener Installation",
    slug: "water-softener-installation",
    description:
      "Water softener installation to reduce hard-water buildup on fixtures, water heaters, and appliances.",
    content: [
      "Hard water leaves mineral buildup on fixtures, inside water heaters, and in appliances over time, which shortens their lifespan and reduces efficiency. We install whole-home water softener systems sized to your household and plumbed into your main supply line.",
    ].join("\n\n"),
    faqs: [
      {
        question: "How do I know if I have hard water?",
        answer:
          "Common signs include white mineral buildup around faucets and showerheads, soap that doesn't lather well, and spotting on dishes.",
      },
      {
        question: "How much maintenance does a water softener need?",
        answer:
          "Mainly refilling the salt periodically - we'll walk you through it after installation.",
      },
    ],
    imageKey: null,
  },
  {
    id: "service-gas-line-installation",
    name: "Gas Line Installation",
    slug: "gas-line-installation",
    description:
      "Gas line installation and repair for appliances, BBQ hookups, and new fixtures - installed and tested to code.",
    content: [
      "Gas line work has zero margin for error, so every line we run is sized correctly, pressure-tested, and installed to code before anything is connected to it. We handle new gas lines for appliances like ranges and dryers, BBQ hookups, and extensions or repairs to existing gas lines.",
    ].join("\n\n"),
    faqs: [
      {
        question: "Do I need a permit for a new gas line?",
        answer:
          "Most gas line work requires a permit and inspection - we handle that as part of the job.",
      },
      {
        question: "How do I know if I have a gas leak?",
        answer:
          "A sulphur or rotten-egg smell near a gas appliance or line is the most common warning sign. If you smell gas, leave the area and contact your gas utility's emergency line immediately, then call us.",
      },
    ],
    imageKey: "public-assets/gallery/e8f0931f-c17c-48d5-826d-5ed3d9e3e95e.jpeg",
  },
  {
    id: "service-leak-detection",
    name: "Leak Detection",
    slug: "leak-detection",
    description:
      "Leak detection for hidden leaks behind walls, under slabs, or underground - found without unnecessary demolition.",
    content: [
      "Not every leak shows itself with a wet spot on the ceiling. A rising water bill, a water meter that keeps moving with everything off, or a damp patch with no obvious source can all point to a hidden leak. We use listening equipment and moisture readings to narrow down the location before opening anything up, so we're not guessing at what to cut into.",
    ].join("\n\n"),
    faqs: [
      {
        question: "How can you find a leak without tearing up my walls or floor?",
        answer:
          "We use acoustic listening equipment and moisture detection to narrow down the leak's location first, which keeps the amount of opening-up needed to a minimum.",
      },
      {
        question: "What are signs I might have a hidden leak?",
        answer:
          "An unexplained rise in your water bill, a water meter that's still moving with everything off, or a damp/musty spot with no obvious cause are all worth investigating.",
      },
    ],
    imageKey: "public-assets/gallery/5ef816f8-df7f-4140-9344-58cdfe98d53a.jpeg",
  },
  {
    id: "service-sewer-line-repair",
    name: "Sewer Line Repair",
    slug: "sewer-line-repair",
    description:
      "Sewer line repair and replacement for damaged, collapsed, or root-blocked lines - excavated and repaired properly.",
    content: [
      "A damaged sewer line usually shows up as recurring backups, slow drains throughout the house, or sewage odour in the yard. Once we've confirmed the location and cause - often root intrusion or an aging, deteriorated pipe - we excavate and repair or replace the affected section.",
    ].join("\n\n"),
    faqs: [
      {
        question: "What causes sewer line damage?",
        answer:
          "Tree root intrusion, pipe age and deterioration, and ground shifting are the most common causes we see.",
      },
      {
        question: "Do you always have to dig up the whole line?",
        answer:
          "No - once we've located the damaged section, we typically only excavate what's actually affected rather than the entire line.",
      },
    ],
    imageKey: "public-assets/gallery/6da2d82a-25b6-4102-91cd-6a1728ba21cf.jpeg",
  },
  {
    id: "service-backflow-prevention",
    name: "Backflow Prevention",
    slug: "backflow-prevention",
    description:
      "Backflow prevention device installation and testing to keep contaminated water from being drawn back into your supply.",
    content: [
      "A backflow preventer stops water from flowing in reverse through your plumbing - a real risk if pressure in the main line drops and could otherwise pull contaminated water back into your home's supply. We install these devices and test existing ones to confirm they're functioning correctly.",
    ].join("\n\n"),
    faqs: [
      {
        question: "Do I need a backflow preventer?",
        answer:
          "Certain fixtures and irrigation systems require one, and some municipalities mandate them for specific setups - we can tell you what applies to your property.",
      },
      {
        question: "How often should a backflow preventer be tested?",
        answer: "Annually is standard practice to confirm it's still functioning correctly.",
      },
    ],
    imageKey: null,
  },
  {
    id: "service-water-filtration-systems",
    name: "Water Filtration Systems",
    slug: "water-filtration-systems",
    description:
      "Whole-home and under-sink water filtration system installation for cleaner, better-tasting water.",
    content: [
      "Whether it's a whole-home filtration system or a simpler under-sink unit for drinking water, we size and install filtration systems based on what's actually in your water and what you're trying to improve - taste, sediment, chlorine, or something more specific.",
    ].join("\n\n"),
    faqs: [
      {
        question: "Whole-home or under-sink filtration - which do I need?",
        answer:
          "It depends on your goals. Whole-home systems treat everything entering the house; under-sink units are a simpler option focused just on drinking water.",
      },
      {
        question: "How often do filters need to be replaced?",
        answer:
          "It varies by system and household usage - we'll go over the schedule for your specific unit after installation.",
      },
    ],
    imageKey: null,
  },
  {
    id: "service-kitchen-plumbing",
    name: "Kitchen Plumbing",
    slug: "kitchen-plumbing",
    description:
      "Sink, dishwasher, and under-cabinet plumbing for kitchen renovations and repairs.",
    content: [
      "Kitchen plumbing covers everything under the sink and behind the appliances - supply and drain lines for a new sink, dishwasher hookups, and fixing leaks or slow drains that show up as water damage under the cabinet. We handle both full kitchen renovation plumbing and one-off repairs.",
    ].join("\n\n"),
    faqs: [
      {
        question: "Why is there water pooling under my kitchen sink?",
        answer:
          "Usually a loose or worn connection at the P-trap, supply lines, or dishwasher drain hose - all straightforward to diagnose and fix.",
      },
      {
        question: "Can you plumb in a new kitchen island sink?",
        answer:
          "Yes, running new supply and drain lines to an island is a normal part of a kitchen renovation.",
      },
    ],
    imageKey: null,
  },
  {
    id: "service-fixture-installation",
    name: "Fixture Installation",
    slug: "fixture-installation",
    description:
      "Installation of sinks, tubs, showers, and other plumbing fixtures - new installs or replacements.",
    content: [
      "From a new bathtub spout to a full shower valve replacement, fixture installation covers swapping out or adding sinks, tubs, showers, and the hardware that goes with them. We make sure everything is properly sealed and connected, not just bolted on.",
    ].join("\n\n"),
    faqs: [
      {
        question: "Can you install a fixture I purchased elsewhere?",
        answer: "Yes, we regularly install customer-supplied fixtures.",
      },
      {
        question: "Do you handle both repair and full replacement?",
        answer:
          "Yes - if a fixture can be reasonably repaired we'll say so, rather than pushing an unnecessary replacement.",
      },
    ],
    imageKey: "public-assets/gallery/6886272e-eec2-4607-b8a1-ac4d28b1fede.jpeg",
  },
  {
    id: "service-emergency-plumbing-repair",
    name: "Emergency Plumbing Repair",
    slug: "emergency-plumbing-repair",
    description:
      "Emergency plumbing repair for burst pipes, major leaks, and sewer backups that can't wait.",
    content: [
      "Some plumbing problems can't wait for a scheduled appointment - a burst pipe, a major leak, or a sewer backup needs a fast response before the damage gets worse. We prioritize emergency calls and get to work diagnosing and stopping the problem as quickly as we can.",
    ].join("\n\n"),
    faqs: [
      {
        question: "What counts as a plumbing emergency?",
        answer:
          "A burst or actively leaking pipe, a sewer backup, or a complete loss of water are all situations we treat as urgent.",
      },
      {
        question: "What should I do while waiting for help to arrive?",
        answer:
          "If you can safely do so, shut off the water at the main shutoff valve to limit damage while you wait.",
      },
    ],
    imageKey: "public-assets/gallery/0571ba38-8c50-4c30-adaa-105e89c10ab1.jpeg",
  },
];

export const portfolioJobs: PortfolioJob[] = [
  {
    id: "job-boiler-brighton",
    slug: "boiler-replacement-in-brighton-saskatoon",
    title: "Boiler Replacement in Brighton, Saskatoon",
    description:
      "Replaced a failing residential boiler system in Brighton, re-piping the mechanical room to bring the installation up to current standards.",
    coverImageKey: "public-assets/gallery/cce60ba0-d079-474a-932b-d59fc6663a31.png",
    serviceAreaSlug: "brighton",
  },
  {
    id: "job-hot-water-tank-rosewood",
    slug: "hot-water-tank-replacement-in-rosewood-saskatoon",
    title: "Hot Water Tank Replacement in Rosewood, Saskatoon",
    description:
      "Replaced an aging water heater with a new high-efficiency tankless system for a Rosewood homeowner, including new venting and supply lines.",
    coverImageKey: "public-assets/gallery/6639456d-677a-4438-977b-6b96e830c6c7.png",
    serviceAreaSlug: "rosewood",
  },
  {
    id: "job-sewer-line-saskatoon",
    slug: "sewer-line-repair-saskatoon-area",
    title: "Sewer Line Repair - Saskatoon Area",
    description:
      "Excavated and repaired a damaged underground sewer line to resolve a recurring backup issue.",
    coverImageKey: "public-assets/gallery/56e881cb-bc50-4932-bb80-62e27dbd257d.png",
    serviceAreaSlug: null,
  },
];

// The 25 real, genuine job photos below were re-verified directly against
// R2 (Sep 2026) after an earlier pass in this rebuild mistakenly reused each
// photo's database row ID as if it were its storage key - a coincidentally
// similar-looking but entirely different UUID, which produced broken image
// URLs across the site. Manufacturer/showroom catalog photos are deliberately
// excluded. Shown as a plain unlinked grid on /gallery, distinct from the
// portfolioJobs above which each get their own indexable page.
export const galleryPhotos: GalleryPhoto[] = [
  {
    id: "gal-1",
    storageKey: "public-assets/gallery/01e0a4ca-a1c0-4711-8324-717f9d5f749c.jpeg",
    caption: "Commercial Plumbing Rough-In Ahead of Drywall",
  },
  {
    id: "gal-2",
    storageKey: "public-assets/gallery/0571ba38-8c50-4c30-adaa-105e89c10ab1.jpeg",
    caption: "Underground Water Line Trench Along a Home's Foundation",
  },
  {
    id: "gal-3",
    storageKey: "public-assets/gallery/170441ad-f547-48b5-b314-a0a13e9b1be6.jpeg",
    caption: "Radiant Floor Heating Tubing Before a Concrete Pour",
  },
  {
    id: "gal-4",
    storageKey: "public-assets/gallery/19b2eb25-6ef1-4daa-92c0-e49a5d2bae04.jpeg",
    caption: "Mechanical Room Heat Pump Installation in a Commercial Parkade",
  },
  {
    id: "gal-5",
    storageKey: "public-assets/gallery/1df2d43c-9d6e-4fba-8f52-95f72ae687d8.jpeg",
    caption: "Completed Bathroom Renovation with Vessel Sink",
  },
  {
    id: "gal-6",
    storageKey: "public-assets/gallery/2807d4bd-4d3c-46d0-92bc-44562c9db87b.jpeg",
    caption: "Commercial Water Heater Replacement - Twin Tank Installation",
  },
  {
    id: "gal-7",
    storageKey: "public-assets/gallery/3672d063-43d7-43a3-868f-2bf6db00ad71.jpeg",
    caption: "Exterior Basement Stairwell Drain Installation",
  },
  {
    id: "gal-8",
    storageKey: "public-assets/gallery/49312765-d0fe-46e3-921b-8617686d2442.jpeg",
    caption: "Tree Root Intrusion Cleared from a Sewer Line",
  },
  {
    id: "gal-9",
    storageKey: "public-assets/gallery/4fd018bb-6269-4598-a9ce-81fb9e4efae2.jpeg",
    caption: "Bathtub Spout and Valve Installation",
  },
  {
    id: "gal-10",
    storageKey: "public-assets/gallery/5ef816f8-df7f-4140-9344-58cdfe98d53a.jpeg",
    caption: "Water Service Line Repair with New Shutoff Valve",
  },
  {
    id: "gal-11",
    storageKey: "public-assets/gallery/64baf493-86bb-408b-bf36-9f64f92e0d66.jpeg",
    caption: "Rough-In Plumbing in New Wall Framing",
  },
  {
    id: "gal-12",
    storageKey: "public-assets/gallery/6886272e-eec2-4607-b8a1-ac4d28b1fede.jpeg",
    caption: "Shower Valve Rough-In Before the Wall Closes Up",
  },
  {
    id: "gal-13",
    storageKey: "public-assets/gallery/6da2d82a-25b6-4102-91cd-6a1728ba21cf.jpeg",
    caption: "New Sewer Line Y-Fitting After Clearing Tree Roots",
  },
  {
    id: "gal-14",
    storageKey: "public-assets/gallery/91730dbc-1224-43a4-9318-b1584b78060b.jpeg",
    caption: "Hydronic Heating Manifold and Expansion Tank Installation",
  },
  {
    id: "gal-15",
    storageKey: "public-assets/gallery/9b136ef1-dbe6-4c6e-ada1-6cc35d41b505.jpeg",
    caption: "Sewer Line Y-Fitting Connection",
  },
  {
    id: "gal-16",
    storageKey: "public-assets/gallery/af48d8a8-287f-4a3e-93ab-4280842832d6.jpeg",
    caption: "Commercial Boiler Room Piping and Water Heater Installation",
  },
  {
    id: "gal-17",
    storageKey: "public-assets/gallery/c290e6db-b8d2-4506-9db7-298392bbad4b.jpeg",
    caption: "Utility Trench for New Electrical and Water Service Conduit",
  },
  {
    id: "gal-18",
    storageKey: "public-assets/gallery/ca67f7da-9c69-4dab-890d-c7e17d799487.jpeg",
    caption: "Overhead Plumbing Installation in a Commercial Parkade",
  },
  {
    id: "gal-19",
    storageKey: "public-assets/gallery/cd816b05-eb1a-4995-84d1-98b2adc330e0.jpeg",
    caption: "Hot Water Tank Replacement - Completed Installation",
  },
  {
    id: "gal-20",
    storageKey: "public-assets/gallery/d17677a7-0fca-42ec-a298-34f879f38430.jpeg",
    caption: "Sewer Line Root Removal and Repair",
  },
  {
    id: "gal-21",
    storageKey: "public-assets/gallery/d6139e6c-1b4e-41c3-936e-6e4b45537579.jpeg",
    caption: "Under-Sink Drain and P-Trap Installation",
  },
  {
    id: "gal-22",
    storageKey: "public-assets/gallery/df375343-4dc0-45c1-adb0-3299386c3201.jpeg",
    caption: "New Construction Plumbing Rough-In Below the Foundation",
  },
  {
    id: "gal-23",
    storageKey: "public-assets/gallery/e8f0931f-c17c-48d5-826d-5ed3d9e3e95e.jpeg",
    caption: "Water Main Connection Trench",
  },
  {
    id: "gal-24",
    storageKey: "public-assets/gallery/ec2a3795-936e-4aae-bb2f-a4d6827ba766.jpeg",
    caption: "Crawlspace Copper Water Line and Shutoff Valve",
  },
  {
    id: "gal-25",
    storageKey: "public-assets/gallery/f818a513-4523-4210-8214-1e250a77a5cd.jpeg",
    caption: "Crawlspace Plumbing Risers Along the Foundation Wall",
  },
];

// --- Lookup helpers -------------------------------------------------------
// Kept async to match the exact call sites that used to await a database
// query - minimizes changes needed in every page that calls these.

export async function listPublishedServices(): Promise<Service[]> {
  return services;
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  return services.find((s) => s.slug === slug) ?? null;
}

export async function listPublishedServiceAreas(): Promise<ServiceArea[]> {
  return serviceAreas;
}

export async function getServiceAreaBySlug(slug: string): Promise<ServiceArea | null> {
  return serviceAreas.find((a) => a.slug === slug) ?? null;
}

export async function listPublishedPortfolioJobs(): Promise<PortfolioJob[]> {
  return portfolioJobs;
}

export async function getPortfolioJobBySlug(slug: string): Promise<PortfolioJob | null> {
  return portfolioJobs.find((j) => j.slug === slug) ?? null;
}

export async function listPublishedPortfolioJobsForServiceArea(
  areaSlug: string,
): Promise<PortfolioJob[]> {
  return portfolioJobs.filter((j) => j.serviceAreaSlug === areaSlug);
}

export async function listPublishedGalleryPhotos(): Promise<GalleryPhoto[]> {
  return galleryPhotos;
}

export async function getWebsiteSettings() {
  return siteSettings;
}
