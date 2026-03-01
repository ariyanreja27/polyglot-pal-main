import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Sparkles, BookOpen, Volume2, Type, Tag as TagIcon, TextIcon, Languages, Activity, BarChart, BookmarkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateAIContent } from "@/lib/ai-service";
import { handleError } from "@/lib/error-handler";

/**
 * WordForm Component
 * 
 * Provides a specialized form for creating and editing vocabulary words. It integrates
 * directly with Supabase for data persistence and a generative AI service to auto-fill
 * word details like type, pronunciation, meaning, and examples.
 * 
 * Features:
 * - Smart AI autofill based on the target word and language.
 * - Dynamic form for core attributes (Classification, Phonetics, Meaning).
 * - Contextual usage tracking (Examples, Translations, Notes).
 * - Learning system metadata (Tags, Status tracking).
 * 
 * @component
 * @example
 * // Rendered typically by a router with URL parameters:
 * // /language/:languageId/add or /word/:wordId/edit
 * <WordForm />
 * 
 * @returns {JSX.Element} The rendered form interface for vocabulary entry.
 */
export default function WordForm() {
    const { languageId, wordId } = useParams<{ languageId?: string; wordId?: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const isEdit = !!wordId;

    const [word, setWord] = useState("");
    const [type, setType] = useState<string>("");
    const [pronunciation, setPronunciation] = useState("");

    // Restored fields
    const [meaning, setMeaning] = useState("");
    const [exSentence, setExSentence] = useState("");
    const [exTranslation, setExTranslation] = useState("");
    const [tags, setTags] = useState("");
    const [status, setStatus] = useState("new");
    const [notes, setNotes] = useState("");

    const [isGenerating, setIsGenerating] = useState(false);
    const [languageName, setLanguageName] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [effectiveLangId] = useState(languageId || "");

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const initForm = async () => {
            if (languageId) {
                const { data: lang } = await supabase.from("languages").select("name").eq("id", languageId).single();
                if (lang) setLanguageName(lang.name);
            }

            if (isEdit && wordId) {
                const { data: w } = await supabase.from("words").select("*").eq("id", wordId).single();
                if (!w) return;

                if (w.language_id) {
                    const { data: lang } = await supabase.from("languages").select("name").eq("id", w.language_id).single();
                    if (lang) setLanguageName(lang.name);
                }

                setWord(w.word);
                setType(w.type || "");
                setPronunciation(w.pronunciation || "");
                setNotes(w.notes || "");
                setStatus(w.status);

                const { data: m } = await supabase.from("meanings").select("meaning").eq("word_id", wordId).order("created_at");
                if (m && m.length > 0) setMeaning(m.map((x) => x.meaning).join(", "));

                const { data: ex } = await supabase.from("examples").select("sentence, sentence_meaning").eq("word_id", wordId).limit(1);
                if (ex?.[0]) { setExSentence(ex[0].sentence); setExTranslation(ex[0].sentence_meaning || ""); }

                const { data: wt } = await supabase.from("word_tags").select("tag_id").eq("word_id", wordId);
                if (wt && wt.length > 0) {
                    const { data: t } = await supabase.from("tags").select("name").in("id", wt.map((x) => x.tag_id));
                    if (t) setTags(t.map((x) => x.name).join(", "));
                }
            }
        };
        initForm();
    }, [wordId, languageId, isEdit]);

    /**
     * Triggers the AI content generation service to auto-fill word details.
     * Uses the current `word` and `languageName` to fetch structured data (type, pronunciation, notes, etc.)
     * and updates form state with the generated content. Does not overwrite existing non-empty fields.
     * 
     * @async
     * @function handleAIGenerate
     * @returns {Promise<void>}
     */
    const handleAIGenerate = async () => {
        if (!word.trim()) {
            toast({ title: "Entry Required", description: "Please enter a word first.", variant: "destructive" });
            return;
        }
        setIsGenerating(true);
        try {
            const data = await generateAIContent(word, languageName);
            if (data.type) setType(data.type);
            if (data.pronunciation && !pronunciation) setPronunciation(data.pronunciation);
            if (data.notes && !notes) setNotes(data.notes);
            if (data.meaning && !meaning) setMeaning(data.meaning);
            if (data.example?.sentence && !exSentence) {
                setExSentence(data.example.sentence);
                setExTranslation(data.example.translation || "");
            }
            if (data.tags && data.tags.length > 0 && !tags) setTags(data.tags.join(", "));
            toast({ title: "AI Generation Complete" });
        } catch (error: any) {
            handleError(error, { title: "Generation failed" });
        } finally {
            setIsGenerating(false);
        }
    };

    /**
     * Handles the form submission to save or update the word entry.
     * Manages complex relational saves, including updating the core word,
     * inserting/deleting multiple meanings, examples, and tags in Supabase.
     * 
     * @async
     * @function handleSave
     * @param {React.FormEvent} e - The form submission event.
     * @returns {Promise<void>}
     */
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || (!effectiveLangId && !isEdit) || !word.trim()) return;
        setIsSaving(true);
        try {
            let savedWordId = wordId;

            if (isEdit && wordId) {
                await supabase.from("words").update({
                    word: word.trim(), type: type || null, pronunciation: pronunciation.trim() || null,
                    notes: notes.trim() || null, status
                }).eq("id", wordId);
            } else {
                const { data, error } = await supabase.from("words").insert({
                    user_id: user.id, language_id: effectiveLangId, word: word.trim(),
                    type: type || null, pronunciation: pronunciation.trim() || null,
                    notes: notes.trim() || null, status
                }).select("id").single();
                if (error) throw error;
                savedWordId = data.id;
            }

            if (!savedWordId) throw new Error("Failed to secure active word ID for relational saves.");

            // Handle meaning
            if (meaning.trim()) {
                const meaningItems = meaning.split(",").map((m) => m.trim()).filter(Boolean);
                if (meaningItems.length > 0) {
                    if (isEdit) {
                        await supabase.from("meanings").delete().eq("word_id", savedWordId);
                    }
                    const meaningInserts = meaningItems.map((m) => ({ word_id: savedWordId, meaning: m }));
                    await supabase.from("meanings").insert(meaningInserts);
                }
            } else if (isEdit) {
                await supabase.from("meanings").delete().eq("word_id", savedWordId);
            }

            // Handle example
            if (exSentence.trim()) {
                if (isEdit) {
                    const { data: existing } = await supabase.from("examples").select("id").eq("word_id", savedWordId).limit(1);
                    if (existing?.[0]) await supabase.from("examples").update({ sentence: exSentence.trim(), sentence_meaning: exTranslation.trim() || null }).eq("id", existing[0].id);
                    else await supabase.from("examples").insert({ word_id: savedWordId, sentence: exSentence.trim(), sentence_meaning: exTranslation.trim() || null });
                } else await supabase.from("examples").insert({ word_id: savedWordId, sentence: exSentence.trim(), sentence_meaning: exTranslation.trim() || null });
            }

            // Handle tags
            if (tags.trim()) {
                if (isEdit) await supabase.from("word_tags").delete().eq("word_id", savedWordId);
                const tagNames = tags.split(",").map((t) => t.trim()).filter(Boolean);
                for (const name of tagNames) {
                    let { data: existing } = await supabase.from("tags").select("id").eq("name", name).eq("user_id", user.id).single();
                    let tagId: string;
                    if (existing) tagId = existing.id;
                    else {
                        const { data: created } = await supabase.from("tags").insert({ name, user_id: user.id }).select("id").single();
                        if (!created) continue;
                        tagId = created.id;
                    }
                    await supabase.from("word_tags").insert({ word_id: savedWordId, tag_id: tagId });
                }
            }

            toast({ title: isEdit ? "Word updated" : "Word added" });
            navigate(-1);
        } catch (error: any) {
            handleError(error, { title: "Database Error" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-background font-sans text-foreground">
            {/* HEADER */}
            <header className="sticky top-0 z-50 w-full px-4 sm:px-6 h-16 sm:h-20 flex items-center bg-background/90 backdrop-blur-md border-b border-border">
                <div className="container max-w-5xl mx-auto flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-black/5 hover:text-black">
                        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold tracking-tighter truncate leading-none pt-1">
                        {wordId ? "Edit Entry" : "New Entry"}
                    </h1>
                    <div className="w-10" /> {/* Spacer for centering */}
                </div>
            </header>

            <main className="container max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
                <form onSubmit={handleSave} className="space-y-6 sm:space-y-10 flex flex-col pb-10">

                    {/* PRIMARY INPUT & AI BURST */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-full border border-border shadow-sm">
                        <div className="flex-1 flex items-center gap-4">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
                            </div>
                            <Input
                                value={word}
                                onChange={(e) => setWord(e.target.value)}
                                placeholder="Enter Word"
                                className="h-14 sm:h-16 flex-1 rounded-none bg-transparent border-0 focus-visible:ring-0 px-0 text-3xl sm:text-4xl lg:text-5xl font-serif font-bold placeholder:text-muted-foreground/40 shadow-none hover:bg-transparent"
                                required
                            />
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleAIGenerate}
                            disabled={isGenerating || !word.trim()}
                            className="nothing-pill w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 bg-transparent border-border text-xs sm:text-sm font-bold tracking-widest gap-2 hover:bg-black hover:text-white transition-all whitespace-nowrap"
                        >
                            <Sparkles className={cn("h-4 w-4 sm:h-5 sm:w-5", isGenerating && "animate-spin")} />
                            {isGenerating ? "Generating..." : "Auto Fill"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
                        {/* LEFT COLUMN: Core & Learning */}
                        <div className="space-y-6 sm:space-y-10">
                            {/* PROPERTIES */}
                            <div className="space-y-6 sm:space-y-8 nothing-card p-6 sm:p-10">
                                <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                                    <h3 className="text-sm sm:text-base font-bold uppercase tracking-[0.2em] text-black">Core Attributes</h3>
                                </div>

                                <div className="space-y-4 sm:space-y-6">
                                    {/* PART OF SPEECH */}
                                    <div className="space-y-3 sm:space-y-4">
                                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                            <Type className="h-3 w-3 sm:h-4 sm:w-4" /> Classification
                                        </label>
                                        <Select value={type} onValueChange={setType}>
                                            <SelectTrigger className={cn(
                                                "h-14 sm:h-16 rounded-full bg-background border-border text-sm sm:text-base font-bold focus:ring-1 focus:ring-black px-6 shadow-none",
                                                !type ? "text-muted-foreground" : "text-black"
                                            )}>
                                                <SelectValue placeholder="Select Type" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card border-border rounded-xl font-bold uppercase">
                                                <SelectItem value="noun">NOUN</SelectItem>
                                                <SelectItem value="verb">VERB</SelectItem>
                                                <SelectItem value="adjective">ADJECTIVE</SelectItem>
                                                <SelectItem value="adverb">ADVERB</SelectItem>
                                                <SelectItem value="pronoun">PRONOUN</SelectItem>
                                                <SelectItem value="preposition">PREPOSITION</SelectItem>
                                                <SelectItem value="conjunction">CONJUNCTION</SelectItem>
                                                <SelectItem value="interjection">INTERJECTION</SelectItem>
                                                <SelectItem value="determiner">DETERMINER</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* PRONUNCIATION */}
                                    <div className="space-y-3 sm:space-y-4">
                                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                            <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" /> Phonetics
                                        </label>
                                        <Input
                                            value={pronunciation}
                                            onChange={(e) => setPronunciation(e.target.value)}
                                            placeholder="Enter IPA"
                                            className="h-14 sm:h-16 rounded-full bg-background border-border text-sm sm:text-base font-medium px-6 focus-visible:ring-1 focus-visible:ring-black"
                                        />
                                    </div>

                                    {/* MEANING */}
                                    <div className="space-y-3 sm:space-y-4 border-t border-border/60 pt-6">
                                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                            <TextIcon className="h-3 w-3 sm:h-4 sm:w-4" /> Meaning
                                        </label>
                                        <Input
                                            value={meaning}
                                            onChange={(e) => setMeaning(e.target.value)}
                                            placeholder="Primary Translation"
                                            className="h-14 sm:h-16 rounded-full bg-background border-border text-sm sm:text-base font-medium px-6 focus-visible:ring-1 focus-visible:ring-black"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* EXAMPLES */}
                            <div className="space-y-6 sm:space-y-8 nothing-card p-6 sm:p-10">
                                <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                                    <h3 className="text-sm sm:text-base font-bold uppercase tracking-[0.2em] text-black">Contextual Usage</h3>
                                </div>

                                <div className="space-y-4 sm:space-y-6">
                                    <div className="space-y-3 sm:space-y-4">
                                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                            <Languages className="h-3 w-3 sm:h-4 sm:w-4" /> Example Sentence
                                        </label>
                                        <Textarea
                                            value={exSentence}
                                            onChange={(e) => setExSentence(e.target.value)}
                                            placeholder="Sentence in Target Language"
                                            className="min-h-[100px] rounded-[1.5rem] bg-background border-border text-sm sm:text-base font-medium p-4 sm:p-6 resize-none focus-visible:ring-1 focus-visible:ring-black"
                                        />
                                    </div>
                                    <div className="space-y-3 sm:space-y-4">
                                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                            <BookmarkIcon className="h-3 w-3 sm:h-4 sm:w-4" /> Translation
                                        </label>
                                        <Textarea
                                            value={exTranslation}
                                            onChange={(e) => setExTranslation(e.target.value)}
                                            placeholder="Sentence in English Translation"
                                            className="min-h-[100px] rounded-[1.5rem] bg-background border-border text-sm sm:text-base font-medium p-4 sm:p-6 resize-none focus-visible:ring-1 focus-visible:ring-black"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Tags, Status, Notes */}
                        <div className="space-y-6 sm:space-y-10 flex flex-col">
                            {/* SYSTEM METRICS */}
                            <div className="space-y-6 sm:space-y-8 nothing-card p-6 sm:p-10 h-fit">
                                <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                                    <h3 className="text-sm sm:text-base font-bold uppercase tracking-[0.2em] text-black">Learning Systems</h3>
                                </div>

                                <div className="space-y-4 sm:space-y-6">
                                    <div className="space-y-3 sm:space-y-4">
                                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                            <Activity className="h-3 w-3 sm:h-4 sm:w-4" /> Status
                                        </label>
                                        <Select value={status} onValueChange={setStatus}>
                                            <SelectTrigger className="h-14 sm:h-16 rounded-full bg-background border-border text-[9px] sm:text-[10px] font-bold uppercase focus:ring-1 focus:ring-black px-4 sm:px-6 shadow-none">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card border-border rounded-xl font-bold uppercase">
                                                <SelectItem value="new">ACTIVE</SelectItem>
                                                <SelectItem value="mastered">LEARNED</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-3 sm:space-y-4 border-t border-border/60 pt-6">
                                    <label className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                        <TagIcon className="h-3 w-3 sm:h-4 sm:w-4" /> Tags Component
                                    </label>
                                    <Input
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        placeholder="Comma separated (e.g., formal, idiom)"
                                        className="h-14 sm:h-16 rounded-full bg-background border-border text-sm sm:text-base font-medium px-6 focus-visible:ring-1 focus-visible:ring-black"
                                    />
                                </div>
                            </div>

                            {/* NOTES & SAVING */}
                            <div className="space-y-6 sm:space-y-8 nothing-card p-6 sm:p-10 flex flex-col flex-1">
                                <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                                    <h3 className="text-sm sm:text-base font-bold uppercase tracking-[0.2em] text-black">Context & Notes</h3>
                                </div>

                                <div className="space-y-3 sm:space-y-4 flex-1 flex flex-col">
                                    <label className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                        <TextIcon className="h-3 w-3 sm:h-4 sm:w-4" /> Annotation
                                    </label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Etymology, Mnemonics, Quirks etc."
                                        className="min-h-[160px] sm:min-h-[220px] h-full rounded-[1.5rem] bg-background border-border text-sm sm:text-base font-medium p-4 sm:p-6 resize-none focus-visible:ring-1 focus-visible:ring-black flex-1"
                                    />
                                </div>

                                {/* ACTION BAR - Integrated directly into layout */}
                                <div className="pt-8 w-full mt-auto">
                                    <Button
                                        type="submit"
                                        disabled={isSaving || !word.trim()}
                                        className="nothing-pill w-full h-16 sm:h-20 bg-accent hover:bg-black text-white px-10 sm:px-16 text-sm sm:text-lg font-bold tracking-[0.25em] sm:tracking-[0.3em] shadow-[0_8px_40px_0_rgba(230,43,43,0.3)] hover:shadow-[0_8px_40px_0_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all"
                                    >
                                        <span className="" /> {isSaving ? "Compiling..." : "SAVE"}
                                    </Button>
                                </div>
                            </div>

                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
