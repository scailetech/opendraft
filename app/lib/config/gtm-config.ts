/**
 * GTM Configuration
 * Defines GTM playbooks, product types, KPIs, and data sources
 */

import { GTMPlaybook, ProductType } from '@/lib/types/business-context';

// ============================================================================
// GTM PLAYBOOKS
// ============================================================================

export interface GTMPlaybookConfig {
  id: GTMPlaybook;
  name: string;
  description: string;
  kpis: string[];
  data_sources: string[];
}

export const GTM_PLAYBOOKS: Record<GTMPlaybook, GTMPlaybookConfig> = {
  sales_led: {
    id: 'sales_led',
    name: 'Sales-led',
    description: 'Classic B2B sales, higher ACV, goal = SQLs, meetings, opportunities',
    kpis: ['opportunities', 'pipeline_value', 'win_rate'],
    data_sources: ['funding_rounds', 'hiring_patterns', 'firmographic_filters']
  },
  plg: {
    id: 'plg',
    name: 'PLG (Product-Led Growth)',
    description: 'Free trial / freemium, goal = signups, activations, PQLs',
    kpis: ['signups', 'activations', 'pqls'],
    data_sources: ['product_usage_events', 'signup_milestones', 'activation_milestones']
  },
  hybrid: {
    id: 'hybrid',
    name: 'Hybrid',
    description: 'PLG + sales assist, goal = activate trials and convert PQLs to meetings',
    kpis: ['trials', 'pqls', 'meetings_with_pqls'],
    data_sources: ['product_usage_events', 'pql_signals', 'meeting_bookings']
  },
  channel_led: {
    id: 'channel_led',
    name: 'Channel-led',
    description: 'Selling via partners / resellers, goal = new partners, partner pipeline',
    kpis: ['new_partners', 'partner_pipeline_value'],
    data_sources: ['partner_directories', 'agencies', 'gmaps_resellers']
  },
  enterprise_infra: {
    id: 'enterprise_infra',
    name: 'Enterprise / Infrastructure',
    description: 'Long cycles, PoCs, goal = PoCs started, target accounts engaged',
    kpis: ['target_accounts_engaged', 'pocs_started'],
    data_sources: ['target_account_lists', 'poc_signals', 'enterprise_signals']
  }
};

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface ProductTypeConfig {
  id: ProductType;
  name: string;
  kpis: string[];
  data_sources: string[];
}

export const PRODUCT_TYPES: Record<ProductType, ProductTypeConfig> = {
  devtools: {
    id: 'devtools',
    name: 'DevTools',
    kpis: ['documentation_visits', 'active_workspaces', 'active_projects'],
    data_sources: ['engineering_blogs', 'tech_stack_signals', 'github_signals']
  },
  sales_marketing: {
    id: 'sales_marketing',
    name: 'Sales & Marketing',
    kpis: ['demo_requests', 'trials_started'],
    data_sources: ['marketing_signals', 'demo_form_submissions']
  },
  fintech: {
    id: 'fintech',
    name: 'Fintech',
    kpis: ['qualified_accounts_target_industries', 'pocs_sandbox_integrations'],
    data_sources: ['merchant_lists', 'financial_services_lists', 'compliance_signals']
  },
  hr: {
    id: 'hr',
    name: 'HR',
    kpis: ['opportunities_target_employee_ranges', 'multi_stakeholder_engagement'],
    data_sources: ['hr_signals', 'employee_range_filters']
  },
  cx: {
    id: 'cx',
    name: 'Customer Experience',
    kpis: ['customer_satisfaction_scores', 'engagement_metrics'],
    data_sources: ['cx_signals', 'support_metrics']
  },
  security: {
    id: 'security',
    name: 'Security',
    kpis: ['security_incidents', 'compliance_certifications'],
    data_sources: ['security_signals', 'compliance_data']
  },
  other: {
    id: 'other',
    name: 'Other',
    kpis: [],
    data_sources: []
  }
};

// ============================================================================
// ALWAYS-ON KPIs (Layer 1)
// ============================================================================

export const ALWAYS_ON_KPIS: string[] = [
  'new_leads',
  'sqls',
  'meetings',
  'opportunities',
  'seo_traffic',
  'outbound_replies'
];

// ============================================================================
// ALWAYS-ON DATA SOURCES (Layer 1)
// ============================================================================

export const ALWAYS_ON_DATA_SOURCES: string[] = [
  'crm', // leads, SQLs, opportunities, meetings
  'website_analytics', // SEO traffic, demo/trial form submissions
  'outbound_tools' // email/LinkedIn sends, opens, replies
];

// ============================================================================
// KPI MAPPING FUNCTIONS
// ============================================================================

/**
 * Get KPIs for a GTM profile (three-layer system)
 * Layer 1: Always-on KPIs
 * Layer 2: Playbook-specific KPIs
 * Layer 3: Product-type flavor KPIs (max 1-2)
 */
export function getKPIsForGTMProfile(
  playbook: GTMPlaybook | null | undefined,
  productType: string | null | undefined
): string[] {
  const kpis = [...ALWAYS_ON_KPIS]; // Layer 1: Always-on
  
  // Layer 2: Playbook-specific KPIs
  if (playbook && GTM_PLAYBOOKS[playbook]) {
    kpis.push(...GTM_PLAYBOOKS[playbook].kpis);
  }
  
  // Layer 3: Product-type flavor KPIs (max 1-2)
  if (productType) {
    const normalizedProductType = productType.toLowerCase().trim() as ProductType;
    const productConfig = PRODUCT_TYPES[normalizedProductType];
    
    if (productConfig) {
      // Limit to 2 KPIs max for product type
      kpis.push(...productConfig.kpis.slice(0, 2));
    }
  }
  
  // Remove duplicates and return
  return Array.from(new Set(kpis));
}

/**
 * Get KPIs grouped by layer
 */
export function getKPIsGroupedByLayer(
  playbook: GTMPlaybook | null | undefined,
  productType: string | null | undefined
): {
  alwaysOn: string[];
  playbook: string[];
  productType: string[];
} {
  const alwaysOn = [...ALWAYS_ON_KPIS];
  
  let playbookKPIs: string[] = [];
  if (playbook && GTM_PLAYBOOKS[playbook]) {
    playbookKPIs = [...GTM_PLAYBOOKS[playbook].kpis];
  }
  
  let productTypeKPIs: string[] = [];
  if (productType) {
    const normalizedProductType = productType.toLowerCase().trim() as ProductType;
    const productConfig = PRODUCT_TYPES[normalizedProductType];
    if (productConfig) {
      productTypeKPIs = productConfig.kpis.slice(0, 2);
    }
  }
  
  return {
    alwaysOn,
    playbook: playbookKPIs,
    productType: productTypeKPIs
  };
}

/**
 * Get KPI badge/layer info
 */
export function getKPILayer(kpi: string): 'always-on' | 'playbook' | 'product-type' | 'unknown' {
  if (ALWAYS_ON_KPIS.includes(kpi)) {
    return 'always-on';
  }
  
  // Check playbook KPIs
  for (const playbook of Object.values(GTM_PLAYBOOKS)) {
    if (playbook.kpis.includes(kpi)) {
      return 'playbook';
    }
  }
  
  // Check product type KPIs
  for (const productType of Object.values(PRODUCT_TYPES)) {
    if (productType.kpis.includes(kpi)) {
      return 'product-type';
    }
  }
  
  return 'unknown';
}

// ============================================================================
// DATA SOURCE MAPPING FUNCTIONS
// ============================================================================

/**
 * Get data sources for a GTM profile (three-layer system)
 */
export function getDataSourcesForGTMProfile(
  playbook: GTMPlaybook | null | undefined,
  productType: string | null | undefined
): string[] {
  const sources = [...ALWAYS_ON_DATA_SOURCES]; // Layer 1: Always-on
  
  // Layer 2: Playbook-specific sources
  if (playbook && GTM_PLAYBOOKS[playbook]) {
    sources.push(...GTM_PLAYBOOKS[playbook].data_sources);
  }
  
  // Layer 3: Product-type flavor sources
  if (productType) {
    const normalizedProductType = productType.toLowerCase().trim() as ProductType;
    const productConfig = PRODUCT_TYPES[normalizedProductType];
    
    if (productConfig) {
      sources.push(...productConfig.data_sources);
    }
  }
  
  // Remove duplicates and return
  return Array.from(new Set(sources));
}

/**
 * Get recommended integrations based on GTM profile
 * (For integration setup wizard)
 */
export function getRecommendedIntegrations(
  playbook: GTMPlaybook | null | undefined,
  productType: string | null | undefined
): string[] {
  const integrations: string[] = ['crm', 'website_analytics']; // Always-on
  
  // Playbook-specific integrations
  if (playbook === 'sales_led') {
    integrations.push('hubspot', 'salesforce');
  } else if (playbook === 'plg') {
    integrations.push('product_analytics', 'mixpanel');
  } else if (playbook === 'hybrid') {
    integrations.push('product_analytics', 'crm');
  } else if (playbook === 'channel_led') {
    integrations.push('partner_portal', 'crm');
  } else if (playbook === 'enterprise_infra') {
    integrations.push('crm', 'account_based_marketing');
  }
  
  // Product-type specific integrations
  if (productType) {
    const normalizedProductType = productType.toLowerCase().trim() as ProductType;
    
    if (normalizedProductType === 'devtools') {
      integrations.push('github', 'stack_overflow');
    } else if (normalizedProductType === 'fintech') {
      integrations.push('financial_data_providers', 'compliance_tools');
    } else if (normalizedProductType === 'hr') {
      integrations.push('hr_systems', 'payroll_providers');
    }
  }
  
  return Array.from(new Set(integrations));
}

/**
 * Get data source priorities for agent execution
 * Returns a map of source -> priority (higher = more important)
 */
export function getDataSourcePriorities(
  playbook: GTMPlaybook | null | undefined,
  productType: string | null | undefined
): Record<string, number> {
  const priorities: Record<string, number> = {
    crm: 10, // Always high
    website_analytics: 10
  };
  
  // Playbook-specific priorities
  if (playbook === 'sales_led') {
    priorities.funding_rounds = 8;
    priorities.hiring_patterns = 8;
    priorities.firmographic_filters = 7;
  } else if (playbook === 'plg') {
    priorities.product_usage_events = 9;
    priorities.signup_milestones = 8;
    priorities.activation_milestones = 8;
  } else if (playbook === 'hybrid') {
    priorities.product_usage_events = 8;
    priorities.pql_signals = 9;
    priorities.meeting_bookings = 8;
  } else if (playbook === 'channel_led') {
    priorities.partner_directories = 9;
    priorities.agencies = 8;
    priorities.gmaps_resellers = 7;
  } else if (playbook === 'enterprise_infra') {
    priorities.target_account_lists = 9;
    priorities.poc_signals = 8;
    priorities.enterprise_signals = 8;
  }
  
  // Product-type specific priorities
  if (productType) {
    const normalizedProductType = productType.toLowerCase().trim() as ProductType;
    
    if (normalizedProductType === 'devtools') {
      priorities.github_signals = 8;
      priorities.tech_stack_signals = 7;
      priorities.engineering_blogs = 6;
    } else if (normalizedProductType === 'fintech') {
      priorities.merchant_lists = 8;
      priorities.financial_services_lists = 8;
      priorities.compliance_signals = 7;
    }
  }
  
  return priorities;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get playbook display name
 */
export function getPlaybookDisplayName(playbook: GTMPlaybook | null | undefined): string {
  if (!playbook) return 'Not set';
  return GTM_PLAYBOOKS[playbook]?.name || playbook;
}

/**
 * Get product type display name
 */
export function getProductTypeDisplayName(productType: string | null | undefined): string {
  if (!productType) return 'Not set';
  
  const normalized = productType.toLowerCase().trim() as ProductType;
  if (PRODUCT_TYPES[normalized]) {
    return PRODUCT_TYPES[normalized].name;
  }
  
  return productType; // Return as-is if custom
}

/**
 * Get full GTM profile display string
 */
export function getGTMProfileDisplay(
  playbook: GTMPlaybook | null | undefined,
  productType: string | null | undefined
): string {
  const playbookName = getPlaybookDisplayName(playbook);
  const productTypeName = getProductTypeDisplayName(productType);
  
  if (playbook && productType) {
    return `${playbookName} + ${productTypeName}`;
  }
  
  if (playbook) {
    return `${playbookName} (product type not set)`;
  }
  
  if (productType) {
    return `${productTypeName} (GTM playbook not set)`;
  }
  
  return 'Not configured';
}

