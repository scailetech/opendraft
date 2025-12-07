'use client'

import Link from 'next/link'
import { Home, ArrowLeft, Play, ScrollText, User } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-2xl w-full text-center space-y-8 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" showText={true} />
        </div>

        {/* 404 Number - Large and Stylized */}
        <div className="relative">
          <h1 className="text-9xl sm:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-br from-primary via-primary/80 to-primary/60 leading-none">
            404
          </h1>
          <div className="absolute inset-0 text-9xl sm:text-[12rem] font-bold text-primary/5 blur-3xl -z-10">
            404
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
            Page Not Found
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. 
            Let&apos;s get you back on track.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto"
          >
            <Link href="/go">
              <Home className="mr-2 h-4 w-4" />
              Go to App
            </Link>
          </Button>
          
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Quick Links */}
        <div className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">
            Popular pages:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/go"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Play className="h-4 w-4" />
              Run Batch
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/log"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <ScrollText className="h-4 w-4" />
              View Logs
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

