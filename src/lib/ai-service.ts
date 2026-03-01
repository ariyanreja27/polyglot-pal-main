import Groq from "groq-sdk";
import { GROQ_CONFIG } from "@/config/api";
import { handleError } from "./error-handler";

const groq = new Groq({
    apiKey: GROQ_CONFIG.apiKey,
    dangerouslyAllowBrowser: true // Necessary for client-side Vite apps
});

export interface AIContent {
    type: string;
    pronunciation: string;
    meaning: string;
    example: {
        sentence: string;
        translation: string;
    };
    notes: string;
    tags: string[];
}

/**
 * generateAIContent
 * 
 * Integrates with the Groq API (via LLM `llama-3.3-70b-versatile`) to dynamically
 * generate comprehensive linguistic data for a given vocabulary word. It bypasses
 * traditional manual entry by leveraging AI to fetch translations, pronunciations,
 * grammatical types, standard examples, and learning tips in a structured format.
 * 
 * @async
 * @function generateAIContent
 * @param {string} word - The target language word to analyze.
 * @param {string} [language] - The contextual language (e.g. "Spanish").
 * @returns {Promise<AIContent>} A strongly-typed breakdown of the word's properties.
 * @throws {Error} If the API request fails, returns invalid JSON, or API key is missing.
 */
export const generateAIContent = async (word: string, language?: string): Promise<AIContent> => {
    if (!GROQ_CONFIG.apiKey) {
        throw new Error("Groq API key is missing. Please add VITE_GROQ_API_KEY to your .env file and restart the dev server.");
    }

    try {
        const prompt = `
      You are a linguistic expert. Generate detailed language learning data for the word "${word}" which is in the ${language || "target"} language.
      
      CRITICAL: The word "${word}" MUST be treated as a ${language || "foreign"} language term and translated into English.
      
      Return ONLY a JSON object with the following structure:
      {
        "type": "noun/pronoun/adjective/verb/adverb/preposition/conjunction/interjection/determiner (must be lowercase)",
        "pronunciation": "[IPA notation]",
        "meaning": "Clear English translation",
        "example": {
          "sentence": "A natural example sentence using the word",
          "translation": "English translation of the example sentence"
        },
        "notes": "A helpful learning note about usage, grammar, or culture (max 2 sentences)",
        "tags": ["3 relevant tags like 'essential', 'daily', 'grammar'"]
      }

      Do not include any other text, only the JSON.
    `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const text = chatCompletion.choices[0]?.message?.content;

        if (!text) {
            throw new Error("AI returned an empty response.");
        }

        try {
            const data = JSON.parse(text);
            return data as AIContent;
        } catch (parseError) {
            handleError(parseError, { title: "AI Parsing Error", description: "AI generated invalid JSON structure." });
            throw new Error("AI generated invalid JSON structure.");
        }
    } catch (error: any) {
        handleError(error, { title: "AI Generation Failed" });
        throw error;
    }
};
