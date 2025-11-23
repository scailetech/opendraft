// ABOUTME: Community section (replaced fake testimonials) showing open source value propositions
// ABOUTME: GitHub stars, growing community, active development, fork & customize options

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, GitFork, Users, MessageSquare, type LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatProps {
  icon: LucideIcon;
  title: string;
  description: string;
  link: string;
}

const statsList: StatProps[] = [
  {
    icon: Star,
    title: "Open Source",
    description: "100% free and open source on GitHub. Star the repository to show your support!",
    link: "https://github.com/federicodeponte/opendraft",
  },
  {
    icon: Users,
    title: "Growing Community",
    description: "Join researchers and students using AI to accelerate academic writing.",
    link: "https://github.com/federicodeponte/opendraft#readme",
  },
  {
    icon: MessageSquare,
    title: "Active Development",
    description: "Report issues, request features, and contribute to the project on GitHub.",
    link: "https://github.com/federicodeponte/opendraft/discussions",
  },
  {
    icon: GitFork,
    title: "Fork & Customize",
    description: "Fork the repository and customize it for your institution's specific needs.",
    link: "https://github.com/federicodeponte/opendraft/fork",
  },
];

export const CommunitySection = () => {
  return (
    <section id="community" className="container py-24 sm:py-32">
      <div className="text-center mb-8">
        <h2 className="text-lg text-primary text-center mb-2 tracking-wider">
          Open Source Community
        </h2>

        <h2 className="text-3xl md:text-4xl text-center font-bold mb-4">
          Built by Researchers, for Researchers
        </h2>

        <p className="md:w-1/2 mx-auto text-xl text-center text-muted-foreground">
          OpenDraft is 100% free and open source. See a 67-page example thesis on GitHub.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsList.map(({ icon: Icon, title, description, link }) => (
          <Card key={title} className="bg-muted/50 dark:bg-card">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="bg-primary/20 p-3 rounded-full ring-8 ring-primary/10">
                  <Icon className="size-6 text-primary" />
                </div>
              </div>
              <CardTitle className="text-center text-lg">{title}</CardTitle>
            </CardHeader>

            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">{description}</p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={link} target="_blank">
                  Learn More
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

// Backward compatibility export
export const TestimonialSection = CommunitySection;
