/**
 * Thesis Writer Component - Clean Implementation
 * Two-panel layout: Form (left) + Results (right)
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { GraduationCap, Loader2, Download, FileText, BookOpen, Library, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
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
}

export function ThesisWriter() {
  // Form state
  const [topic, setTopic] = useState('')
  const [academicLevel, setAcademicLevel] = useState('master')
  const [language, setLanguage] = useState('en')
  const [showMetadata, setShowMetadata] = useState(false)
  
  // Optional metadata
  const [authorName, setAuthorName] = useState('')
  const [institution, setInstitution] = useState('')
  const [advisor, setAdvisor] = useState('')
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [thesisId, setThesisId] = useState<string | null>(null)
  const [progress, setProgress] = useState<ThesisProgress | null>(null)
  
  // UI state
  const [messageIndex, setMessageIndex] = useState(0)
  const [dots, setDots] = useState('')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  
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
  
  // Poll for progress updates
  const pollProgress = async (id: string) => {
    try {
      const response = await fetch(`/api/thesis/${id}/status`)
      if (response.ok) {
        const data = await response.json()
        setProgress(data)
        
        // Update current phase for loading messages
        if (data.current_phase) {
          setCurrentPhase(data.current_phase)
        }
        
        // Stop polling if completed or failed
        if (data.status === 'completed' || data.status === 'failed') {
          setIsGenerating(false)
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
          }
          
          if (data.status === 'completed') {
            toast.success('Your thesis is ready!')
          } else {
            toast.error(data.error_message || 'Thesis generation failed')
          }
        }
      }
    } catch (error) {
      console.error('Error polling progress:', error)
    }
  }
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
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
    
    try {
      const response = await fetch('/api/thesis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          academic_level: academicLevel,
          language,
          author_name: authorName.trim() || undefined,
          institution: institution.trim() || undefined,
          advisor: advisor.trim() || undefined,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to start thesis generation' }))
        throw new Error(error.error || 'Failed to start thesis generation')
      }
      
      const data = await response.json()
      setThesisId(data.thesis_id || data.id)
      
      toast.success('Thesis generation started!')
      
      // Start polling for progress every 5 seconds
      if (data.thesis_id || data.id) {
        const id = data.thesis_id || data.id
        pollingRef.current = setInterval(() => {
          pollProgress(id)
        }, 5000)
        
        // Initial poll
        pollProgress(id)
      }
      
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate thesis')
      setIsGenerating(false)
    }
  }
  
  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
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
                  <Label htmlFor="author" className="text-xs">Author Name</Label>
                  <Input
                    id="author"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your full name"
                    className="text-sm"
                    disabled={isGenerating}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="institution" className="text-xs">Institution</Label>
                  <Input
                    id="institution"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="University name"
                    className="text-sm"
                    disabled={isGenerating}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="advisor" className="text-xs">Advisor/Supervisor</Label>
                  <Input
                    id="advisor"
                    value={advisor}
                    onChange={(e) => setAdvisor(e.target.value)}
                    placeholder="Prof. Dr. Name"
                    className="text-sm"
                    disabled={isGenerating}
                  />
                </div>
                
                <p className="text-xs text-muted-foreground">
                  This information will appear on the cover page
                </p>
              </div>
            )}
          </div>
          
          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!topic.trim() || isGenerating}
            className="w-full"
            size="lg"
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
              Typical time: 30-60 minutes depending on complexity. You'll receive progress updates via email.
            </p>
          </div>
        </div>
      </div>
      
      {/* RIGHT PANEL - Results/Progress */}
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {/* Loading State */}
        {isGenerating && !progress?.pdf_url && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md">
              {/* Animated Icon */}
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-primary/20 animate-[spin_3s_linear_infinite]" />
                <div className="absolute inset-1 w-18 h-18 rounded-full border-2 border-t-primary/40 border-r-primary/40 border-b-transparent border-l-transparent animate-[spin_2s_linear_infinite_reverse]" />
                <div className="w-20 h-20 flex items-center justify-center">
                  <GraduationCap className="h-9 w-9 text-primary animate-pulse" />
                </div>
              </div>
              
              {/* Current Message */}
              <div className="space-y-3">
                <div className="h-8 flex items-center justify-center">
                  <span
                    key={messageIndex}
                    className="text-base font-medium text-foreground animate-[fadeIn_0.3s_ease-in-out]"
                  >
                    {LOADING_MESSAGES[messageIndex]}{dots}
                  </span>
                </div>
                
                {/* Progress Info */}
                {progress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                      <span>📍 {progress.current_phase || 'Starting'}</span>
                      <span>•</span>
                      <span>{progress.progress_percent}%</span>
                    </div>
                    
                    {progress.sources_count > 0 && (
                      <p className="text-xs text-muted-foreground">
                        📚 Found {progress.sources_count} sources
                      </p>
                    )}
                    
                    {progress.chapters_count > 0 && (
                      <p className="text-xs text-muted-foreground">
                        📝 Written {progress.chapters_count} chapters
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="w-full max-w-sm mx-auto space-y-3">
                <Progress 
                  value={progress?.progress_percent || 0} 
                  className="h-2"
                />
                
                {/* Navigate Away Message */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    💡 Feel free to navigate away
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    We'll email you at each milestone and when it's complete
                  </p>
                </div>
              </div>
              
              {/* Keyframes */}
              <style jsx global>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(-4px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>
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
                  {progress.completed_at && (
                    <>
                      <span>•</span>
                      <span>✅ Completed</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                {progress.pdf_url && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleDownload(progress.pdf_url!, 'thesis.pdf')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                )}
                
                {progress.docx_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(progress.docx_url!, 'thesis.docx')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    DOCX
                  </Button>
                )}
                
                {progress.zip_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(progress.zip_url!, 'thesis-package.zip')}
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
                  
                  {/* Could fetch and display thesis content here */}
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

