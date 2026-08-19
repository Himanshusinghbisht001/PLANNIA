import { z } from 'zod';
import { aiOutputSchema } from '../validators/trip.validator';

/**
 * Typed AI output — inferred from the Zod validation schema.
 * This ensures the type and the runtime validator stay in sync.
 */
export type AITripOutput = z.infer<typeof aiOutputSchema>;

export interface AIHotel {
  name: string;
  location: string;
  rating: number;
  priceRange: string;
  description: string;
  latitude: number;
  longitude: number;
  image?: string;
}

export interface AIActivity {
  name: string;
  category: string;
  description: string;
  location: string;
  estimatedCost: number;
  duration: string;
  latitude: number;
  longitude: number;
}

export interface AIItineraryActivity {
  name: string;
  description: string;
  location: string;
  startTime: string;
  duration: string;
  estimatedCost: number;
  category: string;
}

export interface AIItineraryDay {
  dayNumber: number;
  date: string;
  title: string;
  activities: AIItineraryActivity[];
  meals: string[];
  notes: string;
  estimatedCost: number;
}

export interface AIMapLocation {
  name: string;
  type: 'destination' | 'hotel' | 'activity';
  latitude: number;
  longitude: number;
}

export interface AIBudget {
  currency: string;
  estimatedTotal: number;
  breakdown?: Record<string, number>;
}
