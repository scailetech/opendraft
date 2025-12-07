// ABOUTME: How It Works section - 3-step process with visual flow
// ABOUTME: Clean cards with emojis and connecting arrows

import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "1",
    emoji: "👟",
    title: "Upload Your CSV",
    description: "Drop your CSV file with up to 1,000 rows. We'll detect columns automatically.",
  },
  {
    number: "2", 
    emoji: "🏃",
    title: "Write Your Prompt",
    description: "Tell AI what to generate for each row. Use {{column_name}} to reference your data.",
  },
  {
    number: "3",
    emoji: "🏁",
    title: "Download Results",
    description: "Get your enriched CSV with new AI-generated columns. Export to CSV or Excel.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold mb-3">How it works</h2>
          <p className="text-muted-foreground">Three steps to AI-powered data</p>
        </div>

        {/* Steps with flow */}
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Card */}
                <div className="rounded-lg border border-border bg-card p-6 h-full text-center">
                  {/* Emoji */}
                  <div className="text-4xl mb-4">{step.emoji}</div>
                  
                  {/* Step number */}
                  <div className="text-xs font-medium text-green-500 mb-2">Step {step.number}</div>
                  
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>

                {/* Arrow connector (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
