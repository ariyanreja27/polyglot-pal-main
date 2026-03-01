import { supabase } from "@/integrations/supabase/client";
import { getScriptFromText } from "./pdfTypographyConfig";
import { fetchRequiredLocalFonts, bufferToBase64 } from "./fontLoader";
import { generateDocumentDefinition, RenderData } from "./tableRenderer";

/**
 * Controller to fetch user data, initialize PDF libraries securely, load fonts,
 * and download the final vectorized, script-accurate PDF document.
 * 
 * @async
 * @function startPdfExport
 * @param {string} userId - The unique identifier of the user exporting data.
 * @param {string} userEmail - The user's email for the document header.
 * @returns {Promise<Blob>} A Blob representing the generated PDF file.
 */
export const startPdfExport = async (userId: string, userEmail: string): Promise<Blob> => {
    try {
        // 1. Initialize pdfMake modules
        const pdfMakeModule = await import("pdfmake/build/pdfmake");
        const pdfMake = pdfMakeModule.default || pdfMakeModule;

        // 2. Fetch User Data
        const { data: langs } = await supabase.from("languages").select("*").eq("user_id", userId);
        const { data: words } = await supabase.from("words").select("*").eq("user_id", userId);
        const wordIds = (words ?? []).map((w: any) => w.id);

        const { data: meanings } = wordIds.length
            ? await supabase.from("meanings").select("*").in("word_id", wordIds)
            : { data: [] };

        const { data: examples } = wordIds.length
            ? await supabase.from("examples").select("*").in("word_id", wordIds)
            : { data: [] };

        const safeLangs = langs || [];
        const safeWords = words || [];
        const safeMeanings = meanings || [];
        const safeExamples = examples || [];

        // 3. Scan payload to determine which scripts (fonts) are actually required
        const requiredScripts = new Set<string>(["Default"]);

        safeWords.forEach((w: any) => {
            requiredScripts.add(getScriptFromText(w.word));
            const firstEx = safeExamples.find((e: any) => e.word_id === w.id);
            if (firstEx?.sentence) {
                requiredScripts.add(getScriptFromText(firstEx.sentence));
            }
        });

        // 4. Load only the necessary local fonts into the Virtual File System dictionary
        const customFonts = await fetchRequiredLocalFonts(requiredScripts as unknown as Set<any>);

        const vfs: Record<string, string> = {};
        for (const cf of customFonts) {
            const base64Str = await bufferToBase64(cf.buffer);
            vfs[cf.vfsName] = base64Str;
        }

        // 5. Structure data for renderer
        const renderData: RenderData = {
            userEmail,
            languages: safeLangs,
            words: safeWords,
            meanings: safeMeanings,
            examples: safeExamples
        };

        // 6. Generate Definition
        const docDefinition = generateDocumentDefinition(renderData, requiredScripts);

        if (typeof (pdfMake as any).addVirtualFileSystem === 'function') {
            (pdfMake as any).addVirtualFileSystem(vfs);
        } else {
            (pdfMake as any).vfs = vfs;
            (pdfMake as any).virtualfs = vfs;
        }

        if (typeof (pdfMake as any).setFonts === 'function') {
            (pdfMake as any).setFonts(docDefinition.fonts);
        } else {
            (pdfMake as any).fonts = docDefinition.fonts;
        }

        console.log("INJECTED VFS KEYS:", Object.keys(vfs));
        console.log("GENERATION FONTS:", Object.keys(docDefinition.fonts || {}));

        // 7. Fire pure-vector PDF creation
        const pdf = (pdfMake as any).createPdf(docDefinition);
        const blob = await pdf.getBlob();
        return blob as Blob;

    } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};
