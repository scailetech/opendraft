// ABOUTME: Examples section showcasing real thesis output with PDF and DOCX download links
// ABOUTME: Displays a 104-page master's thesis example with quick stats and download buttons

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, FileCheck, BookOpen, FileCode } from "lucide-react";
import Link from "next/link";

export const ExamplesSection = () => {
  const exampleStats = [
    { icon: FileText, label: "104 Pages", description: "Complete thesis document" },
    { icon: BookOpen, label: "27,500+ Words", description: "Master's thesis length" },
    { icon: FileCheck, label: "Full Bibliography", description: "Verified references" },
    { icon: FileCode, label: "6 Chapters", description: "Full structure" },
  ];

  return (
    <section id="examples" className="container py-24 sm:py-32 bg-muted/50">
      <div className="text-center mb-12">
        <h2 className="text-lg text-primary text-center mb-2 tracking-wider">
          Real Examples
        </h2>

        <h2 className="text-3xl md:text-4xl text-center font-bold mb-4">
          See What AI Can Generate
        </h2>

        <p className="md:w-1/2 mx-auto text-xl text-center text-muted-foreground">
          Don&apos;t just take our word for it. Download and review a complete master&apos;s thesis generated entirely by OpenDraft.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card className="bg-background border-2 border-border dark:border-border shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-border dark:bg-border text-primary dark:text-border border-border dark:border-primary">
                    Master&apos;s Thesis
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                    Real Example
                  </Badge>
                </div>
                <CardTitle className="text-2xl md:text-3xl mb-2">
                  Academic AI Thesis: Complete Master&apos;s Thesis Example
                </CardTitle>
                <CardDescription className="text-base">
                  A comprehensive 104-page master&apos;s thesis on AI in academic writing, generated entirely using OpenDraft. Includes full literature review, methodology, results, discussion, and properly formatted citations.
                </CardDescription>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              {exampleStats.map(({ icon: Icon, label, description }) => (
                <div key={label} className="text-center p-3 bg-muted/50 rounded-lg">
                  <Icon className="size-5 mx-auto mb-2 text-accent" />
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                size="lg"
                className="flex-1 bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link
                  href="https://federicodeponte.github.io/opendraft/examples/academic_ai_thesis.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="size-5 mr-2" />
                  Download PDF (311 KB)
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="flex-1 border-2 border-border dark:border-border hover:border-border dark:hover:border-primary hover:bg-border dark:hover:bg-border"
              >
                <Link
                  href="https://federicodeponte.github.io/opendraft/examples/academic_ai_thesis.docx"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="size-5 mr-2" />
                  Download Word (86 KB)
                </Link>
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2">
              AI-generated example thesis using Gemini 2.5 Flash. Fully editable formats ready for your review. Generation time varies.
            </p>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            This thesis demonstrates the full capabilities of OpenDraft: comprehensive research integration, proper citation formatting, academic writing style, and export-ready draft structure. All citations were database-validated against CrossRef and arXiv during Phase 4 validation.
          </p>
        </div>
      </div>
    </section>
  );
};
