// ABOUTME: AI Agents - Clean Cursor-style pipeline with research stats
// ABOUTME: All agents visible, hover = highlight only, research pipeline below

"use client";
import { useState } from "react";
import { Check, Search, Layers, PenTool, ShieldCheck, Sparkles, Rocket } from "lucide-react";

const phases = [
  { name: "Research", icon: Search, agents: ["Deep Research", "Scout", "Scribe", "Signal"] },
  { name: "Structure", icon: Layers, agents: ["Architect", "Citation Manager", "Formatter"] },
  { name: "Compose", icon: PenTool, agents: ["Crafter", "Narrator", "Thread"] },
  { name: "Validate", icon: ShieldCheck, agents: ["Skeptic", "Verifier", "Referee"] },
  { name: "Refine", icon: Sparkles, agents: ["Citation Verifier", "Voice", "Entropy", "Polish"] },
  { name: "Enhance", icon: Rocket, agents: ["Abstract Generator", "Enhancer"] },
];

const pipelineStats = [
  { value: "70-84", label: "Queries" },
  { value: "600+", label: "Sources Found" },
  { value: "200+", label: "Screened" },
  { value: "80+", label: "Validated" },
  { value: "50+", label: "Final Citations" },
];

export const AgentsSection = () => {
  const [hoveredPhase, setHoveredPhase] = useState<number | null>(null);

  const getNodeState = (index: number) => {
    if (hoveredPhase === null) return "default";
    if (index < hoveredPhase) return "completed";
    if (index === hoveredPhase) return "active";
    return "upcoming";
  };

  return (
    <section id="agents" className="py-32 border-t border-border/50">
      <div className="container max-w-5xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            19 agents. 6 phases. One workflow.
          </h2>
        </div>

        {/* Desktop: All agents visible */}
        <div className="hidden md:grid grid-cols-6 gap-3">
          {phases.map((phase, index) => {
            const state = getNodeState(index);
            const Icon = phase.icon;
            const isActive = state === "active";

            return (
              <div
                key={phase.name}
                className={`
                  rounded-xl cursor-pointer p-4
                  border transition-colors duration-150
                  ${isActive
                    ? "bg-accent/10 border-accent"
                    : state === "completed"
                    ? "bg-accent/5 border-accent/30"
                    : state === "upcoming"
                    ? "bg-card/30 border-border/30"
                    : "bg-card border-border/50 hover:border-border"
                  }
                `}
                onMouseEnter={() => setHoveredPhase(index)}
                onMouseLeave={() => setHoveredPhase(null)}
              >
                {/* Icon */}
                <div className="flex items-center justify-center mb-2">
                  {state === "completed" ? (
                    <Check className="w-5 h-5 text-accent" />
                  ) : (
                    <Icon className={`w-5 h-5 ${isActive ? "text-accent" : "text-muted-foreground"}`} />
                  )}
                </div>

                {/* Phase name */}
                <p className={`text-center font-medium text-sm mb-3 ${
                  isActive ? "text-accent" :
                  state === "completed" ? "text-accent/70" :
                  state === "upcoming" ? "text-muted-foreground/50" :
                  "text-foreground"
                }`}>
                  {phase.name}
                </p>

                {/* Agents - always visible */}
                <div className="space-y-1 pt-2 border-t border-border/30">
                  {phase.agents.map((agent) => (
                    <p key={agent} className={`text-xs font-mono text-center truncate ${
                      isActive ? "text-accent/80" :
                      state === "upcoming" ? "text-muted-foreground/30" :
                      "text-muted-foreground/60"
                    }`}>
                      {agent}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile: 2-column grid */}
        <div className="md:hidden grid grid-cols-2 gap-4">
          {phases.map((phase) => {
            const Icon = phase.icon;
            return (
              <div key={phase.name} className="p-4 rounded-xl bg-card border border-border/50">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="font-medium text-sm">{phase.name}</span>
                </div>
                <div className="space-y-1">
                  {phase.agents.map((agent) => (
                    <p key={agent} className="text-xs text-muted-foreground font-mono">
                      {agent}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Flow indicator */}
        <div className="hidden md:flex justify-center items-center gap-3 mt-12 text-muted-foreground">
          <span className="text-sm">Your Topic</span>
          <div className="flex items-center gap-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center">
                <div
                  className="w-2 h-2 rounded-full bg-accent animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
                {i < 5 && <div className="w-6 h-px bg-border" />}
              </div>
            ))}
          </div>
          <span className="text-sm">Complete Thesis</span>
        </div>

        {/* Research Pipeline Stats */}
        <div className="mt-16 pt-8 border-t border-border/30">
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-accent mb-2">Research Pipeline</p>
            <p className="text-muted-foreground text-sm">Every thesis goes through rigorous automated research</p>
          </div>

          {/* Pipeline flow */}
          <div className="flex flex-wrap justify-center items-center gap-2 md:gap-0">
            {pipelineStats.map((stat, index) => (
              <div key={stat.label} className="flex items-center">
                <div className="text-center px-4 py-2">
                  <p className="font-mono text-lg md:text-xl font-semibold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
                {index < pipelineStats.length - 1 && (
                  <div className="hidden md:block text-muted-foreground/40 text-lg">→</div>
                )}
              </div>
            ))}
          </div>

          {/* Accuracy badge */}
          <div className="flex justify-center mt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
              <Check className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">95%+ citation accuracy</span>
              <span className="text-xs text-muted-foreground">· Auto-verified via CrossRef & arXiv</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
