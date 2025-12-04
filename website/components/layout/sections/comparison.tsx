// ABOUTME: Comparison section - enhanced table with icons
// ABOUTME: Visual check/x indicators and highlighted OpenDraft column

import { Check, X, Minus } from "lucide-react";

const comparisons = [
  { feature: "Research Database", us: "200M+ papers", usGood: true, them: "Manual search", themGood: false },
  { feature: "Citations", us: "Auto-verified", usGood: true, them: "Hallucinations", themGood: false },
  { feature: "Citation Accuracy", us: "95%+ verified", usGood: true, them: "Unverified", themGood: false },
  { feature: "AI Agents", us: "19 specialized", usGood: true, them: "1 generic", themGood: false },
  { feature: "Export Formats", us: "PDF, Word, LaTeX", usGood: true, them: "Copy/paste", themGood: false },
  { feature: "Time to Draft", us: "~45 minutes", usGood: true, them: "2-3 months", themGood: false },
  { feature: "Cost", us: "$10-50", usGood: true, them: "$20/mo + time", themGood: false },
  { feature: "Open Source", us: "MIT License", usGood: true, them: "Proprietary", themGood: false },
];

export const ComparisonSection = () => {
  return (
    <section id="comparison" className="py-24 sm:py-32 border-t border-border/50">
      <div className="container max-w-4xl">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-accent mb-3">Comparison</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            OpenDraft vs ChatGPT
          </h2>
          <p className="text-muted-foreground">
            Purpose-built for academic writing, not general chat
          </p>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground w-1/3">
                  Feature
                </th>
                <th className="text-left p-4 text-sm font-semibold w-1/3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    OpenDraft
                  </div>
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground w-1/3">
                  ChatGPT
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${
                    i % 2 === 0 ? "bg-card" : "bg-background"
                  }`}
                >
                  <td className="p-4 text-sm text-muted-foreground">{row.feature}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-accent" />
                      </div>
                      <span className="text-sm font-medium">{row.us}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                        <X className="w-3 h-3 text-destructive" />
                      </div>
                      <span className="text-sm text-muted-foreground">{row.them}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          ChatGPT is great for many things—academic thesis writing with citations isn't one of them.
        </p>
      </div>
    </section>
  );
};
