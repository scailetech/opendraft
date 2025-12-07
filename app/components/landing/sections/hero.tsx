// ABOUTME: Hero section for AEO Visibility landing page
// ABOUTME: Interactive demo showing AI visibility optimization

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  const [demoState, setDemoState] = useState<'idle' | 'processing' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);

  // Auto-run demo on mount after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (demoState === 'idle') {
        runDemo();
      }
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only run once on mount

  const runDemo = () => {
    if (demoState === 'processing') return;
    
    setDemoState('processing');
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setDemoState('complete');
          return 100;
        }
        return prev + 20;
      });
    }, 300);
  };

  const resetDemo = () => {
    setDemoState('idle');
    setProgress(0);
  };

  return (
    <section className="relative">
      {/* Text content - centered */}
      <div className="container mx-auto px-4 pt-12 pb-8 md:pt-16 md:pb-10 text-center">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium leading-snug tracking-tight text-foreground mb-6 max-w-3xl mx-auto">
          Get discovered by{" "}
          <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">AI search engines</span>
          <br />
          <span className="text-muted-foreground">ChatGPT • Perplexity • Claude • Gemini</span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Answer Engine Optimization (AEO) platform. Generate strategic keywords and AI-optimized content to boost your brand visibility.
        </p>
        
        <Button asChild size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg">
          <Link href="/auth">
            Start Optimizing
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* App Preview - interactive demo */}
      <div className="container mx-auto px-4 pb-8">
        <div className="relative rounded-xl border border-border bg-card shadow-xl overflow-hidden mx-auto max-w-5xl">
          {/* App mockup */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-[400px]">
              {/* Left panel - Input */}
              <div className="border-r border-border/40 p-4 md:p-6 space-y-4">
                {/* Company Context */}
                <div className="rounded-lg border border-border/50 bg-background/50 overflow-hidden">
                  <div className="border-b border-border/40 bg-muted/20 px-3 py-2 flex items-center gap-2">
                    <span className="text-sm">🏢</span>
                    <span className="text-xs text-muted-foreground font-medium">Company Context</span>
                  </div>
                  <div className="p-3 space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Company:</span>{" "}
                      <span className="font-medium">Acme Corp</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Industry:</span>{" "}
                      <span className="font-medium">B2B SaaS</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Website:</span>{" "}
                      <span className="font-medium text-blue-500">acme.com</span>
                    </div>
                  </div>
                </div>

                {/* Generation Settings */}
                <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">🎯</span>
                    <span className="text-xs text-muted-foreground font-medium">AEO Strategy</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Keywords:</span>
                      <span className="font-medium text-xs">50 strategic</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Language:</span>
                      <span className="font-medium text-xs">English 🇺🇸</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Focus:</span>
                      <span className="font-medium text-xs">AI Visibility</span>
                    </div>
                  </div>
                </div>

                {/* Run button - clickable demo */}
                <Button 
                  onClick={demoState === 'complete' ? resetDemo : runDemo}
                  disabled={demoState === 'processing'}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 gap-2 shadow-lg transition-all"
                >
                  {demoState === 'processing' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating... {progress}%
                    </>
                  ) : demoState === 'complete' ? (
                    <>
                      <Play className="h-4 w-4" />
                      Generate Again
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Generate Keywords
                    </>
                  )}
                </Button>
              </div>

              {/* Right panel - Output with animations */}
              <div className="p-4 md:p-6 bg-muted/5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm">✨</span>
                  <span className="text-xs text-muted-foreground font-medium">AI-Optimized Keywords</span>
                  {demoState === 'complete' && (
                    <span className="ml-auto text-xs text-green-500 font-medium">✓ 50 generated</span>
                  )}
                  {demoState === 'processing' && (
                    <span className="ml-auto text-xs text-purple-500 font-medium animate-pulse">Generating...</span>
                  )}
                </div>
                
                {/* Results table - shows based on state */}
                {demoState === 'idle' ? (
                  <div className="rounded-lg border border-border/50 bg-background/50 overflow-hidden flex items-center justify-center h-[200px]">
                    <div className="text-center text-muted-foreground">
                      <Play className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Click &quot;Generate&quot; to see keywords</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/50 bg-background/50 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/30 bg-muted/10">
                            <th className="text-left px-3 py-2 text-muted-foreground font-medium">Keyword</th>
                            <th className="text-left px-3 py-2 text-muted-foreground font-medium">Intent</th>
                            <th className="text-left px-3 py-2 text-muted-foreground font-medium">Score</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          <tr className={`border-b border-border/20 transition-opacity duration-300 ${progress >= 20 ? 'opacity-100' : 'opacity-0'}`}>
                            <td className="px-3 py-1.5">AI-powered B2B solutions</td>
                            <td className="px-3 py-1.5"><span className="text-blue-500 text-xs bg-blue-500/10 px-1.5 py-0.5 rounded">Info</span></td>
                            <td className="px-3 py-1.5 text-green-500">95</td>
                          </tr>
                          <tr className={`border-b border-border/20 transition-opacity duration-300 ${progress >= 40 ? 'opacity-100' : 'opacity-0'}`}>
                            <td className="px-3 py-1.5">Enterprise SaaS platform</td>
                            <td className="px-3 py-1.5"><span className="text-purple-500 text-xs bg-purple-500/10 px-1.5 py-0.5 rounded">Trans</span></td>
                            <td className="px-3 py-1.5 text-green-500">92</td>
                          </tr>
                          <tr className={`border-b border-border/20 transition-opacity duration-300 ${progress >= 60 ? 'opacity-100' : 'opacity-0'}`}>
                            <td className="px-3 py-1.5">Business automation tools</td>
                            <td className="px-3 py-1.5"><span className="text-blue-500 text-xs bg-blue-500/10 px-1.5 py-0.5 rounded">Info</span></td>
                            <td className="px-3 py-1.5 text-green-500">88</td>
                          </tr>
                          <tr className={`text-muted-foreground/50 transition-opacity duration-300 ${progress >= 80 ? 'opacity-100' : 'opacity-0'}`}>
                            <td className="px-3 py-1.5">+ 47 more keywords...</td>
                            <td className="px-3 py-1.5"></td>
                            <td className="px-3 py-1.5"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Export buttons - only show when complete */}
                <div className={`flex gap-2 mt-4 transition-opacity duration-300 ${demoState === 'complete' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    📥 Export CSV
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    📊 Create Content
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </section>
  );
}
