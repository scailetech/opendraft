// ABOUTME: FAQ section answering 8 common questions about OpenDraft with icons
// ABOUTME: Covers coding skills, setup time, AI choice, cost, plagiarism, quality, examples, support

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Code2,
  Clock,
  Sparkles,
  DollarSign,
  AlertTriangle,
  Award,
  FileText,
  MessageCircle,
  type LucideIcon
} from "lucide-react";

interface FAQProps {
  question: string;
  answer: string;
  value: string;
  icon: LucideIcon;
}

const FAQList: FAQProps[] = [
  {
    question: "Do I need to know how to code?",
    answer: "No! You just need to copy/paste prompts from files, edit text in your IDE, and run 1-2 simple Python commands. If you can use Google Docs, you can use this tool.",
    value: "item-1",
    icon: Code2,
  },
  {
    question: "How long does setup take?",
    answer: "About 10 minutes. Install Python dependencies, add your AI API key to a .env file, and you're ready to write. The Quick Start guide walks you through every step.",
    value: "item-2",
    icon: Clock,
  },
  {
    question: "Which AI should I use?",
    answer:
      "For beginners: Gemini 2.5 Flash (fastest, cheapest at $0.35-$1 per 20k words). For better quality: Gemini 2.5 Pro ($1-$3) or Claude Sonnet 4.5 ($3-$10 for best quality). The software is 100% free and open source - you only pay for AI API usage.",
    value: "item-3",
    icon: Sparkles,
  },
  {
    question:
      "How much does it cost?",
    answer:
      "The software is 100% free and open source. You only pay for AI API usage: Typical costs are $0.10-$0.30 (Gemini 2.5 Flash) or $1-$3 (Claude Sonnet 4.5) for a 6,000-word paper. A 20k-word master's thesis costs $0.35-$1 (Gemini 2.5 Flash), $1-$3 (Gemini 2.5 Pro), or $3-$10 (Claude Sonnet 4.5). Costs vary based on iterations and complexity.",
    value: "item-4",
    icon: DollarSign,
  },
  {
    question: "Is this plagiarism?",
    answer: "No, the AI generates original text based on your prompts. However, using AI might violate your institution's academic honesty policies. Always check with your advisor first and disclose AI use if required.",
    value: "item-5",
    icon: AlertTriangle,
  },
  {
    question:
      "What quality can I expect?",
    answer: "Output quality varies by model and prompts: Gemini 2.5 Flash (good), Gemini 2.5 Pro (better), Claude Sonnet 4.5 (best). Quality depends heavily on your prompts and how much you review/edit the output. See our real 104-page, 27,500+ word master's thesis example showing draft-quality academic writing with proper citations and formatting ready for human review. Note: Quality assessment based on informal feedback, not academic validation.",
    value: "item-6",
    icon: Award,
  },
  {
    question: "Where can I see an example?",
    answer: "Check out our real 104-page master's thesis example (27,500+ words) generated entirely with this tool. View it at federicodeponte.github.io/opendraft/examples/ - includes complete literature review, methodology, results, citations, and references in export-ready draft format. Human review recommended before submission.",
    value: "item-7",
    icon: FileText,
  },
  {
    question: "How do I get support?",
    answer: "Join GitHub Discussions for questions, check the comprehensive FAQ in the repository, or open an issue for bug reports. The community is active and helpful!",
    value: "item-8",
    icon: MessageCircle,
  },
];

export const FAQSection = () => {
  return (
    <section id="faq" className="container md:w-[700px] py-24 sm:py-32">
      <div className="text-center mb-8">
        <h2 className="text-lg text-primary text-center mb-2 tracking-wider">
          FAQS
        </h2>

        <h2 className="text-3xl md:text-4xl text-center font-bold">
          Common Questions
        </h2>
      </div>

      <Accordion type="single" collapsible className="AccordionRoot">
        {FAQList.map(({ question, answer, value, icon: Icon }) => (
          <AccordionItem key={value} value={value}>
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full flex-shrink-0">
                  <Icon className="size-4 text-primary" />
                </div>
                <span>{question}</span>
              </div>
            </AccordionTrigger>

            <AccordionContent className="pl-12">{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};
