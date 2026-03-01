import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the registry we just built (need to parse it since it's TS, or duplicate the config here for the script)
// To keep the script standalone and simple, we'll redefine the target fonts here.
const TARGET_FONTS = [
    { gwfhId: 'merriweather', vfsName: 'Merriweather-Regular.ttf' },
    { gwfhId: 'amiri', vfsName: 'Amiri-Regular.ttf' },
    { gwfhId: 'noto-serif-hebrew', vfsName: 'NotoSerifHebrew-Regular.ttf' },
    { gwfhId: 'sahitya', vfsName: 'Sahitya-Regular.ttf' },
    { gwfhId: 'mina', vfsName: 'Mina-Regular.ttf' },
    { gwfhId: 'noto-serif-tamil', vfsName: 'NotoSerifTamil-Regular.ttf' },
    { gwfhId: 'noto-serif-telugu', vfsName: 'NotoSerifTelugu-Regular.ttf' },
    { gwfhId: 'noto-serif-malayalam', vfsName: 'NotoSerifMalayalam-Regular.ttf' },
    { gwfhId: 'noto-serif-gujarati', vfsName: 'NotoSerifGujarati-Regular.ttf' },
    { gwfhId: 'noto-serif-kannada', vfsName: 'NotoSerifKannada-Regular.ttf' },
    { gwfhId: 'noto-sans-oriya', vfsName: 'NotoSansOriya-Regular.ttf' },
    { gwfhId: 'noto-serif-sinhala', vfsName: 'NotoSerifSinhala-Regular.ttf' },
    { gwfhId: 'sarabun', vfsName: 'Sarabun-Regular.ttf' },
    { gwfhId: 'noto-serif-myanmar', vfsName: 'NotoSerifMyanmar-Regular.ttf' },
    { gwfhId: 'noto-serif-khmer', vfsName: 'NotoSerifKhmer-Regular.ttf' },
    { gwfhId: 'noto-serif-lao', vfsName: 'NotoSerifLao-Regular.ttf' },
    { gwfhId: 'shippori-mincho', vfsName: 'ShipporiMincho-Regular.ttf' },
    { gwfhId: 'noto-serif-sc', vfsName: 'NotoSerifSC-Regular.ttf' },
    { gwfhId: 'noto-serif-tc', vfsName: 'NotoSerifTC-Regular.ttf' },
    { gwfhId: 'nanum-myeongjo', vfsName: 'NanumMyeongjo-Regular.ttf' },
    { gwfhId: 'noto-serif-georgian', vfsName: 'NotoSerifGeorgian-Regular.ttf' },
    { gwfhId: 'noto-serif-armenian', vfsName: 'NotoSerifArmenian-Regular.ttf' },
    { gwfhId: 'noto-serif-ethiopic', vfsName: 'NotoSerifEthiopic-Regular.ttf' }
];

const TARGET_DIR = path.join(__dirname, "..", "public", "fonts", "pdf");

if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const downloadFont = async (gwfhId, vfsName) => {
    const destPath = path.join(TARGET_DIR, vfsName);
    if (fs.existsSync(destPath)) {
        console.log(`[SKIPPED] ${vfsName} already exists.`);
        return;
    }

    console.log(`[FETCHING] Metadata for ${gwfhId}...`);
    try {
        const initialRes = await fetch(`https://gwfh.mranftl.com/api/fonts/${gwfhId}`);
        if (!initialRes.ok) {
            console.error(`Failed to fetch metadata for ${gwfhId} (Status ${initialRes.status})`);
            return;
        }

        const initialParsed = await initialRes.json();
        const allSubsets = initialParsed.subsets.join(",");

        console.log(`[FETCHING] Full subsets (${allSubsets}) for ${gwfhId}...`);
        const fullRes = await fetch(`https://gwfh.mranftl.com/api/fonts/${gwfhId}?subsets=${allSubsets}`);
        if (!fullRes.ok) {
            console.error(`Failed to fetch final TTF url for ${gwfhId}`);
            return;
        }

        const parsed = await fullRes.json();
        const variant = parsed.variants.find(v => v.id === "regular" || v.id === "400") || parsed.variants[0];

        if (!variant || !variant.ttf) {
            console.error(`No TTF link found for ${gwfhId}`);
            return;
        }

        console.log(`[DOWNLOADING] TTF for ${gwfhId}...`);
        const ttfRes = await fetch(variant.ttf);

        if (!ttfRes.ok) {
            console.error(`Failed TTF fetch for ${gwfhId} (Status ${ttfRes.status})`);
            return;
        }

        const buffer = await ttfRes.arrayBuffer();
        fs.writeFileSync(destPath, Buffer.from(buffer));
        console.log(`[SUCCESS] Saved ${vfsName}`);

    } catch (e) {
        console.error(`Error processing ${gwfhId}:`, e.message);
    }
};

const run = async () => {
    console.log("Starting Universal PDF Font Downloads...");
    for (const font of TARGET_FONTS) {
        await downloadFont(font.gwfhId, font.vfsName);
    }
    console.log("Downloads Complete!");
};

run();
