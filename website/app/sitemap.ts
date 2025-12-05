// ABOUTME: Dynamic sitemap generation for SEO
// ABOUTME: Includes all static pages and future blog posts

import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://opendraft.xyz'

  // Static pages
  const routes = [
    '',
    '/blog',
    '/blog/complete-guide-ai-thesis-writing',
    '/blog/chatgpt-thesis-writing-tutorial',
    '/blog/ai-tools-academic-research',
    '/blog/how-to-cite-ai-generated-content',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : route.startsWith('/blog/') ? 0.9 : 0.8,
  }))

  return routes
}
