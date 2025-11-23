// ABOUTME: Trust indicators section - social proof with GitHub metrics and paper database stats
// ABOUTME: Displays quantifiable metrics to build credibility (stars, forks, papers indexed)

"use client";
import { Star, GitFork, FileText } from "lucide-react";
import { useGitHubStats, formatNumber } from "@/lib/hooks/useGitHubStats";

export const TrustSection = () => {
  const { data: githubStats, loading: githubLoading } = useGitHubStats("federicodeponte/opendraft");

  return (
    <section className="container py-16 border-t border-border/40">
      <p className="text-center text-sm font-mono text-muted-foreground mb-8 uppercase tracking-wider">
        Trusted by researchers worldwide
      </p>

      <div className="flex flex-wrap justify-center items-center gap-12 opacity-80 hover:opacity-100 transition-opacity duration-500">
        {/* GitHub Stars */}
        <div className="flex items-center gap-3">
          <Star className="size-5 fill-primary text-primary" />
          <div className="flex flex-col">
            <span className="font-mono text-2xl font-bold">
              {githubLoading ? "..." : githubStats ? formatNumber(githubStats.stars) : "120+"}
            </span>
            <span className="text-sm text-muted-foreground">GitHub Stars</span>
          </div>
        </div>

        {/* GitHub Forks */}
        <div className="flex items-center gap-3">
          <GitFork className="size-5 text-accent" />
          <div className="flex flex-col">
            <span className="font-mono text-2xl font-bold">
              {githubLoading ? "..." : githubStats ? formatNumber(githubStats.forks) : "45+"}
            </span>
            <span className="text-sm text-muted-foreground">Active Forks</span>
          </div>
        </div>

        {/* Papers Indexed */}
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-primary" />
          <div className="flex flex-col">
            <span className="font-mono text-2xl font-bold">225M+</span>
            <span className="text-sm text-muted-foreground">Papers Indexed</span>
          </div>
        </div>
      </div>
    </section>
  );
};
