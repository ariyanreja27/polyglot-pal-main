export type SupportedScript =
    | 'Latin'
    | 'Arabic'
    | 'Hebrew'
    | 'Devanagari'
    | 'Bengali'
    | 'Thai'
    | 'Japanese'
    | 'Korean'
    | 'ChineseSimplified'
    | 'Tamil'
    | 'Telugu'
    | 'Malayalam'
    | 'Gujarati'
    | 'Kannada'
    | 'Oriya'
    | 'Sinhala'
    | 'Myanmar'
    | 'Khmer'
    | 'Lao'
    | 'Georgian'
    | 'Armenian'
    | 'Ethiopic'
    | 'Cyrillic'
    | 'Greek'
    | 'Default';

export interface FontConfig {
    gwfhId: string;       // ID for Google Webfonts Helper API
    vfsName: string;      // Filename in the Virtual File System
    fontName: string;     // Friendly name mapped in pdfMake.fonts
    isRTL?: boolean;      // True if the script is natively Right-To-Left
}

/**
 * 100% Universal Typography Map.
 * Maps every major human script to a professional Book-Quality Serif typeface.
 * 
 * @constant FONTS_REGISTRY
 * @type {Record<SupportedScript, FontConfig>}
 */
export const FONTS_REGISTRY: Record<SupportedScript, FontConfig> = {
    // Core (Always loaded for fixed columns and basic text)
    Latin: { gwfhId: 'merriweather', vfsName: 'Merriweather-Regular.ttf', fontName: 'Merriweather' },
    Cyrillic: { gwfhId: 'merriweather', vfsName: 'Merriweather-Regular.ttf', fontName: 'Merriweather' },
    Greek: { gwfhId: 'merriweather', vfsName: 'Merriweather-Regular.ttf', fontName: 'Merriweather' },
    Default: { gwfhId: 'merriweather', vfsName: 'Merriweather-Regular.ttf', fontName: 'Merriweather' },

    // Middle Eastern (RTL)
    Arabic: { gwfhId: 'amiri', vfsName: 'Amiri-Regular.ttf', fontName: 'Amiri', isRTL: true },
    Hebrew: { gwfhId: 'noto-serif-hebrew', vfsName: 'NotoSerifHebrew-Regular.ttf', fontName: 'NotoSerifHebrew', isRTL: true },

    // Indic / South Asian
    Devanagari: { gwfhId: 'sahitya', vfsName: 'Sahitya-Regular.ttf', fontName: 'Sahitya' },
    Bengali: { gwfhId: 'mina', vfsName: 'Mina-Regular.ttf', fontName: 'Mina' },
    Tamil: { gwfhId: 'noto-serif-tamil', vfsName: 'NotoSerifTamil-Regular.ttf', fontName: 'NotoSerifTamil' },
    Telugu: { gwfhId: 'noto-serif-telugu', vfsName: 'NotoSerifTelugu-Regular.ttf', fontName: 'NotoSerifTelugu' },
    Malayalam: { gwfhId: 'noto-serif-malayalam', vfsName: 'NotoSerifMalayalam-Regular.ttf', fontName: 'NotoSerifMalayalam' },
    Gujarati: { gwfhId: 'noto-serif-gujarati', vfsName: 'NotoSerifGujarati-Regular.ttf', fontName: 'NotoSerifGujarati' },
    Kannada: { gwfhId: 'noto-serif-kannada', vfsName: 'NotoSerifKannada-Regular.ttf', fontName: 'NotoSerifKannada' },
    Oriya: { gwfhId: 'noto-sans-oriya', vfsName: 'NotoSansOriya-Regular.ttf', fontName: 'NotoSansOriya' }, // Serif Oriya is rare, fallback to Noto Sans
    Sinhala: { gwfhId: 'noto-serif-sinhala', vfsName: 'NotoSerifSinhala-Regular.ttf', fontName: 'NotoSerifSinhala' },

    // Southeast Asian
    Thai: { gwfhId: 'sarabun', vfsName: 'Sarabun-Regular.ttf', fontName: 'Sarabun' },
    Myanmar: { gwfhId: 'noto-serif-myanmar', vfsName: 'NotoSerifMyanmar-Regular.ttf', fontName: 'NotoSerifMyanmar' },
    Khmer: { gwfhId: 'noto-serif-khmer', vfsName: 'NotoSerifKhmer-Regular.ttf', fontName: 'NotoSerifKhmer' },
    Lao: { gwfhId: 'noto-serif-lao', vfsName: 'NotoSerifLao-Regular.ttf', fontName: 'NotoSerifLao' },

    // CJK (East Asian)
    Japanese: { gwfhId: 'shippori-mincho', vfsName: 'ShipporiMincho-Regular.ttf', fontName: 'ShipporiMincho' },
    ChineseSimplified: { gwfhId: 'noto-serif-sc', vfsName: 'NotoSerifSC-Regular.ttf', fontName: 'NotoSerifSC' },
    Korean: { gwfhId: 'nanum-myeongjo', vfsName: 'NanumMyeongjo-Regular.ttf', fontName: 'NanumMyeongjo' },

    // Eurasian & African
    Georgian: { gwfhId: 'noto-serif-georgian', vfsName: 'NotoSerifGeorgian-Regular.ttf', fontName: 'NotoSerifGeorgian' },
    Armenian: { gwfhId: 'noto-serif-armenian', vfsName: 'NotoSerifArmenian-Regular.ttf', fontName: 'NotoSerifArmenian' },
    Ethiopic: { gwfhId: 'noto-serif-ethiopic', vfsName: 'NotoSerifEthiopic-Regular.ttf', fontName: 'NotoSerifEthiopic' }
};

/**
 * Parses any string into its official Unicode architectural block
 * to assign the correct typographical font.
 * 
 * @function getScriptFromText
 * @param {string | null | undefined} text - The input localized string.
 * @returns {SupportedScript} The matching SupportedScript enum value.
 */
export const getScriptFromText = (text: string | null | undefined): SupportedScript => {
    if (!text) return 'Default';

    let hasHiraganaKatakana = false;
    let hasHangul = false;
    let hasHan = false;

    for (const char of text) {
        const code = char.charCodeAt(0);

        // -- CJK Disambiguation --
        // Hiragana & Katakana
        if ((code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF)) {
            hasHiraganaKatakana = true;
        }
        // Hangul Jamo & Syllables
        if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x1100 && code <= 0x11FF) || (code >= 0x3130 && code <= 0x318F)) {
            hasHangul = true;
        }
        // CJK Unified Ideographs (Han)
        if (code >= 0x4E00 && code <= 0x9FFF) {
            hasHan = true;
        }

        // -- Middle Eastern --
        if (code >= 0x0600 && code <= 0x06FF) return 'Arabic';
        if (code >= 0x0590 && code <= 0x05FF) return 'Hebrew';

        // -- Indic / South Asian --
        if (code >= 0x0900 && code <= 0x097F) return 'Devanagari';
        if (code >= 0x0980 && code <= 0x09FF) return 'Bengali';
        if (code >= 0x0B80 && code <= 0x0BFF) return 'Tamil';
        if (code >= 0x0C00 && code <= 0x0C7F) return 'Telugu';
        if (code >= 0x0D00 && code <= 0x0D7F) return 'Malayalam';
        if (code >= 0x0A80 && code <= 0x0AFF) return 'Gujarati';
        if (code >= 0x0C80 && code <= 0x0CFF) return 'Kannada';
        if (code >= 0x0B00 && code <= 0x0B7F) return 'Oriya';
        if (code >= 0x0D80 && code <= 0x0DFF) return 'Sinhala';

        // -- Southeast Asian --
        if (code >= 0x0E00 && code <= 0x0E7F) return 'Thai';
        if (code >= 0x1000 && code <= 0x109F) return 'Myanmar';
        if (code >= 0x1780 && code <= 0x17FF) return 'Khmer';
        if (code >= 0x0E80 && code <= 0x0EFF) return 'Lao';

        // -- Eurasian/African --
        if (code >= 0x10A0 && code <= 0x10FF) return 'Georgian';
        if (code >= 0x0530 && code <= 0x058F) return 'Armenian';
        if (code >= 0x1200 && code <= 0x137F) return 'Ethiopic';

        // -- European --
        if (code >= 0x0400 && code <= 0x04FF) return 'Cyrillic';
        if (code >= 0x0370 && code <= 0x03FF) return 'Greek';
    }

    // Resolve CJK overrides
    if (hasHangul) return 'Korean';
    if (hasHiraganaKatakana) return 'Japanese';
    if (hasHan) return 'ChineseSimplified'; // Default to SC if purely Han ideographs are found

    return 'Default'; // Resolves to Merriweather
};
