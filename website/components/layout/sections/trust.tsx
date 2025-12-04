// ABOUTME: Trust section - social proof bar with icon badges
// ABOUTME: Shows GitHub stats and key metrics in a compact design

"use client";
import { useGitHubStats, formatNumber } from "@/lib/hooks/useGitHubStats";
import { Star, GitFork, Database, Bot, CheckCircle } from "lucide-react";

export const TrustSection = () => {
  const { data: stats, loading } = useGitHubStats("federicodeponte/opendraft");

  const metrics = [
    {
      icon: Star,
      value: loading ? "—" : formatNumber(stats?.stars || 0),
      label: "GitHub Stars",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      icon: GitFork,
      value: loading ? "—" : formatNumber(stats?.forks || 0),
      label: "Forks",
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      icon: Database,
      value: "200M+",
      label: "Research Papers",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: Bot,
      value: "19",
      label: "AI Agents",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      icon: CheckCircle,
      value: "95%+",
      label: "Citation Accuracy",
      color: "text-accent",
      bg: "bg-accent/10",
    },
  ];

  return (
    <section className="py-8 border-y border-border/50 bg-muted/30">
      <div className="container">
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
          {metrics.map((metric, index) => (
            <div key={metric.label} className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${metric.bg} flex items-center justify-center`}>
                <metric.icon className={`w-4 h-4 ${metric.color}`} />
              </div>
              <div>
                <p className="font-semibold text-lg leading-none">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
              {index < metrics.length - 1 && (
                <div className="hidden md:block w-px h-8 bg-border ml-4" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
