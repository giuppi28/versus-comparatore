export interface SeoSource {
  label: string;
  url: string;
}

export interface SeoSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface SeoFaq {
  q: string;
  a: string;
}

export interface SeoPage {
  /** e.g. "/guida/voltura-luce-gas" */
  path: string;
  /** short link label for the footer "Guide" row (guides only) */
  footerLabel?: string;
  /** <title>, max 60 characters, ends with "| VERSUS" */
  title: string;
  /** meta description, max 155 characters */
  description: string;
  h1: string;
  /** answer-first: direct answer to the page's main question, max 60 words */
  intro: string;
  sections: SeoSection[];
  /** 4 to 6 items */
  faq: SeoFaq[];
  /** the official pages actually used */
  sources: SeoSource[];
  /** paths of 3 or 4 other pages in this set */
  related: string[];
  /** e.g. "2026-11-05" */
  reviewedOn: string;
}

export interface OffersSeoPage extends SeoPage {
  listings: {
    heading: string;
    commodity: "luce" | "gas";
    customerType: "casa" | "business";
  }[];
}
