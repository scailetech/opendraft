// ABOUTME: Comparison section showing OpenDraft vs alternatives (ChatGPT, Claude, Manual writing)
// ABOUTME: Responsive design - cards on mobile, table on desktop for better UX

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Minus } from "lucide-react";

interface ComparisonItem {
  feature: string;
  academicThesisAI: { icon: "check" | "x" | "minus"; label: string };
  chatgpt: { icon: "check" | "x" | "minus"; label: string };
  manual: { icon: "check" | "x" | "minus"; label: string };
}

const comparisonData: ComparisonItem[] = [
  {
    feature: "Research Integration",
    academicThesisAI: { icon: "check", label: "3 major databases" },
    chatgpt: { icon: "minus", label: "Manual copy/paste" },
    manual: { icon: "check", label: "Manual search" },
  },
  {
    feature: "Citation Validation",
    academicThesisAI: { icon: "check", label: "Database-validated" },
    chatgpt: { icon: "x", label: "Hallucinations" },
    manual: { icon: "check", label: "Manual check" },
  },
  {
    feature: "Structured Workflow",
    academicThesisAI: { icon: "check", label: "19 specialized agents" },
    chatgpt: { icon: "x", label: "Single prompt" },
    manual: { icon: "check", label: "Your process" },
  },
  {
    feature: "Academic Quality Review",
    academicThesisAI: { icon: "check", label: "Skeptic + Referee agents" },
    chatgpt: { icon: "x", label: "None" },
    manual: { icon: "minus", label: "Peer review" },
  },
  {
    feature: "Export Formats",
    academicThesisAI: { icon: "check", label: "PDF, DOCX, LaTeX" },
    chatgpt: { icon: "minus", label: "Copy/paste only" },
    manual: { icon: "check", label: "Your software" },
  },
  {
    feature: "Cost (20k words)",
    academicThesisAI: { icon: "check", label: "~$0.35-$10 (est.)" },
    chatgpt: { icon: "minus", label: "$20 (ChatGPT Plus)" },
    manual: { icon: "x", label: "$0 (+ months of time)" },
  },
  {
    feature: "Time Required",
    academicThesisAI: { icon: "check", label: "Hours (est.)" },
    chatgpt: { icon: "minus", label: "40-80 hours" },
    manual: { icon: "x", label: "2-3 months" },
  },
  {
    feature: "Open Source",
    academicThesisAI: { icon: "check", label: "MIT License" },
    chatgpt: { icon: "x", label: "Proprietary" },
    manual: { icon: "minus", label: "N/A" },
  },
];

const IconDisplay = ({ icon, label, srOnly }: { icon: "check" | "x" | "minus"; label: string; srOnly?: string }) => {
  const iconMap = {
    check: <Check className="h-5 w-5 text-green-600" aria-hidden="true" />,
    x: <X className="h-5 w-5 text-red-600" aria-hidden="true" />,
    minus: <Minus className="h-5 w-5 text-yellow-600" aria-hidden="true" />,
  };

  const iconLabel = {
    check: "Full support",
    x: "Not supported",
    minus: "Partial support",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {iconMap[icon]}
      <span className="sr-only">{srOnly || iconLabel[icon]}</span>
      <span className="text-xs text-muted-foreground" aria-hidden="true">{label}</span>
    </div>
  );
};

export const ComparisonSection = () => {
  return (
    <section id="comparison" className="container py-24 sm:py-32">
      <div className="text-center mb-12">
        <h2 className="text-lg text-primary text-center mb-2 tracking-wider">
          Comparison
        </h2>

        <h2 className="text-3xl md:text-4xl text-center font-semibold mb-4">
          Why OpenDraft?
        </h2>

        <p className="md:w-1/2 mx-auto text-base text-center text-muted-foreground">
          See how OpenDraft compares to ChatGPT, Claude, and traditional manual writing.
        </p>
      </div>

      {/* Mobile: Card layout */}
      <div className="md:hidden space-y-6">
        {comparisonData.map((item) => (
          <Card key={item.feature} className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium">{item.feature}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs font-semibold text-primary mb-2">OpenDraft</p>
                <IconDisplay {...item.academicThesisAI} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-2">ChatGPT/Claude</p>
                <IconDisplay {...item.chatgpt} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-2">Manual</p>
                <IconDisplay {...item.manual} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden md:block">
        <Table className="w-full">
          <TableCaption>Feature comparison updated November 2025</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]" scope="col">Feature</TableHead>
              <TableHead className="text-center font-bold text-primary" scope="col">OpenDraft</TableHead>
              <TableHead className="text-center" scope="col">ChatGPT / Claude</TableHead>
              <TableHead className="text-center" scope="col">Manual Writing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonData.map((item) => (
              <TableRow key={item.feature}>
                <TableCell className="font-medium">{item.feature}</TableCell>
                <TableCell className="text-center">
                  <IconDisplay {...item.academicThesisAI} />
                </TableCell>
                <TableCell className="text-center">
                  <IconDisplay {...item.chatgpt} />
                </TableCell>
                <TableCell className="text-center">
                  <IconDisplay {...item.manual} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};
