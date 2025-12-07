/**
 * GTM Classification Validation
 * Validates AI classification results and user inputs
 */

import { GTMPlaybook, ProductType, GTMAIClassification } from '@/lib/types/business-context';

const VALID_PLAYBOOKS: GTMPlaybook[] = [
  'sales_led',
  'plg',
  'hybrid',
  'channel_led',
  'enterprise_infra'
];

const VALID_PRODUCT_TYPES: ProductType[] = [
  'devtools',
  'sales_marketing',
  'fintech',
  'hr',
  'cx',
  'security',
  'other'
];

/**
 * Validate GTM playbook value
 */
export function validateGTMPlaybook(value: string | null | undefined): GTMPlaybook | null {
  if (!value) return null;
  
  if (VALID_PLAYBOOKS.includes(value as GTMPlaybook)) {
    return value as GTMPlaybook;
  }
  
  console.warn(`Invalid GTM playbook: ${value}. Defaulting to null.`);
  return null;
}

/**
 * Validate product type value
 */
export function validateProductType(value: string | null | undefined): string | null {
  if (!value) return null;
  
  // Allow any string for product type (flexibility), but check against known types
  const normalized = value.toLowerCase().trim();
  
  if (VALID_PRODUCT_TYPES.includes(normalized as ProductType)) {
    return normalized;
  }
  
  // Allow "other" or any custom value
  return value;
}

/**
 * Clamp confidence value to 0-1 range
 */
export function clampConfidence(confidence: number | undefined): number {
  if (confidence === undefined || isNaN(confidence)) {
    return 0;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Validate and sanitize AI classification result
 */
export function validateClassification(
  result: Partial<GTMAIClassification>
): GTMAIClassification {
  // Validate playbook
  const playbookValue = validateGTMPlaybook(result.gtm_playbook?.value);
  const playbookConfidence = clampConfidence(result.gtm_playbook?.confidence);
  
  // Validate product type
  const productTypeValue = validateProductType(result.product_type?.value);
  const productTypeConfidence = clampConfidence(result.product_type?.confidence);
  
  return {
    gtm_playbook: {
      value: playbookValue,
      confidence: playbookConfidence,
      reasoning: result.gtm_playbook?.reasoning || 'No reasoning provided'
    },
    product_type: {
      value: productTypeValue as ProductType | null,
      confidence: productTypeConfidence,
      reasoning: result.product_type?.reasoning || 'No reasoning provided'
    }
  };
}

/**
 * Check if classification result is valid (has at least one value)
 */
export function isValidClassification(
  classification: GTMAIClassification
): boolean {
  return !!classification.gtm_playbook.value || !!classification.product_type.value;
}

/**
 * Check if classification has high confidence (>= 0.7)
 */
export function hasHighConfidence(classification: GTMAIClassification): {
  playbook: boolean;
  productType: boolean;
} {
  return {
    playbook: (classification.gtm_playbook.confidence || 0) >= 0.7,
    productType: (classification.product_type.confidence || 0) >= 0.7
  };
}

/**
 * Check if classification has low confidence (< 0.5)
 */
export function hasLowConfidence(classification: GTMAIClassification): {
  playbook: boolean;
  productType: boolean;
} {
  return {
    playbook: (classification.gtm_playbook.confidence || 0) < 0.5,
    productType: (classification.product_type.confidence || 0) < 0.5
  };
}

