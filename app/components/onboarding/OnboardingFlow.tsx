/**
 * ABOUTME: Simple onboarding flow for first-time users
 * ABOUTME: Guides users through: Upload CSV -> Describe goal -> Get enriched CSV
 */

'use client'

import { useState, useEffect } from 'react'
import { X, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OnboardingFlowProps {
  onDismiss: () => void
  onComplete: () => void
}

export function OnboardingFlow({ onDismiss, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1)

  // Check if user has seen onboarding before
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('bulk-run-onboarding-seen')
    if (hasSeenOnboarding === 'true') {
      onDismiss()
    }
  }, [onDismiss])

  const handleComplete = () => {
    localStorage.setItem('bulk-run-onboarding-seen', 'true')
    onComplete()
  }

  const steps = [
    {
      number: 1,
      emoji: '👟',  // Ready to run!
      title: 'Drop your CSV',
      description: 'Each row becomes an AI task',
      hint: 'names, emails, companies...',
      gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent'
    },
    {
      number: 2,
      emoji: '🏃',  // Running!
      title: 'Write your prompt',
      description: 'Tell AI what to generate',
      hint: '"Write a bio for {{name}}"',
      gradient: 'from-violet-500/20 via-purple-500/10 to-transparent'
    },
    {
      number: 3,
      emoji: '🏁',  // Finish line!
      title: 'Get enriched data',
      description: 'Download with new AI columns',
      hint: 'Original + AI-generated content',
      gradient: 'from-green-500/20 via-green-500/10 to-transparent'
    }
  ]

  const currentStep = steps[step - 1]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div 
        className="relative max-w-md w-full overflow-hidden rounded-2xl bg-background/95 border border-border/50 shadow-2xl"
        style={{
          animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Animated gradient background */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${currentStep.gradient} transition-all duration-700`}
          style={{ opacity: 0.8 }}
        />
        
        {/* Content */}
        <div className="relative p-8">
          {/* Close button */}
          <button
            onClick={handleComplete}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all"
            aria-label="Skip onboarding"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-8">
            {steps.map((s) => (
              <div
                key={s.number}
                className={`rounded-full transition-all duration-300 ${
                  s.number === step 
                    ? 'w-6 h-1.5 bg-foreground' 
                    : s.number < step 
                      ? 'w-1.5 h-1.5 bg-foreground/60' 
                      : 'w-1.5 h-1.5 bg-foreground/20'
                }`}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="text-center mb-8">
            {/* Large emoji with glow */}
            <div className="relative inline-block mb-6">
              <div 
                className="text-6xl"
                style={{
                  animation: 'float 3s ease-in-out infinite',
                  filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.1))'
                }}
              >
                {currentStep.emoji}
              </div>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
              {currentStep.title}
            </h2>
            
            {/* Description */}
            <p className="text-muted-foreground mb-4">
              {currentStep.description}
            </p>
            
            {/* Hint box */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <code className="text-xs text-muted-foreground font-mono">
                {currentStep.hint}
              </code>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={step > 1 ? () => setStep(step - 1) : handleComplete}
            >
              {step > 1 ? 'Back' : 'Skip'}
            </Button>
            
            <Button
              onClick={step < steps.length ? () => setStep(step + 1) : handleComplete}
              className="group gap-2"
            >
              {step < steps.length ? (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              ) : (
                <>
                  Get Started
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* CSS animations */}
        <style jsx>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    </div>
  )
}

