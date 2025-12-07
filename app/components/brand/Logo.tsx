'use client'

import Link from 'next/link'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
  const emojiSizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  return (
    <Link
      href="/"
      className={`group flex items-center gap-2 transition-all hover:opacity-90 flex-shrink-0 ${className}`}
    >
      <span 
        className={`${emojiSizeClasses[size]} group-hover:scale-110 transition-transform`}
        role="img" 
        aria-label="AEO Visibility Machine logo"
      >
        🤖
      </span>
      {showText && (
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          <span className={`font-semibold tracking-tight ${textSizeClasses[size]} bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent whitespace-nowrap`}>
            AEO Visibility
          </span>
          <span className={`font-normal ${textSizeClasses[size]} text-muted-foreground whitespace-nowrap`}>
            Machine
          </span>
        </div>
      )}
    </Link>
  )
}


