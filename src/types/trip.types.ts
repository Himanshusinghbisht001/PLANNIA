/**
 * Trip domain types — shared between controllers, services and models.
 */

export type TripStatus = 'draft' | 'generating' | 'completed' | 'failed';

export type SubscriptionPlan = 'free' | 'pro';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'expired';

export type TravelStyle =
  | 'adventure'
  | 'relaxation'
  | 'cultural'
  | 'budget'
  | 'luxury';

export type ActivityCategory =
  | 'Adventure'
  | 'Nature'
  | 'Culture'
  | 'Food'
  | 'Shopping'
  | 'History'
  | 'Entertainment'
  | 'Relaxation';

export interface CreateTripInput {
  destination: string;
  origin: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  currency: string;
  travelStyle: TravelStyle;
  interests: string[];
  notes?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
