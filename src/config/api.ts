
/**
 * Centralized API and Environment Configuration
 * 
 * All environment variables are validated and exported from here to ensure
 * consistency across the application.
 */

// API Base URL for future custom backend usage
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Supabase Configuration
export const SUPABASE_CONFIG = {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
};

// Groq AI Configuration
export const GROQ_CONFIG = {
    apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
};

// Development Flags
export const IS_PROD = import.meta.env.PROD;
export const IS_DEV = import.meta.env.DEV;
