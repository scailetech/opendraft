// ABOUTME: Features section showcasing bulk.run capabilities
// ABOUTME: Grid of feature cards with emojis

const features = [
  {
    emoji: "📄",
    title: "CSV In, CSV Out",
    description: "Upload any CSV file up to 1,000 rows. Get back enriched data with new AI-generated columns.",
  },
  {
    emoji: "🧠",
    title: "Smart Prompts",
    description: "Use {{variables}} from your CSV columns. AI fills in the blanks for every row.",
  },
  {
    emoji: "🌐",
    title: "Web Search Built-in",
    description: "Enable real-time web search to enrich your data with current information.",
  },
  {
    emoji: "⚡",
    title: "Parallel Processing",
    description: "Process multiple rows simultaneously. 1,000 rows in seconds, not hours.",
  },
  {
    emoji: "⏱️",
    title: "Time Estimates",
    description: "Know exactly how long your batch will take before you start.",
  },
  {
    emoji: "🎯",
    title: "Structured Output",
    description: "Define output columns and get clean, consistent JSON data every time.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Everything you need for batch AI processing 🛠️
          </h2>
          <p className="mb-16 text-lg text-muted-foreground">
            No coding required. Just upload, configure, and run.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-green-500/30"
            >
              <div className="mb-4 text-4xl">{feature.emoji}</div>
              <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
