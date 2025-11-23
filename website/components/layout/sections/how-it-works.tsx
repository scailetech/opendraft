// ABOUTME: How It Works section explaining the 4-step workflow for using OpenDraft
// ABOUTME: Setup (10 min) → Choose Agents → AI Processing → Review & Export

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
      "Select from 17 specialized agents: Scout for research, Architect for structure, Crafter for content, or use them all.",
  },
  {
    step: 3,
    icon: FileSearch,
    title: "AI Does the Heavy Lifting",
    description:
      "Each agent searches academic databases, generates content, validates citations, and structures your thesis automatically.",
  },
  {
    step: 4,
    icon: FileCheck,
    title: "Review & Export",
    description:
      "Review the output, make your edits, and export to PDF, Word, or LaTeX. Complete drafts in hours, refine in days.",
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
          No coding skills required. Just run simple commands and let AI handle the research and writing.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stepsList.map(({ step, icon: Icon, title, description }) => {
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

              <CardContent className="text-center text-muted-foreground">
                {description}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};
