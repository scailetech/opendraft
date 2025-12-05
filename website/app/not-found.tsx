// ABOUTME: Custom 404 page with SEO-friendly messaging
// ABOUTME: Provides helpful navigation back to main content

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <span className="text-8xl font-bold text-primary/20">404</span>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
        
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. 
          Let&apos;s get you back on track.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link href="/blog">
              <Search className="w-4 h-4 mr-2" />
              Browse Blog
            </Link>
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mt-8">
          Looking for thesis help?{' '}
          <Link href="/waitlist" className="text-primary hover:underline">
            Join our waitlist
          </Link>
        </p>
      </div>
    </div>
  )
}

