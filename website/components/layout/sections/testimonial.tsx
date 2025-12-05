// ABOUTME: Community section - GitHub stats and contributor showcase
// ABOUTME: Shows live stats, contributor avatars, and MIT license badge

"use client";

import { Github, GitFork, Users, Star, MessageSquare, Scale } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useGitHubStats, formatNumber } from "@/lib/hooks/useGitHubStats";

export const CommunitySection = () => {
  const { data: stats, loading } = useGitHubStats("federicodeponte/opendraft");

  return (
    <section id="community" className="py-24 sm:py-32 border-t border-border/50">
      <div className="container max-w-4xl">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-accent mb-3">Open Source</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Built in the open
          </h2>
          <p className="text-muted-foreground">
            MIT licensed. Free forever. Contribute, customize, or just use it.
          </p>
        </div>

        {/* Two-column cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* GitHub Stats Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Github className="w-5 h-5" />
              <h3 className="font-semibold">GitHub Stats</h3>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Star className="w-4 h-4 text-yellow-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Stars</span>
                </div>
                <span className="font-semibold">
                  {loading ? "—" : formatNumber(stats?.stars || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <GitFork className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-sm text-muted-foreground">Forks</span>
                </div>
                <span className="font-semibold">
                  {loading ? "—" : formatNumber(stats?.forks || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Watchers</span>
                </div>
                <span className="font-semibold">
                  {loading ? "—" : stats?.watchers || 0}
                </span>
              </div>
            </div>

            <Button asChild className="w-full">
              <Link href="https://github.com/federicodeponte/opendraft" target="_blank">
                <Star className="mr-2 h-4 w-4" />
                Star on GitHub
              </Link>
            </Button>
          </div>

          {/* Community Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5" />
              <h3 className="font-semibold">Community</h3>
            </div>

            {/* Contributor avatars */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3">Top contributors</p>
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-medium text-muted-foreground"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full bg-accent/10 border-2 border-card flex items-center justify-center text-xs font-medium text-accent">
                  +{loading ? "—" : Math.max(0, (stats?.watchers || 0) - 8)}
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Join {loading ? "—" : stats?.watchers || 0}+ developers building the future of academic writing.
            </p>

            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <Link href="https://github.com/federicodeponte/opendraft/fork" target="_blank">
                  <GitFork className="mr-2 h-4 w-4" />
                  Fork
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="https://github.com/federicodeponte/opendraft/discussions" target="_blank">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Discuss
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* License badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border text-sm text-muted-foreground">
            <Scale className="w-4 h-4" />
            <span>MIT Licensed</span>
            <span className="text-border">·</span>
            <span>Free Forever</span>
          </div>
        </div>
      </div>
    </section>
  );
};
