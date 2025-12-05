// ABOUTME: Hero section - premium design with floating badges
// ABOUTME: Gradient text, trust badges, and thesis carousel

"use client";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ArrowRight, Github, Shield, Database, Bot, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useGitHubStats, formatNumber } from "@/lib/hooks/useGitHubStats";

const CAROUSEL_ITEMS = [
  { src: "/examples/thesis_page_01.png", alt: "Thesis title page" },
  { src: "/examples/thesis_page_02.png", alt: "Table of contents" },
  { src: "/examples/thesis_page_03.png", alt: "Introduction chapter" },
  { src: "/examples/thesis_page_04.png", alt: "Literature review" },
  { src: "/examples/thesis_page_05.png", alt: "Methodology chapter" },
];

const trustBadges = [
  { icon: Shield, label: "MIT Licensed" },
  { icon: Database, label: "200M+ Papers" },
  { icon: Bot, label: "19 AI Agents" },
];

export const HeroSection = () => {
  const { data: githubStats, loading: githubLoading } = useGitHubStats("federicodeponte/opendraft");

  return (
    <section className="pt-24 pb-16 relative overflow-hidden">
      {/* Subtle background gradient - extends to very top of viewport */}
      <div className="absolute inset-x-0 -top-[200px] bottom-0 bg-gradient-to-b from-accent/8 via-accent/3 to-transparent pointer-events-none" />

      <div className="container relative">
        {/* Trust badges row */}
        <div className="flex justify-center gap-4 mb-8">
          {trustBadges.map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium"
            >
              <badge.icon className="w-3.5 h-3.5 text-accent" />
              {badge.label}
            </div>
          ))}
        </div>

        {/* Text content */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6">
            Write Your Thesis{" "}
            <span className="bg-gradient-to-r from-accent to-emerald-400 bg-clip-text text-transparent">
              10x Faster
            </span>{" "}
            with AI
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            19 specialized AI agents research, write, and cite automatically.
            Generate a complete thesis draft in{" "}
            <span className="line-through opacity-60">months</span>{" "}
            <span className="text-accent font-medium">minutes</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button asChild size="lg" className="h-12 px-8 bg-accent hover:bg-accent/90">
              <Link href="/waitlist">
                Get Free Thesis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8">
              <Link href="https://github.com/federicodeponte/opendraft" target="_blank">
                <Github className="mr-2 h-4 w-4" />
                Star on GitHub
                {!githubLoading && githubStats && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-xs">
                    {formatNumber(githubStats.stars)}
                  </span>
                )}
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-accent" />
              20 free/day
            </div>
            <span className="text-border">·</span>
            <span>No coding required</span>
            <span className="text-border">·</span>
            <span>100% open source</span>
          </div>
        </div>

        {/* Carousel with shadow */}
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border bg-card p-2 shadow-lg">
            <Carousel opts={{ loop: true, align: "center" }} className="w-full">
              <CarouselContent>
                {CAROUSEL_ITEMS.map((item, index) => (
                  <CarouselItem key={index}>
                    <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={item.src}
                        alt={item.alt}
                        fill
                        className="object-contain p-4"
                        priority={index === 0}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4 bg-background/90 backdrop-blur-sm border-border" />
              <CarouselNext className="right-4 bg-background/90 backdrop-blur-sm border-border" />
            </Carousel>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Real 60-page thesis generated by OpenDraft in ~15 minutes
          </p>
        </div>
      </div>
    </section>
  );
};
