/**
 * API Route: Business Context (Unified - DRY)
 * GET /api/business-context/context-variables - Get all business context
 * PUT /api/business-context/context-variables - Update business context
 * 
 * Single unified endpoint for everything:
 * - Context Variables: tone, targetCountries, productDescription, competitors, targetIndustries, complianceFlags
 * - Business Context: icp, countries, products, target_keywords, competitor_keywords
 * - GTM Profile: gtmPlaybook, productType + AI tracking (confidence, suggestions, overrides)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateGTMPlaybook, validateProductType } from '@/lib/validation/gtm-validation';
import { classifyGTMWithAI } from '@/lib/services/gtm-ai-classifier';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: context, error } = await supabase
      .from('business_contexts')
      .select('tone, target_countries, product_description, competitors, target_industries, compliance_flags, value_proposition, marketing_goals, icp, countries, products, target_keywords, competitor_keywords, company_name, company_website, contact_email, contact_phone, linkedin_url, twitter_url, github_url, gtm_playbook, product_type, gtm_playbook_ai_suggested, product_type_ai_suggested, gtm_playbook_confidence, product_type_confidence, gtm_playbook_manually_overridden, product_type_manually_overridden, gtm_playbook_ai_suggestion, product_type_ai_suggestion')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No business context yet
        return NextResponse.json({ 
          contextVariables: {},
          businessContext: {},
          gtmProfile: {}
        });
      }
      console.error('Error fetching business context:', error);
      return NextResponse.json({ error: 'Failed to fetch business context' }, { status: 500 });
    }

    // Transform database fields to frontend format
    const contextVariables = {
      tone: context?.tone || undefined,
      valueProposition: context?.value_proposition || undefined,
      targetCountries: context?.target_countries || undefined,
      productDescription: context?.product_description || undefined,
      competitors: context?.competitors || undefined,
      targetIndustries: context?.target_industries || undefined,
      complianceFlags: context?.compliance_flags || undefined,
      marketingGoals: context?.marketing_goals || undefined,
      companyName: context?.company_name || undefined,
      companyWebsite: context?.company_website || undefined,
      contactEmail: context?.contact_email || undefined,
      contactPhone: context?.contact_phone || undefined,
      linkedInUrl: context?.linkedin_url || undefined,
      twitterUrl: context?.twitter_url || undefined,
      githubUrl: context?.github_url || undefined,
    };

    const businessContext = {
      icp: context?.icp || undefined,
      countries: context?.countries || [],
      products: context?.products || [],
      targetKeywords: context?.target_keywords || [],
      competitorKeywords: context?.competitor_keywords || [],
    };

    const gtmProfile = {
      gtmPlaybook: context?.gtm_playbook || undefined,
      productType: context?.product_type || undefined,
      gtmPlaybookAISuggested: context?.gtm_playbook_ai_suggested || false,
      productTypeAISuggested: context?.product_type_ai_suggested || false,
      gtmPlaybookConfidence: context?.gtm_playbook_confidence || undefined,
      productTypeConfidence: context?.product_type_confidence || undefined,
      gtmPlaybookManuallyOverridden: context?.gtm_playbook_manually_overridden || false,
      productTypeManuallyOverridden: context?.product_type_manually_overridden || false,
      gtmPlaybookAISuggestion: context?.gtm_playbook_ai_suggestion || undefined,
      productTypeAISuggestion: context?.product_type_ai_suggestion || undefined,
    };

    return NextResponse.json({ 
      contextVariables,
      businessContext,
      gtmProfile 
    });
  } catch (error) {
    console.error('Error fetching business context:', error);
    return NextResponse.json({ error: 'Failed to fetch business context' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      // Context Variables
      tone,
      valueProposition,
      targetCountries,
      productDescription,
      competitors,
      targetIndustries,
      complianceFlags,
      marketingGoals,
      // Company & Contact
      companyName,
      companyWebsite,
      contactEmail,
      contactPhone,
      linkedInUrl,
      twitterUrl,
      githubUrl,
      // Business Context
      icp,
      countries,
      products,
      targetKeywords,
      competitorKeywords,
      // GTM Profile (basic)
      gtmPlaybook,
      productType,
      // GTM Profile (AI tracking)
      gtmPlaybookAISuggestion,
      productTypeAISuggestion,
      gtmPlaybookConfidence,
      productTypeConfidence,
      gtmPlaybookAISuggested,
      productTypeAISuggested
    } = body;

    // Get current context to detect overrides and check if we need auto-classification
    const { data: currentContext } = await supabase
      .from('business_contexts')
      .select('icp, products, countries, gtm_playbook, product_type, gtm_playbook_ai_suggestion, product_type_ai_suggestion, gtm_playbook_manually_overridden, product_type_manually_overridden, product_description, value_proposition, marketing_goals')
      .eq('user_id', user.id)
      .single();

    // Transform frontend format to database format
    const updateData: Record<string, unknown> = {};
    
    // Context Variables
    if (tone !== undefined) updateData.tone = tone || null;
    if (valueProposition !== undefined) updateData.value_proposition = valueProposition || null;
    if (targetCountries !== undefined) updateData.target_countries = targetCountries || null;
    if (productDescription !== undefined) updateData.product_description = productDescription || null;
    if (competitors !== undefined) updateData.competitors = competitors || null;
    if (targetIndustries !== undefined) updateData.target_industries = targetIndustries || null;
    if (complianceFlags !== undefined) updateData.compliance_flags = complianceFlags || null;
    if (marketingGoals !== undefined) updateData.marketing_goals = marketingGoals || null;
    
    // Company & Contact
    if (companyName !== undefined) updateData.company_name = companyName || null;
    if (companyWebsite !== undefined) updateData.company_website = companyWebsite || null;
    if (contactEmail !== undefined) updateData.contact_email = contactEmail || null;
    if (contactPhone !== undefined) updateData.contact_phone = contactPhone || null;
    if (linkedInUrl !== undefined) updateData.linkedin_url = linkedInUrl || null;
    if (twitterUrl !== undefined) updateData.twitter_url = twitterUrl || null;
    if (githubUrl !== undefined) updateData.github_url = githubUrl || null;
    
    // Business Context
    if (icp !== undefined) updateData.icp = icp || null;
    if (countries !== undefined) updateData.countries = countries || [];
    if (products !== undefined) updateData.products = products || [];
    if (targetKeywords !== undefined) updateData.target_keywords = targetKeywords || [];
    if (competitorKeywords !== undefined) updateData.competitor_keywords = competitorKeywords || [];
    
    // GTM Profile (with validation and override detection)
    if (gtmPlaybook !== undefined) {
      const validatedPlaybook = validateGTMPlaybook(gtmPlaybook);
      updateData.gtm_playbook = validatedPlaybook;
      
      // Detect if user overrode AI suggestion
      const aiSuggestion = validateGTMPlaybook(gtmPlaybookAISuggestion) || 
                          validateGTMPlaybook(currentContext?.gtm_playbook_ai_suggestion);
      if (aiSuggestion && validatedPlaybook !== aiSuggestion) {
        updateData.gtm_playbook_manually_overridden = true;
      }
    }
    
    if (productType !== undefined) {
      const validatedProductType = validateProductType(productType);
      updateData.product_type = validatedProductType;
      
      // Detect if user overrode AI suggestion
      const aiSuggestion = validateProductType(productTypeAISuggestion) || 
                          validateProductType(currentContext?.product_type_ai_suggestion);
      if (aiSuggestion && validatedProductType !== aiSuggestion) {
        updateData.product_type_manually_overridden = true;
      }
    }

    // Auto-classify GTM if:
    // 1. GTM fields are not explicitly being set in this request (or being cleared)
    // 2. Current GTM fields are not set (or being cleared)
    // 3. User hasn't manually overridden
    // 4. We have enough context (ICP, products, countries, or productDescription)
    // 5. Context variables are being updated (tone, productDescription, etc.) OR GTM is being cleared
    const isUpdatingContextVariables = tone !== undefined || valueProposition !== undefined || 
                                       productDescription !== undefined || targetCountries !== undefined || 
                                       competitors !== undefined || targetIndustries !== undefined || 
                                       complianceFlags !== undefined || marketingGoals !== undefined ||
                                       companyName !== undefined || companyWebsite !== undefined ||
                                       contactEmail !== undefined || contactPhone !== undefined ||
                                       linkedInUrl !== undefined || twitterUrl !== undefined || githubUrl !== undefined;
    const isUpdatingBusinessContext = icp !== undefined || countries !== undefined || products !== undefined;
    const isClearingGTM = (gtmPlaybook === null || gtmPlaybook === '') || 
                          (productType === null || productType === '');
    const currentGTMNotSet = !currentContext?.gtm_playbook && !currentContext?.product_type;
    
    const shouldAutoClassify = 
      (gtmPlaybook === undefined || isClearingGTM) && // Not setting GTM or clearing it
      (productType === undefined || isClearingGTM) &&
      !currentContext?.gtm_playbook_manually_overridden &&
      !currentContext?.product_type_manually_overridden &&
      (isUpdatingContextVariables || isUpdatingBusinessContext || isClearingGTM || currentGTMNotSet) && // Context is being updated or GTM not set
      ((icp || currentContext?.icp) || 
       (products?.length || currentContext?.products?.length) || 
       (countries?.length || currentContext?.countries?.length) || 
       (productDescription || updateData.product_description || currentContext?.product_description)); // Have enough context

    if (shouldAutoClassify) {
      try {
        // Use updated values if provided, otherwise use current context
        const effectiveICP = icp || currentContext?.icp || '';
        const effectiveProducts = products || currentContext?.products || [];
        const effectiveCountries = countries || currentContext?.countries || [];
        const productDesc = productDescription || updateData.product_description || currentContext?.product_description || '';
        
        // Build ICP from productDescription if ICP is empty
        const finalICP = effectiveICP || productDesc;
        
        // Only classify if we have some context
        if (finalICP || effectiveProducts.length || effectiveCountries.length) {
          const classification = await classifyGTMWithAI(finalICP, effectiveProducts, effectiveCountries, user.id);
          
          // Only set if we got valid results and not already manually set
          if (classification.gtm_playbook?.value && !updateData.gtm_playbook) {
            updateData.gtm_playbook = validateGTMPlaybook(classification.gtm_playbook.value);
            updateData.gtm_playbook_ai_suggested = true;
            updateData.gtm_playbook_confidence = classification.gtm_playbook.confidence || null;
            updateData.gtm_playbook_ai_suggestion = validateGTMPlaybook(classification.gtm_playbook.value);
          }
          
          if (classification.product_type?.value && !updateData.product_type) {
            updateData.product_type = validateProductType(classification.product_type.value);
            updateData.product_type_ai_suggested = true;
            updateData.product_type_confidence = classification.product_type.confidence || null;
            updateData.product_type_ai_suggestion = validateProductType(classification.product_type.value);
          }
        }
      } catch (error) {
        // Silently fail - don't block the update if classification fails
        console.debug('Auto-classification failed (non-blocking):', error);
      }
    }
    
    // GTM AI tracking fields
    if (gtmPlaybookAISuggestion !== undefined) {
      updateData.gtm_playbook_ai_suggestion = validateGTMPlaybook(gtmPlaybookAISuggestion);
    }
    if (productTypeAISuggestion !== undefined) {
      updateData.product_type_ai_suggestion = validateProductType(productTypeAISuggestion);
    }
    if (gtmPlaybookConfidence !== undefined) {
      updateData.gtm_playbook_confidence = Math.max(0, Math.min(1, gtmPlaybookConfidence));
    }
    if (productTypeConfidence !== undefined) {
      updateData.product_type_confidence = Math.max(0, Math.min(1, productTypeConfidence));
    }
    if (gtmPlaybookAISuggested !== undefined) {
      updateData.gtm_playbook_ai_suggested = gtmPlaybookAISuggested;
    }
    if (productTypeAISuggested !== undefined) {
      updateData.product_type_ai_suggested = productTypeAISuggested;
    }

    const { data: context, error } = await supabase
      .from('business_contexts')
      .upsert(
        {
          user_id: user.id,
          ...updateData,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
      .select('tone, target_countries, product_description, competitors, target_industries, compliance_flags, value_proposition, marketing_goals, icp, countries, products, target_keywords, competitor_keywords, company_name, company_website, contact_email, contact_phone, linkedin_url, twitter_url, github_url, gtm_playbook, product_type, gtm_playbook_ai_suggested, product_type_ai_suggested, gtm_playbook_confidence, product_type_confidence, gtm_playbook_manually_overridden, product_type_manually_overridden, gtm_playbook_ai_suggestion, product_type_ai_suggestion')
      .single();

    if (error) {
      console.error('Error updating business context:', error);
      return NextResponse.json({ error: 'Failed to update business context' }, { status: 500 });
    }

    // Transform back to frontend format
    const contextVariables = {
      tone: context.tone || undefined,
      valueProposition: context.value_proposition || undefined,
      targetCountries: context.target_countries || undefined,
      productDescription: context.product_description || undefined,
      competitors: context.competitors || undefined,
      targetIndustries: context.target_industries || undefined,
      complianceFlags: context.compliance_flags || undefined,
      marketingGoals: context.marketing_goals || undefined,
      companyName: context.company_name || undefined,
      companyWebsite: context.company_website || undefined,
      contactEmail: context.contact_email || undefined,
      contactPhone: context.contact_phone || undefined,
      linkedInUrl: context.linkedin_url || undefined,
      twitterUrl: context.twitter_url || undefined,
      githubUrl: context.github_url || undefined,
    };

    const businessContext = {
      icp: context.icp || undefined,
      countries: context.countries || [],
      products: context.products || [],
      targetKeywords: context.target_keywords || [],
      competitorKeywords: context.competitor_keywords || [],
    };

    const gtmProfile = {
      gtmPlaybook: context.gtm_playbook || undefined,
      productType: context.product_type || undefined,
      gtmPlaybookAISuggested: context.gtm_playbook_ai_suggested || false,
      productTypeAISuggested: context.product_type_ai_suggested || false,
      gtmPlaybookConfidence: context.gtm_playbook_confidence || undefined,
      productTypeConfidence: context.product_type_confidence || undefined,
      gtmPlaybookManuallyOverridden: context.gtm_playbook_manually_overridden || false,
      productTypeManuallyOverridden: context.product_type_manually_overridden || false,
      gtmPlaybookAISuggestion: context.gtm_playbook_ai_suggestion || undefined,
      productTypeAISuggestion: context.product_type_ai_suggestion || undefined,
    };

    return NextResponse.json({ 
      success: true, 
      contextVariables,
      businessContext,
      gtmProfile 
    });
  } catch (error) {
    console.error('Error updating business context:', error);
    return NextResponse.json({ error: 'Failed to update business context' }, { status: 500 });
  }
}
