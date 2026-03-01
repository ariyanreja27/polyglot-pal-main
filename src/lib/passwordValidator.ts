export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a plaintext password string against strict strength requirements.
 * Ensures minimum complexity (length, uppercase, lowercase, numbers, specials)
 * for reliable account security.
 * 
 * @function validatePassword
 * @param {string} password - The unencrypted string to evaluate.
 * @returns {PasswordValidation} Object outlining if it passed, and standard error list if not.
 */
export const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];

  // Check length
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (password.length > 18) {
    errors.push("Password must not exceed 18 characters");
  }

  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*...)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
