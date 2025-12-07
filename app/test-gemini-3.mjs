import { GoogleGenerativeAI } from '@google/generative-ai';

const testUrl = 'https://scaile.tech';

// Schema for structured output
const schema = {
  type: 'object',
  properties: {
    company_name: { type: 'string', description: 'Official company name' },
    company_url: { type: 'string', description: 'Company website URL' },
    industry: { type: 'string', description: 'Primary industry (e.g., SaaS, Marketing, AI)' },
    description: { type: 'string', description: 'Clear 2-3 sentence description' },
    products: { 
      type: 'array', 
      items: { type: 'string' },
      description: 'Main products/services'
    },
    target_audience: { type: 'string', description: 'Ideal customer profile' },
    competitors: { 
      type: 'array', 
      items: { type: 'string' },
      description: 'Main competitors'
    },
    tone: { type: 'string', description: 'Brand voice (e.g., professional, friendly, technical)' },
    pain_points: {
      type: 'array',
      items: { type: 'string' },
      description: 'Key customer problems/challenges they solve'
    },
    value_propositions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Unique benefits and differentiators'
    },
    use_cases: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific scenarios or applications'
    },
    content_themes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Topics/themes they want to be known for'
    }
  },
  required: ['company_name', 'company_url', 'industry', 'description']
};

async function testGemini3() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('🧪 Testing Gemini 3.0 Pro Preview with Google Search + Structured Output\n');
  console.log(`📍 Analyzing: ${testUrl}\n`);

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    tools: [
      {
        urlContext: {}
      },
      {
        googleSearch: {}
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.2
    }
  });

  const prompt = `Analyze the company at ${testUrl} comprehensively.

STEP 1: Visit and read the website at ${testUrl}
- Use URL context to access and understand the actual website content
- Extract information about their products, services, messaging, and brand tone

STEP 2: Use Google Search to find:
- Main direct competitors in their exact space
- Industry positioning and market context
- Additional validation of their offerings

STEP 3: Synthesize into structured output
Provide complete, accurate information for all fields based on BOTH the website content AND search results.`;

  try {
    const startTime = Date.now();
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('✅ Analysis complete!\n');
    console.log(`⏱️  Duration: ${duration}s\n`);
    console.log('📊 Results:\n');
    console.log(JSON.stringify(JSON.parse(text), null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('not found') || error.message.includes('supported')) {
      console.error('\n💡 Model might not be available yet. Available models:');
      console.error('   - gemini-2.0-flash-exp');
      console.error('   - gemini-2.0-flash-thinking-exp-01-21');
      console.error('   - gemini-1.5-pro');
      console.error('   - gemini-1.5-flash');
    }
    process.exit(1);
  }
}

testGemini3();

