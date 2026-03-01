
import { toast } from "@/hooks/use-toast";

/**
 * Centralized Error Handling Utility
 * 
 * Logs errors to the console and displays a user-friendly toast notification.
 * Use this in catch blocks to ensure consistent error reporting across the app.
 */

interface ErrorDetails {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
}

/**
 * Formats and alerts application-level errors. Ensures all unexpected faults 
 * correctly report out to the developers console whilst notifying the user
 * safely omitting complex stack traces from the UI level.
 * 
 * @function handleError
 * @param {unknown} error - The caught generalized exception (Error, string, or object).
 * @param {ErrorDetails} [customDetails] - Optional override config for the toast alert (e.g. specific user message).
 * @returns {{message: string}} The extracted safely formatted error string.
 */
export const handleError = (error: unknown, customDetails?: ErrorDetails) => {
    // 1. Log to console for development/debugging
    console.error("Application Error:", error);

    // 2. Extract message
    let message = "An unexpected error occurred. Please try again.";

    if (error instanceof Error) {
        message = error.message;
    } else if (typeof error === "string") {
        message = error;
    } else if (error && typeof error === "object" && "message" in error) {
        message = String(error.message);
    }

    // 3. Trigger Toast Notification
    toast({
        title: customDetails?.title || "Error",
        description: customDetails?.description || message,
        variant: customDetails?.variant || "destructive",
    });

    return { message };
};
