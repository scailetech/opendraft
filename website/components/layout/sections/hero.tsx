// ABOUTME: Hero section - first impression with headline, CTAs, and visual branding
// ABOUTME: Shows dynamic GitHub stars badge, academic honesty alert, and real thesis screenshot carousel

"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { AlertTriangle, ArrowRight, Github, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useGitHubStats, formatNumber } from "@/lib/hooks/useGitHubStats";

const CAROUSEL_ITEMS = [
  { src: "/examples/thesis_page_01.png", alt: "Thesis title page" },
  { src: "/examples/thesis_page_02.png", alt: "Abstract and table of contents" },
  { src: "/examples/thesis_page_03.png", alt: "Introduction chapter" },
  { src: "/examples/thesis_page_04.png", alt: "Literature review section" },
  { src: "/examples/thesis_page_05.png", alt: "Methodology chapter" },
];

export const HeroSection = () => {
  const { data: githubStats, loading: githubLoading } = useGitHubStats("federicodeponte/opendraft");

  return (
    <section className="container w-full">
      <div className="grid place-items-center lg:max-w-screen-xl gap-8 mx-auto py-20 md:py-32">
        <div className="text-center space-y-6">
          <div className="max-w-screen-md mx-auto text-center space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] max-w-4xl mx-auto">
              Write Your Thesis{" "}
              <span className="text-primary">
                Faster
              </span>{" "}
              with AI
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto mt-6">
              Generate a 20,000-word master&apos;s thesis draft in{" "}
              <span className="font-mono text-primary">hours</span>, not{" "}
              <span className="line-through opacity-60">months</span>
            </p>
          </div>

          <p className="max-w-screen-sm mx-auto text-base text-muted-foreground leading-relaxed">
            AI-powered framework with 19 specialized agents. 100% open source (MIT), no coding skills required. Access to 200M+ research papers.
          </p>

          {/* GitHub Stats Badge */}
          <Link
            href="https://github.com/federicodeponte/opendraft"
            target="_blank"
            className="inline-block"
            aria-label="View OpenDraft on GitHub"
          >
            <Badge variant="outline" className="px-3 py-1.5 text-sm gap-2 hover:bg-accent/10 transition-colors cursor-pointer">
              <Github className="size-4" aria-hidden="true" />
              {githubLoading ? (
                <span>Loading...</span>
              ) : githubStats ? (
                <>
                  <Star className="size-4 fill-current" aria-hidden="true" />
                  <span>{formatNumber(githubStats.stars)} stars on GitHub</span>
                </>
              ) : (
                <span>View on GitHub</span>
              )}
            </Badge>
          </Link>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-8">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto px-8 py-6 text-base font-semibold group"
            >
              <Link href="/waitlist" aria-label="Join waitlist for free thesis generation">
                Get Free Thesis (100/day)
                <ArrowRight className="size-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-6 text-base font-semibold"
            >
              <Link
                href="https://github.com/federicodeponte/opendraft#-quick-start-10-minutes"
                target="_blank"
                aria-label="View quick start guide on GitHub"
              >
                <Github className="size-5 mr-2" aria-hidden="true" />
                I&apos;m Technical, Skip to Code
              </Link>
            </Button>
          </div>

          <div className="max-w-lg mx-auto p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>
                <strong>Important:</strong> Many institutions restrict AI-generated content. Check your institution&apos;s academic honesty policy and disclose AI use if required. Failure to disclose may constitute academic misconduct. <Link href="#faq" className="underline underline-offset-2 hover:text-yellow-900 dark:hover:text-yellow-100 transition-colors">Learn more</Link>.
              </span>
            </p>
          </div>
        </div>

        <div className="relative group mt-20 w-full">
          {/* Hero visual - Real thesis screenshots carousel */}
          <Carousel
            className="w-full md:w-[900px] lg:w-[1000px] mx-auto"
            opts={{ loop: true, align: "center" }}
          >
            <CarouselContent className="-ml-4">
              {CAROUSEL_ITEMS.map((item, index) => (
                <CarouselItem key={index} className="pl-4">
                  <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-white to-gray-50 dark:from-neutral-900 dark:to-neutral-800 p-8 rounded-2xl border shadow-lg hover:shadow-xl transition-shadow">
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      className="object-contain rounded-xl"
                      priority={index === 0}
                      loading={index === 0 ? undefined : "lazy"}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4 size-12 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-neutral-900" aria-label="Previous slide" />
            <CarouselNext className="right-4 size-12 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-neutral-900" aria-label="Next slide" />
          </Carousel>

          {/* Active slide indicators */}
          <div className="mt-6 flex justify-center gap-2">
            {CAROUSEL_ITEMS.map((_, index) => (
              <button
                key={index}
                className="h-2 w-2 rounded-full bg-muted-foreground/30 hover:bg-primary transition-all data-[active=true]:w-8 data-[active=true]:bg-primary"
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <div className="absolute bottom-0 left-0 w-full h-20 md:h-28 bg-gradient-to-b from-background/0 via-background/50 to-background rounded-lg pointer-events-none"></div>
        </div>
      </div>
    </section>
  );
};
