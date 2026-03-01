/**
 * Evaluates the dominant script of a text string to determine if it requires
 * Right-To-Left (RTL) text shaping and alignment natively in pdfMake.
 * 
 * @function isRTLSentence
 * @param {string | null | undefined} text - The text string to evaluate.
 * @returns {boolean} True if the text contains >30% RTL characters.
 */
export const isRTLSentence = (text: string | null | undefined): boolean => {
    if (!text) return false;

    // Remove whitespace and punctuation for accurate detection
    const cleanText = text.replace(/[\s\p{Punctuation}0-9]/gu, '');
    if (cleanText.length === 0) return false;

    let rtlCount = 0;

    for (const char of cleanText) {
        const code = char.charCodeAt(0);
        // Arabic block, Hebrew block, Syriac, Thaana, and extended Arabic
        if (
            (code >= 0x0590 && code <= 0x05FF) || // Hebrew
            (code >= 0x0600 && code <= 0x06FF) || // Arabic
            (code >= 0x0750 && code <= 0x077F) || // Arabic Supplement
            (code >= 0x08A0 && code <= 0x08FF) || // Arabic Extended-A
            (code >= 0x0700 && code <= 0x074F) || // Syriac
            (code >= 0x0780 && code <= 0x07BF)    // Thaana
        ) {
            rtlCount++;
        }
    }

    // If more than 30% of actual letters are RTL characters, we format the block as RTL
    return (rtlCount / cleanText.length) > 0.3;
};
