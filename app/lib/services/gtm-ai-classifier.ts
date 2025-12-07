/**
 * GTM AI Classifier Service
 * Calls Google Gemini directly (integrated into business context flow)
 */

import { createHash } from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GTMAIClassification } from '@/lib/types/business-context';
import { validateClassification } from '@/lib/validation/gtm-validation';

// In-memory cache
const cache = new Map<string, { result: GTMAIClassification; timestamp: number }>();
const CACHE_TTL = 3600 * 1000; // 1 hour

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

/**
 * Create cache key from business context
 */
function createCacheKey(icp: string, products: string[], countries: string[]): string {
  const normalized = {
    icp: (icp || '').toLowerCase().trim(),
    products: (products || []).sort().join(','),
    countries: (countries || []).sort().join(',')
  };
  
  const keyString = `${normalized.icp}|${normalized.products}|${normalized.countries}`;
  return createHash('sha256').update(keyString).digest('hex');
}

/**
 * Check rate limit for user
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];
  
  // Remove old requests outside the window
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false; // Rate limit exceeded
  }
  
  // Add current request
  recentRequests.push(now);
  rateLimitMap.set(userId, recentRequests);
  
  return true; // Within rate limit
}

/**
 * Get cached classification if available
 */
function getCachedClassification(cacheKey: string): GTMAIClassification | null {
  const cached = cache.get(cacheKey);
  
  if (!cached) {
    return null;
  }
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    cache.delete(cacheKey);
    return null;
  }
  
  return cached.result;
}

/**
 * Cache classification result
 */
function cacheClassification(cacheKey: string, result: GTMAIClassification): void {
  cache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
}

/**
 * Classify GTM strategy using Google Gemini directly
 * Integrated into business context flow (no separate Modal function needed)
 */
export async function classifyGTMWithAI(
  icp: string,
  products: string[],
  countries: string[],
  userId?: string
): Promise<GTMAIClassification> {
  if (userId && !checkRateLimit(userId)) {
    throw new Error('Rate limit exceeded');
  }
  
  const cacheKey = createCacheKey(icp, products, countries);
  const cached = getCachedClassification(cacheKey);
  if (cached) return cached;
  
  // Get API key from environment (check multiple possible names)
  const apiKey = process.env.GEMINI_API_KEY || 
                 process.env.GOOGLE_AI_API_KEY || 
                 process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY, GOOGLE_AI_API_KEY, or NEXT_PUBLIC_GOOGLE_API_KEY not configured');
    return {
      gtm_playbook: { value: null, confidence: 0, reasoning: 'API key not configured' },
      product_type: { value: null, confidence: 0, reasoning: 'API key not configured' }
    };
  }

  try {
    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // Build prompt
    const prompt = `You are a GTM (Go-To-Market) strategy expert. Analyze this business and classify their GTM motion and product type.

Business Context:
- Ideal Customer Profile (ICP): ${icp || 'Not provided'}
- Products: ${products?.length ? products.join(', ') : 'Not provided'}
- Target Countries: ${countries?.length ? countries.join(', ') : 'Not provided'}

GTM Playbook Options:
1. sales_led - Sales team drives acquisition, high-touch sales process
2. plg - Product-Led Growth, self-service signup and onboarding
3. hybrid - Mix of sales-led and PLG approaches
4. channel_led - Partner/reseller channel drives distribution
5. enterprise_infra - Enterprise infrastructure, complex sales cycles

Product Type Options:
- devtools - Developer tools and infrastructure
- sales_marketing - Sales and marketing software
- fintech - Financial technology products
- hr - Human resources and people management
- cx - Customer experience and support tools
- security - Security and compliance products
- other - Other product categories

Analyze the business and return a JSON response with:
1. gtm_playbook: The most likely GTM motion (value, confidence 0.0-1.0, reasoning)
2. product_type: The product category (value, confidence 0.0-1.0, reasoning)

Be specific in your reasoning. Confidence should reflect how certain you are based on the provided information.

Return ONLY valid JSON in this exact format:
{
    "gtm_playbook": {
        "value": "sales_led",
        "confidence": 0.85,
        "reasoning": "Clear explanation of why this playbook fits"
    },
    "product_type": {
        "value": "devtools",
        "confidence": 0.90,
        "reasoning": "Clear explanation of why this product type fits"
    }
}`;

    // Call Gemini with structured output
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    });

    const responseText = result.response.text();
    let parsed: Record<string, unknown>;
    
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      // Handle markdown code blocks if present
      let cleaned = responseText.trim();
      if (cleaned.includes('```json')) {
        cleaned = cleaned.split('```json')[1].split('```')[0].trim();
      } else if (cleaned.includes('```')) {
        cleaned = cleaned.split('```')[1].split('```')[0].trim();
      }
      parsed = JSON.parse(cleaned);
    }

    const classification = validateClassification(parsed);
    cacheClassification(cacheKey, classification);
    return classification;
  } catch (error) {
    console.error('Error classifying GTM:', error);
    return {
      gtm_playbook: { value: null, confidence: 0, reasoning: `Unable to classify: ${error instanceof Error ? error.message : 'Unknown error'}` },
      product_type: { value: null, confidence: 0, reasoning: `Unable to classify: ${error instanceof Error ? error.message : 'Unknown error'}` }
    };
  }
}

/**
 * Clear cache for a specific key (useful for testing or forced refresh)
 */
export function clearCache(cacheKey?: string): void {
  if (cacheKey) {
    cache.delete(cacheKey);
  } else {
    cache.clear();
  }
}

/**
 * Get cache stats (for monitoring)
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

