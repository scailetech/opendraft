// ABOUTME: Footer section with links to GitHub repo, documentation, and support resources
// ABOUTME: Shows OpenDraft branding and MIT license information

import { Separator } from "@/components/ui/separator";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export const FooterSection = () => {
  return (
    <footer id="footer" className="py-24 sm:py-32">
      <div className="w-[90%] md:w-[70%] lg:w-[75%] lg:max-w-screen-xl mx-auto p-10 bg-card border border-secondary rounded-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-8">
          <div className="col-span-full md:col-span-2">
            <Link href="https://github.com/federicodeponte/opendraft" target="_blank" className="flex font-bold items-center">
              <GraduationCap className="w-9 h-9 mr-2 bg-gradient-to-tr from-primary to-primary rounded-lg border border-border text-white p-1.5" />

              <h3 className="text-2xl">OpenDraft</h3>
            </Link>
            <p className="mt-4 text-muted-foreground">
              100% Free & Open Source AI-powered academic writing framework
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-lg">Resources</h3>
            <div>
              <Link href="https://github.com/federicodeponte/opendraft" target="_blank" className="opacity-60 hover:opacity-100">
                GitHub Repository
              </Link>
            </div>

            <div>
              <Link href="https://github.com/federicodeponte/opendraft#-quick-start-10-minutes" target="_blank" className="opacity-60 hover:opacity-100">
                Quick Start Guide
              </Link>
            </div>

            <div>
              <Link href="https://github.com/federicodeponte/opendraft/blob/master/00_START_HERE.md" target="_blank" className="opacity-60 hover:opacity-100">
                Documentation
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-lg">Support</h3>
            <div>
              <Link href="https://github.com/federicodeponte/opendraft/issues" target="_blank" className="opacity-60 hover:opacity-100">
                Report Issues
              </Link>
            </div>

            <div>
              <Link href="https://github.com/federicodeponte/opendraft/discussions" target="_blank" className="opacity-60 hover:opacity-100">
                Discussions
              </Link>
            </div>

            <div>
              <Link href="https://github.com/federicodeponte/opendraft#-frequently-asked-questions" target="_blank" className="opacity-60 hover:opacity-100">
                FAQ
              </Link>
            </div>
          </div>
        </div>

        <Separator className="my-6" />
        <section className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="text-center md:text-left">
            &copy; 2025 OpenDraft •{" "}
            <Link
              target="_blank"
              href="https://github.com/federicodeponte/opendraft/blob/master/LICENSE"
              className="text-primary transition-all border-primary hover:border-b-2"
            >
              MIT License
            </Link>
          </h3>
          <div className="flex gap-4 items-center">
            <Link
              target="_blank"
              href="https://github.com/federicodeponte/opendraft"
              className="opacity-60 hover:opacity-100"
            >
              ⭐ Star on GitHub
            </Link>
          </div>
        </section>
      </div>
    </footer>
  );
};
