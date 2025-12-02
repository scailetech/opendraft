// ABOUTME: Centralized blog post metadata - single source of truth for all blog content
// ABOUTME: Provides type-safe blog post data, metadata generation, and schema markup

import { Metadata } from "next";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  keywords: string[];
  author: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "complete-guide-ai-thesis-writing",
    title: "Complete Guide to AI-Assisted Thesis Writing in 2025",
    description: "Learn how to write a master's thesis or PhD dissertation 10x faster using AI. Step-by-step guide with 19 specialized agents, real examples, and best practices.",
    date: "2025-11-03",
    readTime: "15 min read",
    category: "Guide",
    keywords: [
      "AI thesis writing",
      "thesis writing with AI",
      "AI academic writing",
      "how to write thesis with AI",
      "AI dissertation writing",
      "academic AI tools",
      "thesis AI assistant"
    ],
    author: "Federico De Ponte",
  },
  {
    slug: "chatgpt-thesis-writing-tutorial",
    title: "How to Use ChatGPT for Thesis Writing: Complete Tutorial 2025",
    description: "Step-by-step tutorial on using ChatGPT for academic thesis writing. Learn effective prompts, best practices, limitations, and how to maintain academic integrity while using AI assistance.",
    date: "2025-11-03",
    readTime: "12 min read",
    category: "Tutorial",
    keywords: [
      "ChatGPT thesis writing",
      "ChatGPT for academic writing",
      "how to use ChatGPT for dissertation",
      "ChatGPT prompts for research",
      "AI writing assistant thesis",
      "ChatGPT academic integrity"
    ],
    author: "Federico De Ponte",
  },
  {
    slug: "ai-tools-academic-research",
    title: "AI Tools for Academic Research: 15 Best Tools for Literature Review in 2025",
    description: "Comprehensive guide to the best AI tools for academic research and literature review. Compare features, pricing, and effectiveness of 15 leading tools including free options for students.",
    date: "2025-11-03",
    readTime: "14 min read",
    category: "Tools",
    keywords: [
      "AI tools for academic research",
      "AI literature review tools",
      "academic research AI",
      "best AI for research papers",
      "AI research assistant",
      "literature review automation"
    ],
    author: "Federico De Ponte",
  },
  {
    slug: "how-to-cite-ai-generated-content",
    title: "How to Cite AI-Generated Content: Complete Guide (APA, MLA, Chicago) 2025",
    description: "Learn how to properly cite ChatGPT, AI-generated text, and AI tools in academic papers. Includes citation formats for APA 7th, MLA 9th, Chicago 17th with real examples and ethical guidelines.",
    date: "2025-11-03",
    readTime: "10 min read",
    category: "Guide",
    keywords: [
      "how to cite AI content",
      "cite ChatGPT APA",
      "cite AI-generated text",
      "AI citation format",
      "how to cite AI in research",
      "ChatGPT citation MLA"
    ],
    author: "Federico De Ponte",
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function generateBlogPostMetadata(post: BlogPost): Metadata {
  return {
    title: `${post.title} | Write 10x Faster`,
    description: post.description,
    keywords: post.keywords,
  };
}

export function generateBlogPostSchema(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "author": {
      "@type": "Person",
      "name": post.author,
    },
    "datePublished": post.date,
    "publisher": {
      "@type": "Organization",
      "name": "OpenDraft",
    },
  };
}
