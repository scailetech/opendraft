/**
 * ABOUTME: Prompt template definitions and categories for bulk processing
 * ABOUTME: Centralized configuration for reuse across components
 */

import { FileEdit, Database, Sparkles, type LucideIcon } from 'lucide-react'

export interface PromptTemplate {
  id: string
  name: string
  description: string
  prompt: string
  exampleVariables: string[]
  category: 'content' | 'data' | 'analysis'
}

export interface TemplateCategory {
  id: 'all' | 'content' | 'data' | 'analysis'
  label: string
  icon: LucideIcon | null
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'write-bio',
    name: 'Professional Bio',
    description: 'Generate professional bios for team members, speakers, or clients. Requires: name, title, company, expertise',
    prompt: 'Write a professional bio (2-3 sentences) for {{name}} who works as {{title}} at {{company}}. {{name}} specializes in {{expertise}}. Keep it engaging and suitable for a conference website. If any information is missing, write the bio with available details.',
    exampleVariables: ['name', 'title', 'company', 'expertise'],
    category: 'content'
  },
  {
    id: 'summarize-content',
    name: 'Content Summarizer',
    description: 'Summarize long text into concise bullet points. Requires: text (or description)',
    prompt: 'Summarize the following text into 3-5 key bullet points. Focus on the main ideas and actionable insights:\n\n{{text}}\n\nIf the text is empty or too short, note that in your summary.',
    exampleVariables: ['text'],
    category: 'analysis'
  },
  {
    id: 'extract-data',
    name: 'Data Extractor',
    description: 'Extract structured information from unstructured text. Requires: description (or text)',
    prompt: 'Extract the following information from this text and return as JSON:\n- Company name\n- Industry\n- Location\n- Key products/services\n\nText: {{description}}\n\nIf any information is not available in the text, use null for that field.',
    exampleVariables: ['description'],
    category: 'data'
  },
  {
    id: 'lead-scoring',
    name: 'Lead Scoring',
    description: 'Score and qualify leads based on fit criteria (0-100). Requires: name, title, company, industry, company_size (or size), location, icp',
    prompt: 'Analyze this lead and provide a fit score (0-100) with reasoning:\n\nName: {{name}}\nTitle: {{title}}\nCompany: {{company}}\nIndustry: {{industry}}\nCompany Size: {{company_size}}\nLocation: {{location}}\n\nIdeal Customer Profile: {{icp}}\n\nProvide: fit score (0-100), reasoning for the score, personalized outreach angle, and 2-3 likely pain points. If any information is missing, note that in your analysis.',
    exampleVariables: ['name', 'title', 'company', 'industry', 'company_size', 'location', 'icp'],
    category: 'analysis'
  },
  {
    id: 'cold-email',
    name: 'Cold Email Outreach',
    description: 'Write personalized cold emails for B2B outreach. Requires: first_name (or name), last_name, title, company, industry, recent_news, product, pain_point',
    prompt: 'Write a personalized cold email to {{first_name}} {{last_name}}, {{title}} at {{company}} ({{industry}}). Reference their recent {{recent_news}} and explain how our {{product}} can help solve {{pain_point}}. Keep it under 150 words, professional but friendly tone. If any information is missing, adapt the message accordingly.',
    exampleVariables: ['first_name', 'last_name', 'title', 'company', 'industry', 'recent_news', 'product', 'pain_point'],
    category: 'content'
  },
  {
    id: 'linkedin-connection',
    name: 'LinkedIn Connection Request',
    description: 'Personalized LinkedIn connection request messages. Requires: name (or first_name), title, company, common_interest, mutual_connection',
    prompt: 'Write a LinkedIn connection request message for {{name}}, {{title}} at {{company}}. Mention {{common_interest}} or {{mutual_connection}}. Keep it under 300 characters, professional and authentic. If any information is missing, write a generic but professional message.',
    exampleVariables: ['name', 'title', 'company', 'common_interest', 'mutual_connection'],
    category: 'content'
  },
  {
    id: 'company-analysis',
    name: 'Company Analysis',
    description: 'Analyze companies and generate insights. Requires: company, industry, size (or company_size), location',
    prompt: 'Analyze {{company}} ({{industry}}, {{size}} employees, {{location}}) and provide:\n- Key business challenges\n- Growth indicators\n- Technology stack insights\n- Best outreach approach\n- Decision maker likely title\n\nIf any information is missing, note that in your analysis and proceed with available data.',
    exampleVariables: ['company', 'industry', 'size', 'location'],
    category: 'analysis'
  },
  {
    id: 'follow-up-email',
    name: 'Follow-up Email',
    description: 'Create follow-up emails for prospects who haven\'t responded. Requires: name, company, previous_topic, date, new_insight, relevant_content',
    prompt: 'Write a friendly follow-up email to {{name}} at {{company}}. We previously reached out about {{previous_topic}} on {{date}}. Add value by mentioning {{new_insight}} or {{relevant_content}}. Keep it brief and non-pushy. If any information is missing, adapt the message accordingly.',
    exampleVariables: ['name', 'company', 'previous_topic', 'date', 'new_insight', 'relevant_content'],
    category: 'content'
  }
]

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'all', label: 'All', icon: null },
  { id: 'content', label: 'Content', icon: FileEdit },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'analysis', label: 'Analysis', icon: Sparkles },
]
