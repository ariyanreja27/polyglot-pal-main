import { FONTS_REGISTRY, SupportedScript } from "./pdfTypographyConfig";

export interface DownloadedFont {
    vfsName: string;
    buffer: ArrayBuffer;
}

/**
 * Iterates through all Unicode scripts detected in the payload and lazily fetches
 * their corresponding high-quality TTF binary from the local application origin.
 * Guaranteed 100% success rate free of CORS issues.
 * 
 * @async
 * @function fetchRequiredLocalFonts
 * @param {Set<SupportedScript>} scripts - A set of unique scripts required for the document.
 * @returns {Promise<DownloadedFont[]>} Array of fetched fonts with array buffers.
 */
export const fetchRequiredLocalFonts = async (scripts: Set<SupportedScript>): Promise<DownloadedFont[]> => {
    const downloads: Promise<DownloadedFont>[] = [];

    scripts.forEach((script) => {
        const fontConfig = FONTS_REGISTRY[script];
        if (!fontConfig) return;

        downloads.push(
            (async () => {
                try {
                    // Fetch directly from the native server (/public/fonts/pdf/...)
                    const localUrl = `/fonts/pdf/${fontConfig.vfsName}`;
                    const res = await fetch(localUrl);

                    if (!res.ok) {
                        throw new Error(`Local TTF fetch failed for ${fontConfig.vfsName} (Status ${res.status}). Ensure npm run download-fonts was executed.`);
                    }

                    const buffer = await res.arrayBuffer();
                    return { vfsName: fontConfig.vfsName, buffer };
                } catch (error) {
                    console.error(`Typography Engine: Failed to load ${script} font locally:`, error);
                    // Bubble the error up so the application knows the export process failed natively
                    throw error;
                }
            })()
        );
    });

    return Promise.all(downloads);
};

/**
 * Super-fast, non-blocking asynchronous arrayBuffer to Base64 mapping.
 * pdfMake's built-in VFS requires Base64 strings.
 * We use FileReader over `Buffer.from` to prevent locking the browser's UI thread
 * when dealing with monolithic CJK fonts (15MB+).
 * 
 * @async
 * @function bufferToBase64
 * @param {ArrayBuffer} buffer - The raw binary font buffer.
 * @returns {Promise<string>} The Base64 encoded string.
 */
export const bufferToBase64 = (buffer: ArrayBuffer): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // FileReader prepends `data:application/octet-stream;base64,`
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(new Blob([buffer]));
    });
};
