// ABOUTME: FAQ section for bulk.run landing page
// ABOUTME: Common questions and answers in accordion format

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "How many rows can I process?",
    answer: "Currently, bulk.run supports up to 1,000 rows per batch. This limit helps ensure fast processing times and reliable results.",
  },
  {
    question: "What AI model powers bulk.run?",
    answer: "We use Google's Gemini AI models, which offer excellent performance for text generation, classification, and data enrichment tasks.",
  },
  {
    question: "Can AI search the web for each row?",
    answer: "Yes! Enable the 'Web Search' tool and AI will search for real-time information to enrich your data. Perfect for lead research and competitive analysis.",
  },
  {
    question: "What file formats are supported?",
    answer: "Upload CSV files and export results as CSV or Excel (XLSX). We auto-detect columns and handle common encoding issues.",
  },
  {
    question: "How long does processing take?",
    answer: "Most batches complete in 2-10 minutes depending on size and complexity. We show a time estimate before you start, and you can track progress in real-time.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. Your data is processed securely and not stored permanently. We don't use your data to train AI models.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mb-16 text-lg text-muted-foreground">
            Everything you need to know about bulk.run
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-6 text-left"
              >
                <span className="text-lg font-medium">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all",
                  openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-6 text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

