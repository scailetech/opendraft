/**
 * Thesis Writer Component - Clean Implementation
 * Two-panel layout: Form (left) + Results (right)
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { GraduationCap, Loader2, Download, FileText, BookOpen, Library, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

const LOADING_MESSAGES = [
  '🔍 Researching your topic',
  '📚 Gathering academic sources',
  '📖 Reading research papers',
  '📋 Creating thesis outline',
  '✍️ Writing introduction',
  '📝 Composing main chapters',
  '🎯 Formatting citations',
  '📄 Generating PDF and DOCX',
  '✨ Finalizing your thesis',
]

const ACADEMIC_LEVELS = [
  { value: 'bachelor', label: "Bachelor's", wordCount: '10-15k', chapters: '5-7' },
  { value: 'master', label: "Master's", wordCount: '20-30k', chapters: '7-10' },
  { value: 'phd', label: 'PhD', wordCount: '50-80k', chapters: '10-15' },
]

interface ThesisProgress {
  status: string
  current_phase?: string
  progress_percent: number
  sources_count: number
  chapters_count: number
  progress_details?: any
  pdf_url?: string
  docx_url?: string
  zip_url?: string
  error_message?: string
  processing_started_at?: string
  completed_at?: string
}

export function ThesisWriter() {
  // User email (hardcoded for testing, will get from auth in production)
  const userEmail = 'test@opendraft.ai'
  
  // Form state
  const [topic, setTopic] = useState('')
  const [academicLevel, setAcademicLevel] = useState('master')
  const [language, setLanguage] = useState('en')
  const [showMetadata, setShowMetadata] = useState(false)
  
  // Optional metadata
  const [authorName, setAuthorName] = useState('')
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [thesisId, setThesisId] = useState<string | null>(null)
  const [progress, setProgress] = useState<ThesisProgress | null>(null)
  
  // Milestone state
  const [milestones, setMilestones] = useState<any[]>([])
  const [lastMilestone, setLastMilestone] = useState<string>('')
  const [actualSources, setActualSources] = useState<any[]>([])
  const [actualChapters, setActualChapters] = useState<any[]>([])
  
  // Toast tracking - prevent spam
  const [hasShownCompletionToast, setHasShownCompletionToast] = useState(false)
  
  // Fetch actual content when available
  const fetchContent = async (id: string) => {
    try {
      const response = await fetch(`/api/thesis/${id}/content`)
      if (response.ok) {
        const data = await response.json()
        if (data.sources && data.sources.length > 0) {
          setActualSources(data.sources)
        }
      }
    } catch (error) {
      console.log('Content not yet available:', error)
    }
  }
  
  // UI state
  const [messageIndex, setMessageIndex] = useState(0)
  const [dots, setDots] = useState('')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  
  // PERSISTENCE: Restore running thesis on mount
  useEffect(() => {
    const savedThesisId = localStorage.getItem('current-thesis-id')
    const savedTopic = localStorage.getItem('current-thesis-topic')
    
    if (savedThesisId && savedTopic) {
      console.log('📦 Restoring thesis:', savedThesisId)
      setThesisId(savedThesisId)
      setTopic(savedTopic)
      setIsGenerating(true)
      
      // Immediate fetch
      pollFallback(savedThesisId)
      
      // Set up polling every 3 seconds
      const pollInterval = setInterval(() => {
        console.log('🔄 Polling update...')
        pollFallback(savedThesisId)
      }, 3000)
      
      // Subscribe to realtime (as enhancement)
      subscribeToProgress(savedThesisId)
      
      // Cleanup
      return () => {
        clearInterval(pollInterval)
      }
    }
  }, [])
  
  // Rotating messages effect
  useEffect(() => {
    if (!isGenerating) return

    const messageTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 3000)

    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 400)

    return () => {
      clearInterval(messageTimer)
      clearInterval(dotTimer)
    }
  }, [isGenerating])
  
  // Subscribe to real-time updates using Supabase Realtime
  const subscribeToProgress = async (id: string) => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      console.log('🔌 Subscribing to real-time updates for:', id)
      
      // Subscribe to changes on this specific thesis
      const channel = supabase
        .channel(`thesis-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'waitlist',
            filter: `id=eq.${id}`,
          },
          (payload) => {
            console.log('📡 Real-time update received!', payload.new)
            const data = payload.new as ThesisProgress
            setProgress(data)
            console.log('✅ UI updated:', data.progress_percent + '%', data.sources_count, 'sources')
            
            // Check for new milestones
            if (data.progress_details?.last_milestone && data.progress_details.last_milestone !== lastMilestone) {
              setLastMilestone(data.progress_details.last_milestone)
              
              // Show milestone notification
              const milestoneNames: any = {
                'research_complete': '📚 Research Complete!',
                'outline_complete': '📋 Outline Ready!',
                'chapter_1_complete': '✍️ Introduction Written!',
                'chapter_3_complete': '📝 Conclusion Written!',
              }
              
              const milestoneName = milestoneNames[data.progress_details.last_milestone]
              if (milestoneName) {
                toast.success(milestoneName, {
                  description: `${data.sources_count || 0} sources • ${data.chapters_count || 0} chapters`,
                  duration: 5000,
                })
              }
            }
            
            // Stop on completion - PREVENT TOAST SPAM
            if (data.status === 'completed' && isGenerating && !hasShownCompletionToast) {
              setIsGenerating(false)
              setHasShownCompletionToast(true)
              
              toast.success('🎉 Thesis Complete!', {
                description: `${data.sources_count} sources • ${data.chapters_count} chapters`,
                duration: 5000,
              })
              
              channel.unsubscribe()
              localStorage.removeItem('current-thesis-id')
              localStorage.removeItem('current-thesis-topic')
            } else if (data.status === 'failed' && isGenerating) {
              setIsGenerating(false)
              toast.error(data.error_message || 'Generation failed')
              channel.unsubscribe()
              localStorage.removeItem('current-thesis-id')
              localStorage.removeItem('current-thesis-topic')
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Subscription status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to real-time updates!')
          }
        })
      
      // ALSO use polling as backup (every 5 seconds)
      const pollInterval = setInterval(() => {
        console.log('🔄 Polling for updates (backup)')
        pollFallback(id)
      }, 5000)
      
      // Store both for cleanup
      pollingRef.current = { channel, interval: pollInterval } as any
      
    } catch (error) {
      console.error('Error setting up realtime:', error)
      // Fallback to polling if realtime fails
      pollingRef.current = setInterval(() => pollFallback(id), 5000) as any
    }
  }
  
  // Fallback polling if realtime fails
  const pollFallback = async (id: string) => {
    try {
      console.log('📊 Fetching status for:', id)
      const response = await fetch(`/api/thesis/${id}/status`)
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Got data:', data.progress_percent + '%', data.sources_count, 'sources')
        setProgress(data)
        
        // Stop polling if completed - PREVENT TOAST SPAM
        if (data.status === 'completed' || data.status === 'failed') {
          if (isGenerating) {
            setIsGenerating(false)
            
            // Show toast ONLY ONCE using flag
            if (data.status === 'completed' && !hasShownCompletionToast) {
              setHasShownCompletionToast(true)
              toast.success('🎉 Thesis Complete!', {
                description: `${data.sources_count} sources • ${data.chapters_count} chapters`,
                duration: 5000,
              })
            }
            
            localStorage.removeItem('current-thesis-id')
            localStorage.removeItem('current-thesis-topic')
          }
        }
      }
    } catch (error) {
      console.error('❌ Polling error:', error)
    }
  }
  
  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        const ref = pollingRef.current as any
        if (ref.channel) {
          ref.channel.unsubscribe()
        }
        if (ref.interval) {
          clearInterval(ref.interval)
        }
      }
    }
  }, [])
  
  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a thesis topic')
      return
    }
    
    setIsGenerating(true)
    setProgress(null)
    setThesisId(null)
    setMessageIndex(0)
    setHasShownCompletionToast(false) // Reset toast flag for new thesis
    
    try {
      const response = await fetch('/api/thesis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          topic: topic.trim(),
          academic_level: academicLevel,
          language,
          author_name: authorName.trim() || undefined,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to start thesis generation' }))
        throw new Error(error.error || 'Failed to start thesis generation')
      }
      
      const data = await response.json()
      const id = data.thesis_id || data.id
      setThesisId(id)
      
      // PERSIST: Save to localStorage so we can restore if user navigates away
      localStorage.setItem('current-thesis-id', id)
      localStorage.setItem('current-thesis-topic', topic.trim())
      
      toast.success('Thesis generation started!')
      
      // Subscribe to real-time updates
      subscribeToProgress(id)
      pollFallback(id)
      
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate thesis')
      setIsGenerating(false)
    }
  }
  
  const handleDownload = (url: string, filename: string) => {
    window.open(url, '_blank')
  }
  
  return (
    <div className="h-full flex">
      {/* LEFT PANEL - Form */}
      <div className="w-96 border-r border-border p-6 overflow-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Generate Thesis</h2>
            <p className="text-xs text-muted-foreground">
              AI-powered academic thesis generation
            </p>
          </div>
          
          {/* Topic Input */}
          <div className="space-y-2">
            <Label htmlFor="topic" className="text-sm font-medium">
              Thesis Topic <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="topic"
              placeholder="e.g., The Impact of AI on Academic Research Methodologies"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="text-sm resize-none"
              rows={3}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Be specific - this will guide the research and writing
            </p>
          </div>
          
          {/* Academic Level */}
          <div className="space-y-2">
            <Label htmlFor="level" className="text-sm font-medium">
              Academic Level
            </Label>
            <select
              id="level"
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isGenerating}
            >
              {ACADEMIC_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label} ({level.wordCount} words, {level.chapters} chapters)
                </option>
              ))}
            </select>
          </div>
          
          {/* Language */}
          <div className="space-y-2">
            <Label htmlFor="language" className="text-sm font-medium">
              Language
            </Label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              disabled={isGenerating}
            >
              <option value="en">English</option>
              <option value="de">German (Deutsch)</option>
            </select>
          </div>
          
          {/* Optional Metadata - Collapsible */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMetadata(!showMetadata)}
              className="w-full px-3 py-2 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium"
            >
              <span className="text-xs">Author Information (Optional)</span>
              {showMetadata ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {showMetadata && (
              <div className="p-3 space-y-3 border-t border-border">
                <div className="space-y-2">
                  <Label htmlFor="author" className="text-xs">Your Name</Label>
                  <Input
                    id="author"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your full name"
                    className="text-sm"
                    disabled={isGenerating}
                  />
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Your name will appear on the thesis cover page
                </p>
              </div>
            )}
          </div>
          
          {/* Generate Button */}
          <Button
            onClick={(e) => {
              e.preventDefault()
              console.log('🔘 Generate button clicked!')
              console.log('Topic:', topic.trim())
              handleGenerate()
            }}
            disabled={!topic.trim() || isGenerating}
            className="w-full"
            size="lg"
            type="button"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <GraduationCap className="h-4 w-4 mr-2" />
                Generate Thesis
              </>
            )}
          </Button>
          
          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
              ⏱️ Generation Time
            </p>
            <p className="text-xs text-muted-foreground">
              Typical time: 30-60 minutes. You'll receive progress updates via email.
            </p>
          </div>
        </div>
      </div>
      
      {/* RIGHT PANEL - Results/Progress */}
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {/* Loading State - ENHANCED with live updates */}
        {isGenerating && !progress?.pdf_url && (
          <div className="h-full flex flex-col overflow-hidden p-6">
            {/* Header with Phase */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold">Generating Your Thesis</h3>
                <p className="text-xs text-muted-foreground">
                  {progress?.current_phase ? (
                    <span>Phase: <span className="font-medium text-primary">{progress.current_phase}</span></span>
                  ) : 'Initializing...'}
                </p>
              </div>
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-[spin_3s_linear_infinite]" />
                <div className="absolute inset-1 rounded-full border-2 border-t-primary/40 border-r-primary/40 border-b-transparent border-l-transparent animate-[spin_2s_linear_infinite_reverse]" />
                <div className="w-12 h-12 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-primary animate-pulse" />
                </div>
              </div>
            </div>
            
            {/* Progress Stats - Enhanced */}
            <div className="py-6 space-y-6">
              {/* Big Stats Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
                  <div className="text-3xl font-bold text-primary mb-1">{progress?.progress_percent || 0}%</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Complete</div>
                  <div className="mt-2 text-xs text-primary/70">
                    {progress?.current_phase === 'research' && '🔍 Researching'}
                    {progress?.current_phase === 'structure' && '📋 Planning'}
                    {progress?.current_phase === 'writing' && '✍️ Writing'}
                    {progress?.current_phase === 'compiling' && '🔧 Compiling'}
                    {progress?.current_phase === 'exporting' && '📦 Exporting'}
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-lg p-4 border border-emerald-500/20">
                  <div className="text-3xl font-bold text-emerald-600 mb-1">{progress?.sources_count || 0}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Sources</div>
                  <div className="mt-2 text-xs text-emerald-600/70">
                    {progress?.sources_count > 0 ? '✅ Academic papers' : '⏳ Searching...'}
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg p-4 border border-blue-500/20">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{progress?.chapters_count || 0}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Chapters</div>
                  <div className="mt-2 text-xs text-blue-600/70">
                    {progress?.chapters_count > 0 ? '✅ Written' : '⏳ Pending...'}
                  </div>
                </div>
              </div>
              
              {/* Enhanced Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-primary">{progress?.progress_percent || 0}%</span>
                </div>
                <div className="relative">
                  <Progress value={progress?.progress_percent || 0} className="h-3" />
                  {/* Milestone markers */}
                  <div className="absolute top-0 left-0 right-0 h-3 flex items-center justify-between px-1 pointer-events-none">
                    <div className={`w-1 h-full rounded-full ${(progress?.progress_percent || 0) >= 22 ? 'bg-emerald-500' : 'bg-gray-400'}`} title="Research complete" />
                    <div className={`w-1 h-full rounded-full ${(progress?.progress_percent || 0) >= 30 ? 'bg-blue-500' : 'bg-gray-400'}`} title="Outline ready" />
                    <div className={`w-1 h-full rounded-full ${(progress?.progress_percent || 0) >= 42 ? 'bg-purple-500' : 'bg-gray-400'}`} title="Introduction done" />
                    <div className={`w-1 h-full rounded-full ${(progress?.progress_percent || 0) >= 72 ? 'bg-orange-500' : 'bg-gray-400'}`} title="Writing complete" />
                    <div className={`w-1 h-full rounded-full ${(progress?.progress_percent || 0) >= 100 ? 'bg-green-500' : 'bg-gray-400'}`} title="Complete" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span className="text-[10px]">22% Research</span>
                  <span className="text-[10px]">30% Outline</span>
                  <span className="text-[10px]">42% Intro</span>
                  <span className="text-[10px]">72% Writing</span>
                  <span>100%</span>
                </div>
              </div>
              
              {/* Current Stage - Detailed */}
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium mb-1">
                      {progress?.progress_details?.stage ? (
                        // Show REAL stage from backend with better formatting
                        <span>
                          {progress.progress_details.stage
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, l => l.toUpperCase())
                            .replace('Ai', 'AI')
                            .replace('Pdf', 'PDF')
                            .replace('Docx', 'DOCX')}
                        </span>
                      ) : (
                        'Initializing thesis generation...'
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {progress?.current_phase === 'research' && 'Finding academic sources from CrossRef, Semantic Scholar, and Google Scholar'}
                      {progress?.current_phase === 'structure' && 'Creating outline with AI agents (Architect + Formatter)'}
                      {progress?.current_phase === 'writing' && 'Generating chapters with specialized AI writers (Crafter agents)'}
                      {progress?.current_phase === 'compiling' && 'Assembling thesis, formatting citations, and enhancing content'}
                      {progress?.current_phase === 'exporting' && 'Generating professional PDF with Pandoc/XeLaTeX and DOCX'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Live Content - Show sources/chapters as they appear */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="progress" className="h-full flex flex-col">
                <TabsList className="flex-shrink-0">
                  <TabsTrigger value="progress">Progress</TabsTrigger>
                  <TabsTrigger value="sources">Sources ({progress?.sources_count || 0})</TabsTrigger>
                  <TabsTrigger value="chapters">Chapters ({progress?.chapters_count || 0})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="progress" className="flex-1 overflow-auto mt-4 space-y-3">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                      💡 Feel free to navigate away
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your thesis is being generated in the background. We'll email you at each milestone and when it's complete. 
                      You can close this tab and come back anytime - progress will be saved!
                    </p>
                  </div>
                  
                  {progress?.progress_details?.stage && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium">Current Stage:</p>
                      <p className="text-sm text-muted-foreground mt-1">{progress.progress_details.stage}</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="sources" className="flex-1 overflow-auto mt-4">
                  {progress && progress.sources_count > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {progress.sources_count} Academic Sources
                        </p>
                        <button
                          onClick={() => fetchContent(thesisId!)}
                          className="text-xs text-primary hover:underline"
                        >
                          Load details
                        </button>
                      </div>
                      
                      {actualSources.length > 0 ? (
                        <div className="space-y-2">
                          {actualSources.slice(0, 20).map((source: any, i: number) => (
                            <div key={i} className="bg-muted/30 rounded-lg p-3 border border-border/50 hover:bg-muted/50 transition-colors">
                              <div className="flex items-start gap-3">
                                <Library className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium line-clamp-2">
                                    {source.title || source.name || `Source ${i + 1}`}
                                  </div>
                                  {source.authors && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {Array.isArray(source.authors) ? source.authors.slice(0, 3).join(', ') : source.authors}
                                    </div>
                                  )}
                                  {source.year && (
                                    <div className="text-xs text-muted-foreground">Year: {source.year}</div>
                                  )}
                                  {source.url && (
                                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                      View source →
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {actualSources.length > 20 && (
                            <p className="text-xs text-muted-foreground text-center pt-2">
                              + {actualSources.length - 20} more sources (download thesis to see all)
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                            📚 {progress.sources_count} sources found!
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Sources are included in your thesis. Download the PDF to see the complete bibliography with all citations.
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Click "Load details" above to fetch source list (if milestone files are available).
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      <Library className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      Searching for academic sources...
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="chapters" className="flex-1 overflow-auto mt-4">
                  {progress && progress.chapters_count > 0 ? (
                    <div className="space-y-2">
                      {Array.from({ length: progress.chapters_count }).map((_, i) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                          <div className="flex items-start gap-2">
                            <BookOpen className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium">Chapter {i + 1}</div>
                              <div className="text-xs text-emerald-600 dark:text-emerald-400">✓ Complete</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      Chapters will appear here as they're written...
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Keyframes */}
            <style jsx global>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>
        )}
        
        {/* Empty State */}
        {!isGenerating && !progress?.pdf_url && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground/50" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Ready to Write Your Thesis?</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your thesis topic on the left and click Generate to start.
                  We'll create a complete academic thesis with citations, chapters, and professional formatting.
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-3 pt-4">
                <div className="text-center space-y-1">
                  <Library className="h-6 w-6 mx-auto text-primary/60" />
                  <p className="text-xs font-medium">50+ Sources</p>
                </div>
                <div className="text-center space-y-1">
                  <BookOpen className="h-6 w-6 mx-auto text-primary/60" />
                  <p className="text-xs font-medium">7-10 Chapters</p>
                </div>
                <div className="text-center space-y-1">
                  <FileText className="h-6 w-6 mx-auto text-primary/60" />
                  <p className="text-xs font-medium">PDF & DOCX</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Completed State */}
        {progress?.pdf_url && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between pb-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold">Your Thesis is Ready!</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>📚 {progress.sources_count} sources</span>
                  <span>•</span>
                  <span>📝 {progress.chapters_count} chapters</span>
                  <span>•</span>
                  <span>✅ Completed</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                {progress.pdf_url && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.open(progress.pdf_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                )}
                
                {progress.docx_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(progress.docx_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    DOCX
                  </Button>
                )}
                
                {progress.zip_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(progress.zip_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    ZIP
                  </Button>
                )}
              </div>
            </div>
            
            {/* Tabbed Interface */}
            <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="flex-shrink-0">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="outline">Outline</TabsTrigger>
                <TabsTrigger value="sources">Sources ({progress.sources_count})</TabsTrigger>
                <TabsTrigger value="chapters">Chapters ({progress.chapters_count})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview" className="flex-1 overflow-auto border border-border rounded-lg p-6 mt-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h1>{topic}</h1>
                  <p className="text-muted-foreground">
                    Download the PDF or DOCX to view the complete thesis.
                  </p>
                  
                  <div className="bg-muted/30 rounded-lg p-4 mt-6">
                    <p className="text-sm">
                      📄 Your thesis has been generated successfully with {progress.sources_count} academic sources
                      and {progress.chapters_count} chapters.
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="outline" className="flex-1 overflow-auto border border-border rounded-lg p-6 mt-4">
                <div className="text-sm text-muted-foreground">
                  Thesis outline will be displayed here...
                </div>
              </TabsContent>
              
              <TabsContent value="sources" className="flex-1 overflow-auto border border-border rounded-lg p-6 mt-4">
                <div className="text-sm text-muted-foreground">
                  Bibliography with {progress.sources_count} sources will be displayed here...
                </div>
              </TabsContent>
              
              <TabsContent value="chapters" className="flex-1 overflow-auto border border-border rounded-lg p-6 mt-4">
                <div className="text-sm text-muted-foreground">
                  Individual chapters will be listed here...
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}
