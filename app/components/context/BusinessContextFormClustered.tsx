/**
 * Business Context Form - Clustered Structure
 * Manages all business context fields organized into logical clusters
 */

'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Save, Mail, Phone, Linkedin, Twitter, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useContextStorage } from '@/hooks/useContextStorage'
import { GTM_PLAYBOOKS, PRODUCT_TYPES } from '@/lib/config/gtm-config'
import type { GTMPlaybook, ProductType } from '@/lib/types/business-context'
import { CollapsibleSection } from '@/components/ui/collapsible-section'

interface BusinessContextFormData {
  // Core Business Info
  tone?: string
  valueProposition?: string
  productDescription?: string
  products?: string[]
  companyName?: string
  companyWebsite?: string
  
  // Target Audience
  icp?: string
  targetCountries?: string
  targetIndustries?: string
  marketingGoals?: string[]
  
  // Competitive Intelligence
  competitors?: string
  targetKeywords?: string[]
  competitorKeywords?: string[]
  
  // GTM Classification
  gtmPlaybook?: GTMPlaybook | null
  productType?: ProductType | null
  
  // Compliance & Legal
  complianceFlags?: string
  legalEntity?: string
  vatNumber?: string
  registrationNumber?: string
  
  // Social & Contact
  contactEmail?: string
  contactPhone?: string
  linkedInUrl?: string
  twitterUrl?: string
  githubUrl?: string
}

export function BusinessContextFormClustered() {
  const { updateContext } = useContextStorage()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [formData, setFormData] = useState<BusinessContextFormData>({
    tone: '',
    valueProposition: '',
    productDescription: '',
    products: [],
    companyName: '',
    companyWebsite: '',
    icp: '',
    targetCountries: '',
    targetIndustries: '',
    marketingGoals: [],
    competitors: '',
    targetKeywords: [],
    competitorKeywords: [],
    gtmPlaybook: null,
    productType: null,
    complianceFlags: '',
    contactEmail: '',
    contactPhone: '',
    linkedInUrl: '',
    twitterUrl: '',
    githubUrl: '',
  })
  
  // Array input states
  const [newProduct, setNewProduct] = useState('')
  const [newMarketingGoal, setNewMarketingGoal] = useState('')
  const [newTargetKeyword, setNewTargetKeyword] = useState('')
  const [newCompetitorKeyword, setNewCompetitorKeyword] = useState('')

  useEffect(() => {
    fetchAllContext()
  }, [])

  const fetchAllContext = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/business-context/context-variables')
      if (!response.ok) {
        if (response.status === 404) return
        throw new Error('Failed to fetch context')
      }
      
      const data = await response.json()
      
      // Load context variables
      if (data.contextVariables) {
        setFormData(prev => ({
          ...prev,
          tone: data.contextVariables.tone || '',
          valueProposition: data.contextVariables.valueProposition || '',
          productDescription: data.contextVariables.productDescription || '',
          targetCountries: data.contextVariables.targetCountries || '',
          competitors: data.contextVariables.competitors || '',
          targetIndustries: data.contextVariables.targetIndustries || '',
          complianceFlags: data.contextVariables.complianceFlags || '',
          marketingGoals: data.contextVariables.marketingGoals || [],
          companyName: data.contextVariables.companyName || '',
          companyWebsite: data.contextVariables.companyWebsite || '',
          contactEmail: data.contextVariables.contactEmail || '',
          contactPhone: data.contextVariables.contactPhone || '',
          linkedInUrl: data.contextVariables.linkedInUrl || '',
          twitterUrl: data.contextVariables.twitterUrl || '',
          githubUrl: data.contextVariables.githubUrl || '',
        }))
      }
      
      // Load business context
      if (data.businessContext) {
        setFormData(prev => ({
          ...prev,
          icp: data.businessContext.icp || '',
          products: data.businessContext.products || [],
          targetKeywords: data.businessContext.targetKeywords || [],
          competitorKeywords: data.businessContext.competitorKeywords || [],
        }))
      }
      
      // Load GTM profile
      if (data.gtmProfile) {
        setFormData(prev => ({
          ...prev,
          gtmPlaybook: (data.gtmProfile.gtmPlaybook as GTMPlaybook) || null,
          productType: (data.gtmProfile.productType as ProductType) || null,
        }))
      }
    } catch (error) {
      console.error('Error fetching context:', error)
      toast.error('Failed to load business context')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/business-context/context-variables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Context Variables
          tone: formData.tone || null,
          valueProposition: formData.valueProposition || null,
          productDescription: formData.productDescription || null,
          targetCountries: formData.targetCountries || null,
          competitors: formData.competitors || null,
          targetIndustries: formData.targetIndustries || null,
          complianceFlags: formData.complianceFlags || null,
          marketingGoals: formData.marketingGoals || null,
          // Company & Contact
          companyName: formData.companyName || null,
          companyWebsite: formData.companyWebsite || null,
          contactEmail: formData.contactEmail || null,
          contactPhone: formData.contactPhone || null,
          linkedInUrl: formData.linkedInUrl || null,
          twitterUrl: formData.twitterUrl || null,
          githubUrl: formData.githubUrl || null,
          // Business Context
          icp: formData.icp || null,
          products: formData.products || [],
          targetKeywords: formData.targetKeywords || [],
          competitorKeywords: formData.competitorKeywords || [],
          // GTM
          gtmPlaybook: formData.gtmPlaybook || null,
          productType: formData.productType || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to save')

      // Update local context storage
      await updateContext({
        tone: formData.tone,
        valueProposition: formData.valueProposition,
        productDescription: formData.productDescription,
        targetCountries: formData.targetCountries,
        competitors: formData.competitors,
        targetIndustries: formData.targetIndustries,
        complianceFlags: formData.complianceFlags,
        marketingGoals: formData.marketingGoals,
        companyName: formData.companyName,
        companyWebsite: formData.companyWebsite,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        linkedInUrl: formData.linkedInUrl,
        twitterUrl: formData.twitterUrl,
        githubUrl: formData.githubUrl,
        gtmPlaybook: formData.gtmPlaybook || undefined,
        productType: formData.productType || undefined,
      })

      toast.success('Business context saved')
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Failed to save business context')
    } finally {
      setIsSaving(false)
    }
  }

  // Array helpers
  const addItem = (field: 'products' | 'marketingGoals' | 'targetKeywords' | 'competitorKeywords', value: string) => {
    if (!value.trim()) return
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), value.trim()],
    }))
  }

  const removeItem = (field: 'products' | 'marketingGoals' | 'targetKeywords' | 'competitorKeywords', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index),
    }))
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-secondary/50 rounded animate-pulse" />
        <div className="h-32 bg-secondary/50 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold mb-1">Business Context</h2>
        <p className="text-xs text-muted-foreground">
          Configure your business context to help agents generate better, personalized content
        </p>
      </div>

      {/* Cluster 1: Core Business Info */}
      <CollapsibleSection
        title="Core Business Info"
        defaultOpen={true}
      >
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-xs">Company Name</Label>
              <Input
                id="companyName"
                placeholder="e.g., SCAILE"
                value={formData.companyName || ''}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyWebsite" className="text-xs">Company Website</Label>
              <Input
                id="companyWebsite"
                placeholder="https://example.com"
                value={formData.companyWebsite || ''}
                onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone" className="text-xs">Tone</Label>
            <Input
              id="tone"
              placeholder="e.g., Professional, Friendly, Technical"
              value={formData.tone || ''}
              onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valueProposition" className="text-xs">Value Proposition</Label>
            <Textarea
              id="valueProposition"
              placeholder="What makes your company/product unique and valuable?"
              value={formData.valueProposition || ''}
              onChange={(e) => setFormData({ ...formData, valueProposition: e.target.value })}
              className="min-h-[80px] text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productDescription" className="text-xs">Product Description</Label>
            <Textarea
              id="productDescription"
              placeholder="Brief description of your product or service"
              value={formData.productDescription || ''}
              onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
              className="min-h-[80px] text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Products</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add product name"
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem('products', newProduct)
                    setNewProduct('')
                  }
                }}
                className="text-xs"
              />
              <Button type="button" size="sm" onClick={() => { addItem('products', newProduct); setNewProduct('') }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {formData.products && formData.products.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.products.map((item, index) => (
                  <div key={index} className="flex items-center gap-1 px-2 py-1 bg-secondary/40 border border-border rounded text-xs">
                    {item}
                    <button type="button" onClick={() => removeItem('products', index)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Cluster 2: Target Audience */}
      <CollapsibleSection
        title="Target Audience"
        defaultOpen={true}
      >
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="icp" className="text-xs">Ideal Customer Profile (ICP)</Label>
            <Textarea
              id="icp"
              placeholder="Describe your ideal customer: industry, company size, pain points, etc."
              value={formData.icp || ''}
              onChange={(e) => setFormData({ ...formData, icp: e.target.value })}
              className="min-h-[100px] text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetCountries" className="text-xs">Target Countries</Label>
              <Input
                id="targetCountries"
                placeholder="e.g., US, UK, Canada"
                value={formData.targetCountries || ''}
                onChange={(e) => setFormData({ ...formData, targetCountries: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetIndustries" className="text-xs">Target Industries</Label>
              <Input
                id="targetIndustries"
                placeholder="e.g., SaaS, Technology, Healthcare"
                value={formData.targetIndustries || ''}
                onChange={(e) => setFormData({ ...formData, targetIndustries: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Marketing Goals</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Generate qualified leads"
                value={newMarketingGoal}
                onChange={(e) => setNewMarketingGoal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem('marketingGoals', newMarketingGoal)
                    setNewMarketingGoal('')
                  }
                }}
                className="text-xs"
              />
              <Button type="button" size="sm" onClick={() => { addItem('marketingGoals', newMarketingGoal); setNewMarketingGoal('') }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {formData.marketingGoals && formData.marketingGoals.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.marketingGoals.map((item, index) => (
                  <div key={index} className="flex items-center gap-1 px-2 py-1 bg-secondary/40 border border-border rounded text-xs">
                    {item}
                    <button type="button" onClick={() => removeItem('marketingGoals', index)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Cluster 3: Competitive Intelligence */}
      <CollapsibleSection
        title="Competitive Intelligence"
        defaultOpen={false}
      >
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="competitors" className="text-xs">Competitors</Label>
            <Input
              id="competitors"
              placeholder="e.g., Salesforce, HubSpot"
              value={formData.competitors || ''}
              onChange={(e) => setFormData({ ...formData, competitors: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Target Keywords</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add target keyword"
                value={newTargetKeyword}
                onChange={(e) => setNewTargetKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem('targetKeywords', newTargetKeyword)
                    setNewTargetKeyword('')
                  }
                }}
                className="text-xs"
              />
              <Button type="button" size="sm" onClick={() => { addItem('targetKeywords', newTargetKeyword); setNewTargetKeyword('') }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {formData.targetKeywords && formData.targetKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.targetKeywords.map((item, index) => (
                  <div key={index} className="flex items-center gap-1 px-2 py-1 bg-secondary/40 border border-border rounded text-xs">
                    {item}
                    <button type="button" onClick={() => removeItem('targetKeywords', index)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Competitor Keywords</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add competitor keyword to track"
                value={newCompetitorKeyword}
                onChange={(e) => setNewCompetitorKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem('competitorKeywords', newCompetitorKeyword)
                    setNewCompetitorKeyword('')
                  }
                }}
                className="text-xs"
              />
              <Button type="button" size="sm" onClick={() => { addItem('competitorKeywords', newCompetitorKeyword); setNewCompetitorKeyword('') }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {formData.competitorKeywords && formData.competitorKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.competitorKeywords.map((item, index) => (
                  <div key={index} className="flex items-center gap-1 px-2 py-1 bg-secondary/40 border border-border rounded text-xs">
                    {item}
                    <button type="button" onClick={() => removeItem('competitorKeywords', index)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Cluster 4: GTM Classification */}
      <CollapsibleSection
        title="GTM Classification"
        defaultOpen={false}
      >
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gtmPlaybook" className="text-xs">GTM Playbook</Label>
              <Select
                value={formData.gtmPlaybook || ''}
                onValueChange={(value) => setFormData({ ...formData, gtmPlaybook: value as GTMPlaybook || null })}
              >
                <SelectTrigger id="gtmPlaybook" className="text-xs">
                  <SelectValue placeholder="Select GTM Playbook" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {Object.values(GTM_PLAYBOOKS).map((playbook) => (
                    <SelectItem key={playbook.id} value={playbook.id}>
                      {playbook.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="productType" className="text-xs">Product Type</Label>
              <Select
                value={formData.productType || ''}
                onValueChange={(value) => setFormData({ ...formData, productType: value as ProductType || null })}
              >
                <SelectTrigger id="productType" className="text-xs">
                  <SelectValue placeholder="Select Product Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {Object.values(PRODUCT_TYPES).map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Cluster 5: Compliance & Legal */}
      <CollapsibleSection
        title="Compliance & Legal"
        defaultOpen={false}
      >
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="complianceFlags" className="text-xs">Compliance Flags</Label>
            <Input
              id="complianceFlags"
              placeholder="e.g., SOC2, GDPR, HIPAA"
              value={formData.complianceFlags || ''}
              onChange={(e) => setFormData({ ...formData, complianceFlags: e.target.value })}
              className="text-xs"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legalEntity" className="text-xs">Legal Entity</Label>
              <Input
                id="legalEntity"
                placeholder="e.g., Company Name GmbH"
                value={formData.legalEntity || ''}
                onChange={(e) => setFormData({ ...formData, legalEntity: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatNumber" className="text-xs">VAT Number</Label>
              <Input
                id="vatNumber"
                placeholder="e.g., DE123456789"
                value={formData.vatNumber || ''}
                onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationNumber" className="text-xs">Registration Number</Label>
              <Input
                id="registrationNumber"
                placeholder="e.g., HRB 12345"
                value={formData.registrationNumber || ''}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Cluster 6: Social & Contact */}
      <CollapsibleSection
        title="Social & Contact"
        defaultOpen={false}
      >
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="text-xs flex items-center gap-1">
                <Mail className="h-3 w-3" /> Contact Email
              </Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="info@example.com"
                value={formData.contactEmail || ''}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone" className="text-xs flex items-center gap-1">
                <Phone className="h-3 w-3" /> Contact Phone
              </Label>
              <Input
                id="contactPhone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={formData.contactPhone || ''}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedInUrl" className="text-xs flex items-center gap-1">
                <Linkedin className="h-3 w-3" /> LinkedIn URL
              </Label>
              <Input
                id="linkedInUrl"
                type="url"
                placeholder="https://linkedin.com/company/..."
                value={formData.linkedInUrl || ''}
                onChange={(e) => setFormData({ ...formData, linkedInUrl: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitterUrl" className="text-xs flex items-center gap-1">
                <Twitter className="h-3 w-3" /> Twitter URL
              </Label>
              <Input
                id="twitterUrl"
                type="url"
                placeholder="https://twitter.com/..."
                value={formData.twitterUrl || ''}
                onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="githubUrl" className="text-xs flex items-center gap-1">
                <Github className="h-3 w-3" /> GitHub URL
              </Label>
              <Input
                id="githubUrl"
                type="url"
                placeholder="https://github.com/..."
                value={formData.githubUrl || ''}
                onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          <Save className="h-3.5 w-3.5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Business Context'}
        </Button>
      </div>
    </div>
  )
}

