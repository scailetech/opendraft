// ABOUTME: Use cases section showing real-world applications
// ABOUTME: Examples of what users can do with bulk.run

const useCases = [
  {
    title: "Lead Enrichment",
    description: "Turn company names into full profiles with industry, size, and contact info.",
    example: "Input: Company Name → Output: Industry, Employee Count, HQ Location",
    emoji: "🎯",
  },
  {
    title: "Content Generation",
    description: "Generate product descriptions, social posts, or email copy at scale.",
    example: "Input: Product Name, Features → Output: Marketing Description",
    emoji: "✍️",
  },
  {
    title: "Data Classification",
    description: "Categorize support tickets, reviews, or survey responses automatically.",
    example: "Input: Customer Feedback → Output: Sentiment, Category, Priority",
    emoji: "🏷️",
  },
  {
    title: "Research & Analysis",
    description: "Extract insights from URLs, summarize content, or analyze competitors.",
    example: "Input: Website URL → Output: Summary, Key Products, Pricing",
    emoji: "🔍",
  },
];

export function UseCasesSection() {
  return (
    <section id="use-cases" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            What will you build?
          </h2>
          <p className="mb-16 text-lg text-muted-foreground">
            From sales teams to researchers, bulk.run powers diverse workflows
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="rounded-lg border border-border bg-card p-6 transition-all hover:border-green-500/30"
            >
              <div className="mb-4 text-3xl">{useCase.emoji}</div>
              <h3 className="mb-2 text-xl font-semibold">{useCase.title}</h3>
              <p className="mb-4 text-muted-foreground">{useCase.description}</p>
              <div className="rounded-lg bg-secondary/50 p-3 font-mono text-sm text-muted-foreground">
                {useCase.example}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

