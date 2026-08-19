import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { aiOutputSchema } from '../validators/trip.validator';
import { AITripOutput } from '../types/ai.types';
import { CreateTripInput } from '../types/trip.types';
import { Errors } from '../utils/AppError';
import { logger } from '../utils/logger';

const PROMPT_VERSION = 'v1';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.7,
    maxOutputTokens: 8192,
  },
});

/**
 * Build the Gemini prompt for trip generation.
 *
 * The prompt defines:
 * - Role and context
 * - Task and constraints
 * - Exact JSON output schema
 * - Safety expectations
 *
 * Never include secrets in the prompt.
 */
function buildTripPrompt(input: CreateTripInput): string {
  const days = Math.max(
    1,
    Math.ceil(
      (new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1,
  );

  return `You are PLANNIA, an expert AI travel planning assistant.

Create a practical, detailed travel plan based on the following requirements.

TRIP REQUIREMENTS:
- Destination: ${input.destination}
- Starting from: ${input.origin}
- Start date: ${input.startDate}
- End date: ${input.endDate}
- Duration: ${days} day(s)
- Number of travelers: ${input.travelers}
- Budget: ${input.budget} ${input.currency}
- Travel style: ${input.travelStyle}
- Interests: ${input.interests.join(', ')}
${input.notes ? `- Special requirements: ${input.notes}` : ''}

IMPORTANT RULES:
1. Return ONLY valid JSON matching the exact schema below.
2. Do NOT invent booking confirmations or claim reservations were made.
3. Clearly indicate all costs as estimates.
4. All coordinates (latitude, longitude) must be accurate real-world values for ${input.destination}.
5. Hotel ratings must be between 0 and 5.
6. estimatedCost values must be non-negative numbers in ${input.currency}.
7. The itinerary must have exactly ${days} day(s).
8. Do not include any text outside the JSON object.

REQUIRED JSON SCHEMA:
{
  "destination": "string — the main destination",
  "summary": "string — 2-3 sentence trip overview",
  "budget": {
    "currency": "${input.currency}",
    "estimatedTotal": number,
    "breakdown": {
      "accommodation": number,
      "food": number,
      "activities": number,
      "transport": number,
      "miscellaneous": number
    }
  },
  "hotels": [
    {
      "name": "string",
      "location": "string — area/address",
      "rating": number (0-5),
      "priceRange": "string — e.g. ₹2,000-₹4,000/night",
      "description": "string",
      "latitude": number,
      "longitude": number,
      "image": null
    }
  ],
  "activities": [
    {
      "name": "string",
      "category": "one of: Adventure, Nature, Culture, Food, Shopping, History, Entertainment, Relaxation",
      "description": "string",
      "location": "string",
      "estimatedCost": number,
      "duration": "string — e.g. 2 hours",
      "latitude": number,
      "longitude": number
    }
  ],
  "itinerary": [
    {
      "dayNumber": number,
      "date": "YYYY-MM-DD",
      "title": "string — day theme",
      "activities": [
        {
          "name": "string",
          "description": "string",
          "location": "string",
          "startTime": "HH:MM",
          "duration": "string",
          "estimatedCost": number,
          "category": "string"
        }
      ],
      "meals": ["breakfast suggestion", "lunch suggestion", "dinner suggestion"],
      "notes": "string — useful day tips",
      "estimatedCost": number
    }
  ],
  "mapLocations": [
    {
      "name": "string",
      "type": "destination | hotel | activity",
      "latitude": number,
      "longitude": number
    }
  ],
  "tips": ["string — practical travel tip"]
}`;
}

/**
 * Generate a structured trip plan using Gemini.
 *
 * Pipeline:
 * 1. Build prompt
 * 2. Call Gemini
 * 3. Parse JSON response
 * 4. Validate against Zod schema (retry once on failure)
 * 5. Return typed, validated data
 *
 * Never logs secrets. Error codes are safe for logging.
 */
export async function generateTrip(input: CreateTripInput): Promise<AITripOutput> {
  const prompt = buildTripPrompt(input);

  let rawText: string;

  try {
    const result = await model.generateContent(prompt);
    rawText = result.response.text();
  } catch (error) {
    logger.error('Gemini API request failed', {
      operation: 'ai_generate_trip',
      code: 'GEMINI_API_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    throw Errors.aiGenerationFailed();
  }

  // Parse JSON
  let parsed: unknown;
  try {
    // Strip markdown code fences if Gemini wraps the response
    const cleaned = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    logger.error('Gemini response is not valid JSON', {
      operation: 'ai_generate_trip',
      code: 'AI_INVALID_JSON',
    });
    throw Errors.aiGenerationFailed();
  }

  // Validate output schema
  const validation = aiOutputSchema.safeParse(parsed);
  if (!validation.success) {
    logger.error('Gemini output failed schema validation', {
      operation: 'ai_generate_trip',
      code: 'AI_OUTPUT_INVALID',
      promptVersion: PROMPT_VERSION,
    });

    // Retry once with a stricter prompt nudge
    return retryGenerate(input);
  }

  logger.info('AI trip generated successfully', {
    operation: 'ai_generate_trip',
    status: 'success',
    promptVersion: PROMPT_VERSION,
  });

  return validation.data;
}

/**
 * Single retry for AI generation.
 * If this also fails, throw aiGenerationFailed.
 */
async function retryGenerate(input: CreateTripInput): Promise<AITripOutput> {
  logger.warn('Retrying AI generation', {
    operation: 'ai_generate_trip',
    code: 'AI_RETRY',
    promptVersion: PROMPT_VERSION,
  });

  let rawText: string;
  try {
    const result = await model.generateContent(buildTripPrompt(input));
    rawText = result.response.text();
  } catch {
    throw Errors.aiGenerationFailed();
  }

  let parsed: unknown;
  try {
    const cleaned = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw Errors.aiGenerationFailed();
  }

  const validation = aiOutputSchema.safeParse(parsed);
  if (!validation.success) {
    logger.error('AI retry also failed schema validation', {
      operation: 'ai_generate_trip',
      code: 'AI_OUTPUT_INVALID_RETRY',
    });
    throw Errors.aiGenerationFailed();
  }

  return validation.data;
}

export { PROMPT_VERSION };
