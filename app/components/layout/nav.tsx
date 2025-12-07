/**
 * ABOUTME: Main navigation header component for authenticated pages
 * ABOUTME: Shows app title, navigation links, user email, and sign out button
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Moon, Sun, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/Logo'
import { useTheme } from 'next-themes'

export function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { userEmail, userAvatar } = useAuth()
  const [_hasMounted, setHasMounted] = useState(false)

  // Prevent hydration mismatch for CSS transitions
  useEffect(() => {
    setHasMounted(true)
  }, [])

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      if (supabase) {
        await supabase.auth.signOut()
        router.push('/auth')
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to sign out:', err)
      // Still redirect to auth page on error
      router.push('/auth')
    }
  }

  // Clean navigation: WRITE → CONTEXT → LOG → SETTINGS
  const navLinks = [
    { href: '/write', label: 'WRITE' },
    { href: '/context', label: 'CONTEXT' },
    { href: '/log', label: 'LOG' },
    { href: '/settings', label: 'SETTINGS' },
  ]

  // Helper function to check if a link is active (including sub-routes)
  const isLinkActive = (linkHref: string): boolean => {
    if (pathname === linkHref) return true
    return pathname.startsWith(linkHref + '/')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-2 sm:pt-4">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="bg-background/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-lg">
          <div className="flex h-16 sm:h-14 items-center justify-center gap-2 px-4 sm:px-6 relative">
          {/* Logo - Positioned on left */}
          <div className="flex-shrink-0 absolute left-4 sm:left-6">
            <Logo size="sm" />
          </div>

          {/* Centered Navigation Links */}
          <nav className="flex items-center justify-center" aria-label="Main navigation">
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 border border-border/60 shadow-sm relative h-10 sm:h-9">
              {navLinks.map((link) => {
                const isActive = isLinkActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={true}
                    className={cn(
                      'relative px-5 h-9 sm:h-8 text-sm font-medium transition-colors duration-200 rounded-md z-10',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'flex items-center justify-center',
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-background shadow-sm rounded-md transition-all duration-200" />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Right Side Actions - Positioned on right */}
          <div className="flex items-center justify-end flex-shrink-0 absolute right-4 sm:right-6">
            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-lg transition-all hover:bg-accent/50 border border-transparent hover:border-border/40 p-0"
                  data-testid="user-menu-button"
                  aria-label="User menu"
                  aria-haspopup="true"
                >
                  {userAvatar ? (
                    <img 
                      src={userAvatar} 
                      alt="Profile" 
                      className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg object-cover border border-border/40 grayscale"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                      <span className="text-lg" role="img" aria-label="Profile">🤖</span>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 shadow-lg border-border/50">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3 py-2">
                    {userAvatar ? (
                      <img 
                        src={userAvatar} 
                        alt="Profile" 
                        className="w-10 h-10 rounded-lg object-cover border border-border/40 grayscale"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                        <span className="text-xl" role="img" aria-label="Profile">🤖</span>
                      </div>
                    )}
                    <div className="flex flex-col space-y-0.5 flex-1 min-w-0">
                      <p className="text-sm font-semibold">My Account</p>
                      {userEmail && (
                        <p className="text-xs text-muted-foreground truncate">
                          {userEmail}
                        </p>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    router.push('/settings')
                  }}
                  className="cursor-pointer py-2.5"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span className="text-sm">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Theme switcher with sliding indicator */}
                <div className="px-3 py-2.5">
                  <div className="relative flex items-center p-1 bg-muted rounded-xl border border-border/50">
                    {/* Sliding indicator */}
                    <div
                      className={cn(
                        "absolute top-1 bottom-1 w-[calc(33.333%-2px)] rounded-lg shadow-sm border border-border/30 transition-all duration-300 ease-out",
                        "bg-gradient-to-b from-background to-background/90"
                      )}
                      style={{
                        left: theme === 'light' ? '4px' : theme === 'dark' ? 'calc(33.333% + 2px)' : 'calc(66.666%)',
                      }}
                    />
                    {/* Light */}
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all duration-200",
                        theme === 'light' 
                          ? 'text-foreground' 
                          : 'text-muted-foreground hover:text-foreground/70'
                      )}
                      aria-label="Light mode"
                    >
                      <Sun className={cn("h-3.5 w-3.5 transition-transform", theme === 'light' && "text-amber-500")} />
                      <span className="text-[11px] font-medium">Light</span>
                    </button>
                    {/* Dark */}
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all duration-200",
                        theme === 'dark' 
                          ? 'text-foreground' 
                          : 'text-muted-foreground hover:text-foreground/70'
                      )}
                      aria-label="Dark mode"
                    >
                      <Moon className={cn("h-3.5 w-3.5 transition-transform", theme === 'dark' && "text-blue-400")} />
                      <span className="text-[11px] font-medium">Dark</span>
                    </button>
                    {/* System */}
                    <button
                      onClick={() => setTheme('system')}
                      className={cn(
                        "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all duration-200",
                        theme === 'system' 
                          ? 'text-foreground' 
                          : 'text-muted-foreground hover:text-foreground/70'
                      )}
                      aria-label="System theme"
                    >
                      <Monitor className={cn("h-3.5 w-3.5 transition-transform", theme === 'system' && "text-primary")} />
                      <span className="text-[11px] font-medium">Auto</span>
                    </button>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    handleSignOut()
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive py-2.5"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="text-sm font-medium">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
        </div>
      </div>
    </header>
  )
}
