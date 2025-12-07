/**
 * Business Context Types
 * Includes GTM playbook and product type classification
 */

export type GTMPlaybook = 
  | 'sales_led'
  | 'plg'
  | 'hybrid'
  | 'channel_led'
  | 'enterprise_infra';

export type ProductType = 
  | 'devtools'
  | 'sales_marketing'
  | 'fintech'
  | 'hr'
  | 'cx'
  | 'security'
  | 'other';

export interface GTMAIClassification {
  gtm_playbook: {
    value: GTMPlaybook | null;
    confidence: number; // 0.0 to 1.0
    reasoning: string;
  };
  product_type: {
    value: ProductType | null;
    confidence: number; // 0.0 to 1.0
    reasoning: string;
  };
}

export interface BusinessContext {
  id: string;
  user_id: string;
  
  // Onboarding inputs
  icp?: string;
  countries?: string[];
  products?: string[];
  
  // Marketing Strategy
  value_proposition?: string;
  marketing_goals?: string[];
  
  // Generated/learned data
  target_keywords?: string[];
  competitor_keywords?: string[];
  
  // Context Variables (for prompt templating - migrated from localStorage)
  tone?: string;
  target_countries?: string;  // Stored as TEXT (matches localStorage format)
  product_description?: string;
  competitors?: string;
  target_industries?: string;
  compliance_flags?: string;
  
  // GTM Classification
  gtm_playbook?: GTMPlaybook;
  product_type?: string; // Free text for flexibility
  
  // AI tracking
  gtm_playbook_ai_suggested?: boolean;
  product_type_ai_suggested?: boolean;
  gtm_playbook_confidence?: number;
  product_type_confidence?: number;
  
  // Override tracking
  gtm_playbook_manually_overridden?: boolean;
  product_type_manually_overridden?: boolean;
  gtm_playbook_ai_suggestion?: GTMPlaybook;
  product_type_ai_suggestion?: string;
  
  // Migration tracking
  migration_banner_shown?: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface BusinessContextUpdate {
  icp?: string;
  countries?: string[];
  products?: string[];
  value_proposition?: string | null;
  marketing_goals?: string[];
  target_keywords?: string[];
  competitor_keywords?: string[];
  
  // Context Variables updates
  tone?: string | null;
  target_countries?: string | null;
  product_description?: string | null;
  competitors?: string | null;
  target_industries?: string | null;
  compliance_flags?: string | null;
  
  // GTM Classification updates
  gtm_playbook?: GTMPlaybook | null;
  product_type?: string | null;
  
  // AI tracking updates
  gtm_playbook_ai_suggested?: boolean;
  product_type_ai_suggested?: boolean;
  gtm_playbook_confidence?: number;
  product_type_confidence?: number;
  
  // Override tracking updates
  gtm_playbook_manually_overridden?: boolean;
  product_type_manually_overridden?: boolean;
  gtm_playbook_ai_suggestion?: GTMPlaybook | null;
  product_type_ai_suggestion?: string | null;
  
  // Migration tracking
  migration_banner_shown?: boolean;
}

export interface ConfidenceLevel {
  level: 'high' | 'medium' | 'low';
  badge: string;
  color: 'green' | 'yellow' | 'red';
  preselected: boolean;
}

/**
 * Get confidence level from score
 */
export function getConfidenceLevel(confidence: number | undefined): ConfidenceLevel {
  if (confidence === undefined || confidence < 0.5) {
    return {
      level: 'low',
      badge: 'Low confidence',
      color: 'red',
      preselected: false
    };
  }
  
  if (confidence >= 0.7) {
    return {
      level: 'high',
      badge: 'High confidence',
      color: 'green',
      preselected: true
    };
  }
  
  return {
    level: 'medium',
    badge: 'Suggested',
    color: 'yellow',
    preselected: false
  };
}

/**
 * Check if GTM profile is complete
 */
export function isGTMProfileComplete(context: BusinessContext): boolean {
  return !!context.gtm_playbook && !!context.product_type;
}

/**
 * Check if GTM profile is partially complete
 */
export function isGTMProfilePartial(context: BusinessContext): boolean {
  return (!!context.gtm_playbook && !context.product_type) || 
         (!context.gtm_playbook && !!context.product_type);
}

/**
 * Check if user has overridden AI suggestion
 */
export function hasOverriddenAI(context: BusinessContext): {
  playbook: boolean;
  productType: boolean;
} {
  return {
    playbook: context.gtm_playbook_manually_overridden || false,
    productType: context.product_type_manually_overridden || false
  };
}
