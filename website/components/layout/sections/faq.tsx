// ABOUTME: FAQ section - enhanced accordion with icons
// ABOUTME: Categorized questions with better styling

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, MessageSquare } from "lucide-react";
import Link from "next/link";

const faqs = [
  {
    category: "Getting Started",
    items: [
      {
        q: "Do I need coding skills?",
        a: "No coding experience required. Just clone the repository, copy prompts, and run simple commands. We provide step-by-step instructions that anyone can follow.",
      },
      {
        q: "How long does it take?",
        a: "About 45 minutes total: 10 minutes for setup, 15-25 minutes for AI generation, and 5-10 minutes for review. Your first thesis might take slightly longer as you learn the workflow.",
      },
      {
        q: "Which AI model should I use?",
        a: "Gemini 2.5 Flash for free tier (good quality, fast), Claude Sonnet for best quality (paid). You can also use GPT-4o. You only pay for API usage—the software itself is free.",
      },
    ],
  },
  {
    category: "Cost & Quality",
    items: [
      {
        q: "How much does it cost?",
        a: "The software is 100% free and open source. API costs: $0-5 with Gemini's free tier, $10-50 with Claude for a full 20,000+ word thesis. Compare that to $400-2,000 for professional editing services.",
      },
      {
        q: "What quality can I expect?",
        a: "Typical results are B+ to A+ quality depending on your model choice and editing effort. We provide a real 104-page example thesis you can download and evaluate yourself.",
      },
      {
        q: "Are the citations real?",
        a: "Yes. Our Verifier agent checks all citations against CrossRef and arXiv databases. We achieve 95%+ accuracy. Invalid or hallucinated citations are flagged for your review.",
      },
    ],
  },
  {
    category: "Academic Integrity",
    items: [
      {
        q: "Is this plagiarism?",
        a: "AI generates original text, not copied content. However, you must check your institution's AI usage policies. Many schools now allow AI assistance with proper disclosure. We recommend being transparent about AI use.",
      },
      {
        q: "Will it pass plagiarism checkers?",
        a: "Yes, the content is original. However, some institutions use AI detection tools. Check your school's policies and consider disclosing AI assistance in your methodology section.",
      },
    ],
  },
];

export const FAQSection = () => {
  return (
    <section id="faq" className="py-24 sm:py-32 border-t border-border/50">
      <div className="container max-w-3xl">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-accent mb-3">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Common questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about OpenDraft
          </p>
        </div>

        <div className="space-y-8">
          {faqs.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                {section.category}
              </h3>

              <Accordion type="single" collapsible className="w-full">
                {section.items.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`${section.category}-${i}`}
                    className="border border-border/50 rounded-lg mb-2 px-4 data-[state=open]:border-accent/30 data-[state=open]:bg-accent/5"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-4 text-sm font-medium">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm pb-4 leading-relaxed">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border">
            <MessageSquare className="w-5 h-5 text-accent" />
            <span className="text-sm text-muted-foreground">Still have questions?</span>
            <Link
              href="https://github.com/federicodeponte/opendraft/discussions"
              target="_blank"
              className="text-sm font-medium text-accent hover:underline"
            >
              Ask in Discussions →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
