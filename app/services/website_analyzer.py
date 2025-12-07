"""Website analyzer service - standalone version (no Modal, no v2 dependencies).

Analyzes company websites with configurable modes using Gemini AI.
Supports business_context, seo, competitor, company_intelligence, full, and custom analysis modes.
"""

import json
import logging
import os
from typing import Any, Dict, List, Literal, Optional
from urllib.parse import urlparse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Analysis mode definitions
ANALYSIS_MODES = {
    "business_context": {
        "name": "Business Context",
        "description": "Extract business context variables for GTM and content generation",
        "fields": [
            "tone", "targetCountries", "productDescription", "competitors",
            "targetIndustries", "complianceFlags", "valueProposition", "icp",
            "marketingGoals", "countries", "products", "targetKeywords", "competitorKeywords",
            "gtmPlaybook", "productType", 
            "companyName", "companyWebsite", "legalEntity", "companyAddress",
            "imprintUrl", "vatNumber", "registrationNumber",
            "contactEmail", "contactPhone", "linkedInUrl", "twitterUrl", "githubUrl"
        ]
    },
    "seo": {
        "name": "SEO Analysis",
        "description": "Extract SEO-related information: keywords, meta tags, content structure",
        "fields": [
            "metaTitle", "metaDescription", "primaryKeywords", "secondaryKeywords",
            "contentStructure", "headings", "internalLinks", "externalLinks"
        ]
    },
    "competitor": {
        "name": "Competitor Analysis",
        "description": "Focus on competitor information and positioning",
        "fields": [
            "competitors", "competitorKeywords", "marketPosition", "differentiators",
            "pricingModel", "targetAudience", "valueProposition"
        ]
    },
    "full": {
        "name": "Full Analysis",
        "description": "Comprehensive analysis including all available fields",
        "fields": "all"
    },
    "company_intelligence": {
        "name": "Company Intelligence",
        "description": "Extract comprehensive company data: imprint, team, contact info, legal details",
        "fields": [
            "companyName", "legalName", "foundedYear", "headquarters", "locations",
            "teamSize", "teamMembers", "founders", "executives", "contactEmail",
            "contactPhone", "address", "imprint", "legalEntity", "vatNumber",
            "registrationNumber", "socialMedia", "linkedin", "twitter", "github",
            "crunchbase", "funding", "investors", "companyType", "industry",
            "description", "mission", "values", "culture", "careersPage"
        ]
    },
    "custom": {
        "name": "Custom Analysis",
        "description": "Extract only specified custom fields",
        "fields": []
    }
}

# System prompts for different modes
BUSINESS_CONTEXT_PROMPT = """You are an expert at analyzing company websites and extracting business context.

Given a website's HTML content, extract the following information:

**Context Variables (Extract from website content):**
1. **Tone**: The communication style/tone used on the website (e.g., "Professional", "Friendly", "Technical", "Casual", "Formal")
2. **Target Countries**: Countries or regions the company targets (comma-separated string, e.g., "US, UK, Canada")
3. **Product Description**: A brief description of the main product or service (2-3 sentences max)
4. **Competitors**: Any competitors mentioned or implied (comma-separated string, e.g., "Salesforce, HubSpot")
5. **Target Industries**: Industries or sectors the company targets (comma-separated string, e.g., "SaaS, Technology, Sales")
6. **Compliance Flags**: Any compliance certifications or standards mentioned (comma-separated string, e.g., "SOC2, GDPR")
7. **Value Proposition**: The main value proposition statement (what makes the company/product unique and valuable)

**Business Context (Extract from website content):**
8. **ICP (Ideal Customer Profile)**: Describe the ideal customer based on website content - company size, industry, pain points, etc. (2-3 sentences)
9. **Marketing Goals**: Array of marketing objectives/goals mentioned on the website (e.g., ["Generate qualified leads", "Increase brand awareness", "Drive customer acquisition", "Improve conversion rates"])
10. **Countries**: Array of specific countries/regions mentioned (e.g., ["United States", "United Kingdom", "Canada"])
11. **Products**: Array of product names or service offerings mentioned (e.g., ["CRM", "Marketing Automation", "Sales Analytics"])
12. **Target Keywords**: Array of key terms/phrases the company seems to target (e.g., ["crm software", "sales automation", "lead management"])
13. **Competitor Keywords**: Array of competitor names or brands mentioned (e.g., ["Salesforce", "HubSpot", "Pipedrive"])

**GTM Classification (Classify based on website content, ICP, products, and business model):**
14. **GTM Playbook**: Classify the go-to-market motion. Must be one of: "sales_led", "plg", "hybrid", "channel_led", "enterprise_infra"
   - sales_led: Sales team drives acquisition, high-touch sales process
   - plg: Product-Led Growth, self-service signup and onboarding
   - hybrid: Mix of sales-led and PLG approaches
   - channel_led: Partner/reseller channel drives distribution
   - enterprise_infra: Enterprise infrastructure, complex sales cycles
   Return as object: {"value": "sales_led", "confidence": 0.85, "reasoning": "explanation"}

15. **Product Type**: Classify the product category. Must be one of: "devtools", "sales_marketing", "fintech", "hr", "cx", "security", "other"
   - devtools: Developer tools and infrastructure
   - sales_marketing: Sales and marketing software
   - fintech: Financial technology products
   - hr: Human resources and people management
   - cx: Customer experience and support tools
   - security: Security and compliance products
   - other: Other product categories
   Return as object: {"value": "devtools", "confidence": 0.90, "reasoning": "explanation"}

**Company Information (Extract if available - useful context):**
16. **Company Name**: The main company/brand name (e.g., "SCAILE", "Acme Corp")
17. **Company Website**: Full website URL (e.g., "https://scaile.tech")
18. **Legal Entity**: Legal company name (e.g., "SCAILE Technologies GmbH", "Acme Corp Inc.")
19. **Company Address**: Physical address if mentioned (e.g., "123 Main St, City, Country")
20. **Imprint URL**: URL to imprint/legal page (e.g., "https://example.com/imprint")
21. **VAT Number**: VAT/TAX ID if mentioned (e.g., "DE123456789")
22. **Registration Number**: Company registration number if mentioned (e.g., "HRB 12345")

**Contact & Social Media (Extract if available - CRITICAL: Only return verified URLs, use null if not found):**
23. **Contact Email**: Primary contact email address (e.g., "info@example.com")
24. **Contact Phone**: Primary contact phone number (e.g., "+49 40 12345678")
25. **LinkedIn URL**: LinkedIn company page URL (MUST be exact URL found, not constructed - e.g., "https://linkedin.com/company/scaile" or null)
26. **Twitter URL**: Twitter/X company profile URL (MUST be exact URL found, not constructed - e.g., "https://twitter.com/scaile" or null)
27. **GitHub URL**: GitHub organization/profile URL (MUST be exact URL found, not constructed - e.g., "https://github.com/scaile" or null)

CRITICAL ACCURACY REQUIREMENTS - NO HALLUCINATIONS ALLOWED:
1. VERIFICATION RULE: Only return information that you can VERIFY from actual sources:
   - Website content (via URL context)
   - Google Search results (via google_search tool)
   - If you cannot verify it, return null - NEVER make up data

2. URL VERIFICATION: For all URLs (LinkedIn, GitHub, Twitter, etc.):
   - Must be exact URLs found in search results or website content
   - Must be clickable/verifiable URLs
   - Do not construct URLs based on company name patterns
   - If URL not found, return null - DO NOT guess

3. OUTPUT: Return JSON with null for unverified fields. NO HALLUCINATIONS.

Return ONLY a valid JSON object with these fields. For GTM Playbook and Product Type, include confidence (0.0-1.0) and reasoning. If a field cannot be determined, omit it or set arrays to empty arrays []. Use null for missing values."""

SEO_PROMPT = """You are an SEO expert analyzing a website. Extract the following SEO-related information:

1. **Meta Title**: The main title tag (if present)
2. **Meta Description**: The meta description tag (if present)
3. **Primary Keywords**: Main keywords the site targets (array)
4. **Secondary Keywords**: Supporting keywords (array)
5. **Content Structure**: Overview of content organization
6. **Headings**: Main headings structure (H1, H2, H3)
7. **Internal Links**: Key internal linking patterns
8. **External Links**: Notable external links mentioned

Return ONLY a valid JSON object with these fields."""

COMPETITOR_PROMPT = """You are a competitive intelligence expert. Analyze the website and extract competitor information:

1. **Competitors**: Competitors mentioned or implied (comma-separated string)
2. **Competitor Keywords**: Competitor brand names mentioned (array)
3. **Market Position**: How the company positions itself in the market
4. **Differentiators**: Key differentiators mentioned
5. **Pricing Model**: Pricing information or model mentioned
6. **Target Audience**: Target audience description
7. **Value Proposition**: Main value proposition statement

Return ONLY a valid JSON object with these fields."""

COMPANY_INTELLIGENCE_PROMPT = """You are an expert at extracting comprehensive company intelligence from websites.

Extract the following information:

**Company Basics:**
1. **companyName**: The company's trading/brand name
2. **legalName**: Full legal entity name (if different from brand name)
3. **foundedYear**: Year the company was founded (if mentioned)
4. **headquarters**: Main headquarters location (city, country)
5. **locations**: Array of all office locations mentioned (e.g., ["San Francisco, USA", "London, UK"])
6. **companyType**: Type of company (e.g., "Private", "Public", "Startup", "Enterprise")
7. **industry**: Primary industry or sector

**Team Information:**
8. **teamSize**: Approximate team size (if mentioned, e.g., "50-100", "100+")
9. **teamMembers**: Array of team member names and roles found on "About", "Team", or "People" pages (e.g., [{"name": "John Doe", "role": "CEO"}, {"name": "Jane Smith", "role": "CTO"}])
10. **founders**: Array of founder names (e.g., ["John Doe", "Jane Smith"])
11. **executives**: Array of executive/C-suite members (e.g., [{"name": "John Doe", "title": "CEO"}])

**Contact & Legal:**
12. **contactEmail**: Main contact email address
13. **contactPhone**: Main contact phone number
14. **address**: Physical address (street, city, country)
15. **imprint**: Legal imprint information (common in EU websites - includes legal entity, address, registration details)
16. **legalEntity**: Legal entity type and structure (e.g., "GmbH", "Inc.", "Ltd.", "LLC")
17. **vatNumber**: VAT/TAX ID number (if mentioned)
18. **registrationNumber**: Company registration number (if mentioned)

**Social Media & Online Presence:**
19. **socialMedia**: Object with social media links (e.g., {"linkedin": "url", "twitter": "url", "facebook": "url", "instagram": "url"})
20. **linkedin**: LinkedIn company page URL
21. **twitter**: Twitter/X handle or URL
22. **github**: GitHub organization URL (if applicable)
23. **crunchbase**: Crunchbase profile URL (if mentioned)

**Company Details:**
24. **funding**: Funding information if mentioned (e.g., "Series A, $5M", "Bootstrapped", "Seed Round")
25. **investors**: Array of investor names or firms (if mentioned)
26. **description**: Company description/overview (2-3 sentences)
27. **mission**: Company mission statement (if present)
28. **values**: Company values or principles (array)
29. **culture**: Company culture description (if mentioned)
30. **careersPage**: URL to careers/jobs page (if present)

Return ONLY a valid JSON object with these fields. If a field cannot be determined, omit it or set arrays to empty arrays []."""

FULL_PROMPT = """You are a comprehensive business analyst. Extract ALL available information from the website:

**Business Context:**
- Tone, Target Countries, Product Description, Competitors, Target Industries, Compliance Flags
- ICP, Countries, Products, Target Keywords, Competitor Keywords

**SEO Information:**
- Meta Title, Meta Description, Primary Keywords, Secondary Keywords, Content Structure, Headings

**Competitive Intelligence:**
- Market Position, Differentiators, Pricing Model, Target Audience, Value Proposition

**Company Intelligence:**
- Company Name, Legal Name, Founded Year, Headquarters, Locations, Company Type, Industry
- Team Size, Team Members, Founders, Executives
- Contact Email, Contact Phone, Address, Imprint, Legal Entity, VAT Number, Registration Number
- Social Media Links (LinkedIn, Twitter, GitHub, Crunchbase), Funding, Investors
- Description, Mission, Values, Culture, Careers Page

Return ONLY a valid JSON object with all available fields."""


def _get_prompt_for_mode(mode: str, custom_fields: Optional[List[str]] = None) -> str:
    """Get the appropriate system prompt based on analysis mode."""
    if mode == "business_context":
        return BUSINESS_CONTEXT_PROMPT
    elif mode == "seo":
        return SEO_PROMPT
    elif mode == "competitor":
        return COMPETITOR_PROMPT
    elif mode == "company_intelligence":
        return COMPANY_INTELLIGENCE_PROMPT
    elif mode == "full":
        return FULL_PROMPT
    elif mode == "custom":
        if not custom_fields:
            return BUSINESS_CONTEXT_PROMPT
        fields_desc = ", ".join([f"**{field}**" for field in custom_fields])
        return f"""You are an expert at analyzing company websites. Extract the following custom fields:

{fields_desc}

Return ONLY a valid JSON object with these fields. If a field cannot be determined, omit it or set arrays to empty arrays []."""
    else:
        return BUSINESS_CONTEXT_PROMPT


def _get_fields_for_mode(mode: str, custom_fields: Optional[List[str]] = None) -> List[str]:
    """Get the list of fields to extract based on analysis mode."""
    if mode == "business_context":
        return ANALYSIS_MODES["business_context"]["fields"]
    elif mode == "seo":
        return ANALYSIS_MODES["seo"]["fields"]
    elif mode == "competitor":
        return ANALYSIS_MODES["competitor"]["fields"]
    elif mode == "company_intelligence":
        return ANALYSIS_MODES["company_intelligence"]["fields"]
    elif mode == "full":
        return "all"
    elif mode == "custom":
        return custom_fields or []
    else:
        return ANALYSIS_MODES["business_context"]["fields"]


def _clean_response(parsed: Dict[str, Any], expected_fields: List[str]) -> Dict[str, Any]:
    """Clean and validate response based on expected fields.
    
    Maps extracted fields to UI form field names and handles nested structures.
    Handles both camelCase (from code) and Title Case (from Gemini) field names.
    """
    result = {}
    
    # Reverse mapping: UI form name -> extracted name (for lookup)
    # Also handle variations Gemini might return
    field_lookup = {
        # Core fields - handle both camelCase and Title Case
        "tone": "Tone",
        "Tone": "Tone",
        "targetCountries": "Target Countries",
        "Target Countries": "Target Countries",
        "productDescription": "Product Description",
        "Product Description": "Product Description",
        "competitors": "Competitors",
        "Competitors": "Competitors",
        "targetIndustries": "Target Industries",
        "Target Industries": "Target Industries",
        "complianceFlags": "Compliance Flags",
        "Compliance Flags": "Compliance Flags",
        "valueProposition": "Value Proposition",
        "Value Proposition": "Value Proposition",
        "icp": "ICP",
        "ICP": "ICP",
        "ICP (Ideal Customer Profile)": "ICP",  # Handle Gemini's full name
        "marketingGoals": "Marketing Goals",
        "Marketing Goals": "Marketing Goals",
        "countries": "Countries",
        "Countries": "Countries",
        "products": "Products",
        "Products": "Products",
        "targetKeywords": "Target Keywords",
        "Target Keywords": "Target Keywords",
        "competitorKeywords": "Competitor Keywords",
        "Competitor Keywords": "Competitor Keywords",
        "gtmPlaybook": "GTM Playbook",
        "GTM Playbook": "GTM Playbook",
        "productType": "Product Type",
        "Product Type": "Product Type",
        "companyName": "Company Name",
        "Company Name": "Company Name",
        "companyWebsite": "Company Website",
        "Company Website": "Company Website",
        "legalEntity": "Legal Entity",
        "Legal Entity": "Legal Entity",
        "companyAddress": "Company Address",
        "Company Address": "Company Address",
        "imprintUrl": "Imprint URL",
        "Imprint URL": "Imprint URL",
        "vatNumber": "VAT Number",
        "VAT Number": "VAT Number",
        "registrationNumber": "Registration Number",
        "Registration Number": "Registration Number",
        "contactEmail": "Contact Email",
        "Contact Email": "Contact Email",
        "contactPhone": "Contact Phone",
        "Contact Phone": "Contact Phone",
        "linkedInUrl": "LinkedIn URL",
        "LinkedIn URL": "LinkedIn URL",
        "twitterUrl": "Twitter URL",
        "Twitter URL": "Twitter URL",
        "githubUrl": "GitHub URL",
        "GitHub URL": "GitHub URL",
    }
    
    def clean_value(value: Any) -> Any:
        """Clean a single value."""
        if isinstance(value, str) and value.strip():
            cleaned = value.strip()
            # Handle "None" or "null" strings
            if cleaned.lower() in ("none", "null", "n/a", "not found"):
                return None
            return cleaned
        elif isinstance(value, list):
            cleaned = [item.strip() if isinstance(item, str) else item for item in value if item]
            return cleaned if cleaned else None
        elif isinstance(value, dict):
            # Handle nested structures (e.g., gtmPlaybook, productType)
            cleaned = {}
            for k, v in value.items():
                if v is not None:
                    cleaned[k] = clean_value(v)
            return cleaned if cleaned else None
        elif value is not None:
            return value
        return None
    
    # Create reverse lookup: camelCase -> Title Case
    camel_to_title = {
        "tone": "Tone",
        "targetCountries": "Target Countries",
        "productDescription": "Product Description",
        "competitors": "Competitors",
        "targetIndustries": "Target Industries",
        "complianceFlags": "Compliance Flags",
        "valueProposition": "Value Proposition",
        "icp": "ICP",
        "marketingGoals": "Marketing Goals",
        "countries": "Countries",
        "products": "Products",
        "targetKeywords": "Target Keywords",
        "competitorKeywords": "Competitor Keywords",
        "gtmPlaybook": "GTM Playbook",
        "productType": "Product Type",
        "companyName": "Company Name",
        "companyWebsite": "Company Website",
        "legalEntity": "Legal Entity",
        "companyAddress": "Company Address",
        "imprintUrl": "Imprint URL",
        "vatNumber": "VAT Number",
        "registrationNumber": "Registration Number",
        "contactEmail": "Contact Email",
        "contactPhone": "Contact Phone",
        "linkedInUrl": "LinkedIn URL",
        "twitterUrl": "Twitter URL",
        "githubUrl": "GitHub URL",
    }
    
    if expected_fields == "all":
        # Full mode - return all fields found, normalize names
        for key, value in parsed.items():
            # Normalize key name (handle both Title Case from Gemini and camelCase from code)
            normalized_key = field_lookup.get(key, key)
            cleaned_val = clean_value(value)
            if cleaned_val is not None:
                result[normalized_key] = cleaned_val
    else:
        # Specific mode - return requested fields, but handle Title Case from Gemini
        # Build a set of all possible field name variations to look for
        fields_to_find = set()
        for field in expected_fields:
            fields_to_find.add(field)  # camelCase
            if field in camel_to_title:
                fields_to_find.add(camel_to_title[field])  # Title Case
            # Also try variations
            fields_to_find.add(field.title())
        
        # Now look for any of these variations in the parsed response
        for key, value in parsed.items():
            # Check if this key matches any expected field (case-insensitive matching)
            key_normalized = key.lower().replace(' ', '').replace('(', '').replace(')', '').replace('-', '')
            matched_field = None
            for field in expected_fields:
                field_normalized = field.lower().replace(' ', '')
                title_field_normalized = camel_to_title.get(field, '').lower().replace(' ', '').replace('(', '').replace(')', '').replace('-', '')
                # Direct match
                if key == field or key == camel_to_title.get(field, ''):
                    matched_field = camel_to_title.get(field, field)
                    break
                # Normalized match
                if key_normalized == field_normalized or key_normalized == title_field_normalized:
                    matched_field = camel_to_title.get(field, field)
                    break
            
            if matched_field:
                cleaned_val = clean_value(value)
                if cleaned_val is not None:
                    result[matched_field] = cleaned_val
    
    return result


async def analyze_website(
    url: str,
    mode: Literal["business_context", "seo", "competitor", "full", "company_intelligence", "custom"] = "business_context",
    custom_fields: Optional[List[str]] = None,
    use_google_search: bool = True,
    max_content_length: int = 50000,
) -> Dict[str, Any]:
    """Analyze a website URL and extract company context information.

    Standalone version - uses direct Gemini API calls (no v2 dependencies).

    Args:
        url: Website URL to analyze (e.g., "example.com" or "https://example.com")
        mode: Analysis mode (default: "business_context")
        custom_fields: List of custom field names to extract (required if mode="custom")
        use_google_search: Whether to use Google Search Grounding (default: True)
        max_content_length: Maximum characters of website content to analyze (default: 50000)

    Returns:
        Dictionary with extracted fields based on mode
    """
    # Use REST API directly (works with all API keys, no SDK needed)
    import requests
    
    # No HTML fetching needed - Gemini handles URL context directly

    # Get API key from environment
    api_key = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_AI_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY, or GOOGLE_AI_API_KEY not found in environment")

    # Validate URL
    if not url or not isinstance(url, str) or not url.strip():
        raise ValueError("URL is required and must be a non-empty string")
    
    # Normalize and validate URL format
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    
    try:
        parsed = urlparse(url)
        if not parsed.netloc:
            raise ValueError("Invalid URL format: missing domain")
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Invalid URL scheme: only http and https are allowed")
    except Exception as e:
        logger.warning(f"Invalid URL: {url}, error: {e}")
        raise ValueError(f"Invalid URL format: {str(e)}")

    # Validate mode
    valid_modes = ["business_context", "seo", "competitor", "full", "company_intelligence", "custom"]
    if mode not in valid_modes:
        raise ValueError(f"Invalid mode. Must be one of: {', '.join(valid_modes)}")

    # Validate custom_fields for custom mode
    if mode == "custom" and (not custom_fields or not isinstance(custom_fields, list) or len(custom_fields) == 0):
        raise ValueError("custom_fields parameter is required when mode='custom'")

    # Build extraction prompt
    system_prompt = _get_prompt_for_mode(mode, custom_fields)
    expected_fields = _get_fields_for_mode(mode, custom_fields)
    
    logger.info(f"Starting website analysis: url={url}, mode={mode}, use_google_search={use_google_search}")
    
    # Use Gemini API with URL context and search grounding
    logger.debug(f"Using Gemini URL context + search grounding for: {url}")
    
    try:
        # Build prompt - mention URL so Gemini can fetch it with url_context tool
        search_instruction = ""
        if use_google_search:
            search_instruction = f"""

CRITICAL ACCURACY REQUIREMENTS - NO HALLUCINATIONS ALLOWED:

1. VERIFICATION RULE: Only return information that you can VERIFY from actual sources:
   - Website content (via URL context tool)
   - Google Search results (via google_search tool)
   - DO NOT invent, guess, or infer URLs, contact details, or any information
   - If you cannot verify it, return null or "Not found" - NEVER make up data

2. URL VERIFICATION: For all URLs (LinkedIn, GitHub, Twitter, etc.):
   - MUST be exact URLs found in search results or website content
   - MUST be clickable/verifiable URLs
   - DO NOT construct URLs based on company name patterns
   - If URL not found, return null - DO NOT guess

3. SEARCH REQUIREMENTS for {url}:
   - Legal info: Search "{url} imprint" to find exact legal entity, VAT, registration
   - Contact: Search "{url} contact" to find exact email and phone (must be on website or verified source)
   - Social media: Search "{url} linkedin" or "{url} social media" - ONLY return URLs found in search results
   - Team: Search "{url} founders" or "{url} team" - ONLY return verified names and titles

4. OUTPUT RULE: 
   - If information exists and is verified → return it
   - If information does not exist or cannot be verified → return null
   - NEVER return "Not found." or "Needs investigation" - use null instead
   - NEVER make up URLs, emails, phone numbers, or any data"""
        
        extraction_prompt = f"""{system_prompt}

---

Analyze the website: {url}

{search_instruction}

Extract ONLY verified information from website content AND Google Search results. 
Return JSON with null for unverified fields. NO HALLUCINATIONS."""

        # Use REST API with URL context + search grounding (works with all SDK versions)
        import requests
        import json as json_lib
        
        # Build tools list - NOTE: These tools are not supported by Gemini API
        # url_context and google_search don't exist - need google_search_retrieval
        tools_list = []
        if use_google_search:
            tools_list.append({"google_search_retrieval": {}})
            logger.debug("Using Google Search grounding")
        # NOTE: url_context IS a valid Gemini tool - can be added with {"url_context": {}}
        
        # Note: Can't use responseMimeType with tools
        generation_config = {
            "temperature": 0,
            "maxOutputTokens": 8192,
        }
        
        payload = {
            "contents": [{
                "parts": [{"text": extraction_prompt}]
            }],
            "generationConfig": generation_config,
            "tools": tools_list
        }
        
        # Use REST API directly - Try Gemini 2.5 Flash Lite first (fastest)
        models_to_try = [
            'gemini-2.5-flash-lite',  # Primary model - fastest and cheapest
            'gemini-2.5-flash',  # Fallback
            'gemini-2.5-pro',
            'gemini-1.5-pro',
        ]
        
        response_text = None
        last_error = None
        
        for model_name in models_to_try:
            try:
                api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                response = requests.post(api_url, json=payload, timeout=90)  # Increased timeout for URL context + search
                response.raise_for_status()
                
                result = response.json()
                if 'candidates' in result and len(result['candidates']) > 0:
                    candidate = result['candidates'][0]
                    if 'content' in candidate and 'parts' in candidate['content']:
                        response_text = candidate['content']['parts'][0].get('text', '').strip()
                        
                        # Check URL context metadata
                        if 'urlContextMetadata' in candidate:
                            url_meta = candidate['urlContextMetadata']
                            logger.debug(f"URL context metadata: {url_meta}")
                        
                        # Check grounding metadata
                        if 'groundingMetadata' in candidate:
                            grounding_meta = candidate['groundingMetadata']
                            if 'webSearchQueries' in grounding_meta:
                                queries = grounding_meta['webSearchQueries']
                                if queries:
                                    logger.debug(f"Google Search queries executed: {queries}")
                        
                        logger.debug(f"Successfully used model: {model_name}")
                        break
            except requests.exceptions.HTTPError as e:
                last_error = e
                error_detail = ""
                try:
                    error_detail = e.response.text
                    logger.error(f"HTTP error for {model_name} ({e.response.status_code}): {error_detail[:500]}")
                except:
                    logger.error(f"HTTP error for {model_name} ({e.response.status_code}): {str(e)}")
                if e.response.status_code == 404:
                    continue  # Try next model
                elif e.response.status_code == 400:
                    # Bad request - might be payload issue, try next model
                    logger.warning(f"400 error for {model_name}: {error_detail[:200]}")
                    continue
                else:
                    raise  # Re-raise if not 404 or 400
            except Exception as e:
                last_error = e
                logger.error(f"Exception for {model_name}: {str(e)}", exc_info=True)
                continue
        
        if not response_text:
            error_msg = f"Failed to generate content with any Gemini model."
            if last_error:
                if isinstance(last_error, requests.exceptions.HTTPError):
                    try:
                        error_detail = last_error.response.text[:500]
                        error_msg += f" Last error ({last_error.response.status_code}): {error_detail}"
                    except:
                        error_msg += f" Last error: {str(last_error)}"
                else:
                    error_msg += f" Last error: {str(last_error)}"
            else:
                error_msg += " No error details available."
            raise ValueError(error_msg)
        
        # Clean markdown code blocks
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        elif response_text.startswith("```"):
            response_text = response_text.replace("```", "").strip()
        
        try:
            extracted_data = json.loads(response_text)
            if not isinstance(extracted_data, dict):
                logger.error(f"Invalid response type: {url}, response_type={type(extracted_data).__name__}")
                raise ValueError("Response is not a JSON object")
            logger.info(f"Gemini analysis success: {url}, fields_extracted={len(extracted_data)}")
            logger.info(f"Extracted data keys: {list(extracted_data.keys())}")
            logger.info(f"Sample extracted data: {json.dumps({k: str(v)[:100] for k, v in list(extracted_data.items())[:5]}, indent=2)}")
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {url}, error={str(e)}, response_preview={response_text[:500]}")
            logger.error(f"Full response text (first 1000 chars): {response_text[:1000]}")
            raise ValueError(f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        logger.error(f"Exception during Gemini analysis: {url}, error={str(e)}", exc_info=True)
        raise

    # Clean and validate response
    try:
        cleaned_result = _clean_response(extracted_data, expected_fields)
        
        # Add metadata
        cleaned_result["_metadata"] = {
            "mode": mode,
            "url": url,
        }
        
        logger.info(f"Website analysis success: {url}, mode={mode}, fields_returned={len(cleaned_result)}")
        return cleaned_result
    except Exception as e:
        logger.error(f"Error during response cleanup: {url}, error={str(e)}", exc_info=True)
        raise

