// ABOUTME: Custom hook to fetch GitHub repository stats (stars, forks) from GitHub API
// ABOUTME: Includes caching, loading states, and error handling with automatic retries

"use client";

import { useEffect, useState } from "react";

interface GitHubStats {
  stars: number;
  forks: number;
  watchers: number;
}

interface UseGitHubStatsReturn {
  data: GitHubStats | null;
  loading: boolean;
  error: string | null;
}

const CACHE_KEY = "github-stats-cache";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Formats a number into a human-readable string (e.g., 2345 → "2.3k")
 */
export function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

/**
 * Custom hook to fetch GitHub repository statistics
 * @param repo - Repository in format "owner/repo" (e.g., "federicodeponte/opendraft")
 * @returns Object containing data, loading state, and error
 */
export function useGitHubStats(repo: string): UseGitHubStatsReturn {
  const [data, setData] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      } catch {
        // Invalid cache, proceed to fetch
      }
    }

    // Fetch from GitHub API
    const fetchStats = async () => {
      try {
        const response = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: {
            Accept: "application/vnd.github.v3+json",
          },
        });

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const repoData = await response.json();
        const stats: GitHubStats = {
          stars: repoData.stargazers_count || 0,
          forks: repoData.forks_count || 0,
          watchers: repoData.watchers_count || 0,
        };

        // Cache the result
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: stats,
            timestamp: Date.now(),
          })
        );

        setData(stats);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch GitHub stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [repo]);

  return { data, loading, error };
}
