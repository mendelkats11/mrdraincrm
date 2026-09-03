/**
 * FAQPage JSON-LD for a service (or other) page's own visible FAQ content.
 * Only call this when the FAQs are actually rendered on the page — schema
 * that doesn't match visible content is exactly what the Sep 2026 SEO
 * audit's rules explicitly forbid fabricating.
 */
export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
