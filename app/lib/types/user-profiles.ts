/**
 * User Profile types and interfaces
 * User types and agency/client relationships
 */

export type UserType = 'self_service' | 'client' | 'admin'

export interface UserProfile {
  id: string
  user_id: string
  user_type: UserType
  agency_id?: string
  onboarding_link?: string
  created_at: string
  updated_at: string
}

export interface UserProfileUpdate {
  user_type?: UserType
  agency_id?: string
  onboarding_link?: string
}

