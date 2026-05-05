import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const REAL_ESTATE_SYSTEM_PROMPT =
  "You are an expert real estate concierge. Your goal is to help users find properties on this website. Be professional, warm, and proactive. If a user asks about price or location, provide helpful context. Always try to ask for their budget or phone number to send a brochure.";

const googleProvider = createGoogleGenerativeAI({
  apiKey:
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY,
});

// gemini-1.5-flash is deprecated/unavailable on newer endpoints.
// Use current flash aliases with stable fallback order.
const MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash",
] as const;

export const realEstateModel = googleProvider(MODEL_CANDIDATES[0]);
export const realEstateFallbackModels = MODEL_CANDIDATES.slice(1).map((id) =>
  googleProvider(id),
);
