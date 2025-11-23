'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DownloadButtonsProps {
  pdfUrl?: string | null;
  docxUrl?: string | null;
  status: string;
}

export function DownloadButtons({ pdfUrl, docxUrl, status }: DownloadButtonsProps) {
  if (status !== 'completed' || (!pdfUrl && !docxUrl)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Thesis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {status === 'waiting' && 'Your thesis will be generated when your position is reached.'}
              {status === 'processing' && 'Your thesis is being generated now! Check back in a few minutes.'}
              {status === 'failed' && 'There was an error generating your thesis. Please contact support.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-600" />
          Your Thesis is Ready!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
            Completed
          </Badge>
          <span className="text-sm text-muted-foreground">Download expires in 7 days</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {pdfUrl && (
            <Button
              asChild
              className="w-full bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary text-white"
            >
              <a href={pdfUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </a>
            </Button>
          )}

          {docxUrl && (
            <Button
              asChild
              variant="outline"
              className="w-full border-2 border-border dark:border-border"
            >
              <a href={docxUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download Word
              </a>
            </Button>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Love your thesis?</strong> Star us on{' '}
            <a
              href="https://github.com/federicodeponte/opendraft"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              GitHub
            </a>{' '}
            and share with your academic friends!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
