// ABOUTME: How It Works section explaining the 4-step workflow for using OpenDraft
// ABOUTME: Setup (10 min) → Choose Agents → AI Processing (70-84 queries) → Review & Export

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileCode, Sparkles, FileSearch, FileCheck, type LucideIcon } from "lucide-react";

interface StepProps {
  step: number;
  icon: LucideIcon;
  title: string;
  description: string;
  stats?: string;
}

const stepsList: StepProps[] = [
  {
    step: 1,
    icon: FileCode,
    title: "Set Up in 10 Minutes",
    description:
      "Install Python dependencies, add your AI API key (free Gemini tier available), and you're ready to write.",
  },
  {
    step: 2,
    icon: Sparkles,
    title: "Choose Your Agents",
    description:
      "Select from 19 specialized agents across 6 phases: Research, Structure, Compose, Validate, Refine, Enhance.",
  },
  {
    step: 3,
    icon: FileSearch,
    title: "AI Researches & Writes",
    description:
      "Each thesis generates 70-84 targeted queries, screening 300-600 sources to find 50+ validated citations.",
    stats: "95%+ citation accuracy",
  },
  {
    step: 4,
    icon: FileCheck,
    title: "Review & Export",
    description:
      "Export to PDF, Word, or LaTeX with APA/MLA/Chicago/IEEE citations. Tables, equations, and appendices included.",
    stats: "3 export formats • 4 citation styles",
  },
];

export const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="container py-24 sm:py-32 bg-muted/50">
      <div className="text-center mb-12">
        <h2 className="text-lg text-primary text-center mb-2 tracking-wider">
          How It Works
        </h2>

        <h2 className="text-3xl md:text-4xl text-center font-bold mb-4">
          From Zero to Draft in 4 Steps
        </h2>

        <p className="md:w-1/2 mx-auto text-xl text-center text-muted-foreground">
          No coding skills required. Generate a 20,000-word thesis draft in 20-25 minutes.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stepsList.map(({ step, icon: Icon, title, description, stats }) => {
          const progress = (step / stepsList.length) * 100;
          return (
            <Card key={step} className="relative bg-background">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                {step}
              </div>
              <CardHeader className="pt-8">
                <div className="flex items-center justify-between mb-4 w-full">
                  <span className="text-sm font-medium text-muted-foreground">
                    Step {step} of {stepsList.length}
                  </span>
                  <span className="text-sm font-medium text-primary">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-2 mb-6" />
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-primary/20 p-3 rounded-full ring-8 ring-primary/10">
                    <Icon className="size-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-center">{title}</CardTitle>
              </CardHeader>

              <CardContent className="text-center">
                <p className="text-muted-foreground mb-2">{description}</p>
                {stats && (
                  <p className="text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1 inline-block">
                    {stats}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};
