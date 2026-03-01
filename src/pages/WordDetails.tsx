import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Plus, Trash2, Pencil, Sparkles, X, Check, BookOpen, MessageSquare, StickyNote, Tag as TagIcon, Volume2, Copy, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateAIContent } from "@/lib/ai-service";
import { handleError } from "@/lib/error-handler";

interface Meaning { id: string; meaning: string; auto_generated: boolean; }
interface Example { id: string; sentence: string; sentence_meaning: string | null; auto_generated: boolean; }
interface Tag { id: string; name: string; }

/**
 * WordDetails Component
 * 
 * Displays a comprehensive view of a specific vocabulary word. Features a rich UI for
 * exploring the word's definitions, examples, status, notes, and tags.
 * Integrates an "AI Fill" functionality to auto-generate missing contextual content.
 * 
 * Functions provided within the UI:
 * - Pronunciation listening & copy-to-clipboard.
 * - Marking as Favorite or modifying Learning Status.
 * - Adding/deleting specific meanings, examples, or tags.
 * 
 * @component
 * @example
 * // Typically rendered as a route component requiring :wordId:
 * // <Route path="/word/:wordId" element={<WordDetails />} />
 * <WordDetails />
 * 
 * @returns {JSX.Element} The rendered detailed view of a single vocabulary entry.
 */
export default function WordDetails() {
    const { wordId } = useParams<{ wordId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [word, setWord] = useState<any>(null);
    const [meanings, setMeanings] = useState<Meaning[]>([]);
    const [examples, setExamples] = useState<Example[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [copied, setCopied] = useState(false);
    /**
     * Copies the current word to the user's system clipboard using modern Clipboard API
     * with a fallback to the legacy document.execCommand approach.
     * Temporarily sets a "copied" state for visual feedback.
     * 
     * @async
     * @function handleCopyWord
     * @returns {Promise<void>}
     */
    const handleCopyWord = async () => {
        if (!word?.word) return;
        try {
            const text = String(word.word);

            const tryModernClipboard = async () => {
                if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
                if (!window.isSecureContext) throw new Error("Insecure context");
                await navigator.clipboard.writeText(text);
            };

            const tryLegacyCopy = async () => {
                const el = document.createElement("textarea");
                el.value = text;
                el.setAttribute("readonly", "");
                el.style.position = "fixed";
                el.style.left = "-9999px";
                el.style.top = "0";
                document.body.appendChild(el);
                el.select();
                const ok = document.execCommand("copy");
                document.body.removeChild(el);
                if (!ok) throw new Error("execCommand copy failed");
            };

            try {
                await tryModernClipboard();
            } catch {
                await tryLegacyCopy();
            }

            setCopied(true);
            window.setTimeout(() => setCopied(false), 1000);
        } catch (error: any) {
            handleError(error, {
                title: "Copy failed",
                description: "Your browser blocked clipboard access. Try using HTTPS or allow clipboard permission."
            });
        }
    };
    const [notes, setNotes] = useState("");
    const [newMeaning, setNewMeaning] = useState("");
    const [newSentence, setNewSentence] = useState("");
    const [newTranslation, setNewTranslation] = useState("");
    const [newTag, setNewTag] = useState("");
    const [meaningDialogOpen, setMeaningDialogOpen] = useState(false);
    const [exampleDialogOpen, setExampleDialogOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isGeneratingContent, setIsGeneratingContent] = useState(false);

    /**
     * Fetches the comprehensive data for the word including its related entities:
     * meanings, examples, and tags, directly from Supabase.
     * Updates local state and clears the loading indicator.
     * 
     * @async
     * @function fetchWord
     * @returns {Promise<void>}
     */
    const fetchWord = async () => {
        if (!wordId || !user) return;
        try {
            const { data: w, error: wError } = await supabase.from("words").select("*, languages(name)").eq("id", wordId).single();
            if (wError) throw wError;
            if (!w) { navigate("/"); return; }
            setWord(w);
            setNotes(w.notes || "");

            const { data: m, error: mError } = await supabase.from("meanings").select("*").eq("word_id", wordId).order("created_at");
            if (mError) throw mError;
            setMeanings(m || []);

            const { data: ex, error: exError } = await supabase.from("examples").select("*").eq("word_id", wordId).order("created_at");
            if (exError) throw exError;
            setExamples(ex || []);

            const { data: wt, error: wtError } = await supabase.from("word_tags").select("tag_id").eq("word_id", wordId);
            if (wtError) throw wtError;

            if (wt && wt.length > 0) {
                const { data: t, error: tError } = await supabase.from("tags").select("*").in("id", wt.map((x) => x.tag_id));
                if (tError) throw tError;
                setTags(t || []);
            } else {
                setTags([]);
            }
        } catch (error) {
            handleError(error, { title: "Fetch Failed" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchWord();
    }, [wordId, user]);

    const updateField = async (field: string, value: any) => {
        try {
            const { error } = await supabase.from("words").update({ [field]: value }).eq("id", wordId);
            if (error) throw error;
            setWord((prev: any) => ({ ...prev, [field]: value }));
        } catch (error) {
            handleError(error, { title: "Update Failed" });
        }
    };

    const saveNotes = async () => {
        try {
            const { error } = await supabase.from("words").update({ notes }).eq("id", wordId);
            if (error) throw error;
            toast({ title: "Notes saved" });
        } catch (error) {
            handleError(error, { title: "Save Failed" });
        }
    };

    const addMeaning = async () => {
        if (!newMeaning.trim() || !wordId) return;
        try {
            const { error } = await supabase.from("meanings").insert({ word_id: wordId, meaning: newMeaning.trim() });
            if (error) throw error;
            setNewMeaning("");
            setMeaningDialogOpen(false);
            fetchWord();
        } catch (error) {
            handleError(error, { title: "Add Failed" });
        }
    };

    const deleteMeaning = async (id: string) => {
        try {
            const { error } = await supabase.from("meanings").delete().eq("id", id);
            if (error) throw error;
            setMeanings((prev) => prev.filter((m) => m.id !== id));
        } catch (error) {
            handleError(error, { title: "Delete Failed" });
        }
    };

    const addExample = async () => {
        if (!newSentence.trim() || !wordId) return;
        try {
            const { error } = await supabase.from("examples").insert({ word_id: wordId, sentence: newSentence.trim(), sentence_meaning: newTranslation.trim() || null });
            if (error) throw error;
            setNewSentence(""); setNewTranslation("");
            setExampleDialogOpen(false);
            fetchWord();
        } catch (error) {
            handleError(error, { title: "Add Failed" });
        }
    };

    const deleteExample = async (id: string) => {
        try {
            const { error } = await supabase.from("examples").delete().eq("id", id);
            if (error) throw error;
            setExamples((prev) => prev.filter((e) => e.id !== id));
        } catch (error) {
            handleError(error, { title: "Delete Failed" });
        }
    };

    const addTag = async () => {
        if (!newTag.trim() || !user || !wordId) return;
        try {
            let { data: existing, error: eError } = await supabase.from("tags").select("id").eq("name", newTag.trim()).eq("user_id", user.id).single();
            if (eError && eError.code !== 'PGRST116') throw eError;

            let tagId: string;
            if (existing) tagId = existing.id;
            else {
                const { data: created, error: cError } = await supabase.from("tags").insert({ name: newTag.trim(), user_id: user.id }).select("id").single();
                if (cError) throw cError;
                if (!created) return;
                tagId = created.id;
            }
            const { error: linkError } = await supabase.from("word_tags").insert({ word_id: wordId, tag_id: tagId });
            if (linkError) throw linkError;
            setNewTag("");
            fetchWord();
        } catch (error) {
            handleError(error, { title: "Tag Update Failed" });
        }
    };

    const removeTag = async (tagId: string) => {
        if (!wordId) return;
        try {
            const { error } = await supabase.from("word_tags").delete().eq("word_id", wordId).eq("tag_id", tagId);
            if (error) throw error;
            setTags((prev) => prev.filter((t) => t.id !== tagId));
        } catch (error) {
            handleError(error, { title: "Remove Failed" });
        }
    };

    const deleteWord = async () => {
        if (!wordId) return;
        try {
            const { error } = await supabase.from("words").delete().eq("id", wordId);
            if (error) throw error;
            navigate(-1);
        } catch (error) {
            handleError(error, { title: "Delete Failed" });
        }
    };

    /**
     * Triggers the AI service to fill in any missing information for the current word
     * (e.g., word type, meanings, examples, notes, tags) and saves the generated 
     * content directly to the database.
     * 
     * @async
     * @function handleAIFill
     * @returns {Promise<void>}
     */
    const handleAIFill = async () => {
        if (!wordId || !word) return;
        setIsGeneratingContent(true);
        try {
            const languageName = word.languages?.name;
            const data = await generateAIContent(word.word, languageName);
            let generatedAnything = false;

            if (!word.type && data.type) {
                await updateField("type", data.type);
                generatedAnything = true;
            }

            if (meanings.length === 0) {
                await supabase.from("meanings").insert({ word_id: wordId, meaning: data.meaning, auto_generated: true });
                generatedAnything = true;
            }

            if (examples.length === 0) {
                await supabase.from("examples").insert({ word_id: wordId, sentence: data.example.sentence, sentence_meaning: data.example.translation, auto_generated: true });
                generatedAnything = true;
            }

            if (!notes.trim()) {
                const updatedNotes = data.notes;
                setNotes(updatedNotes);
                await supabase.from("words").update({ notes: updatedNotes }).eq("id", wordId);
                generatedAnything = true;
            }

            if (tags.length === 0) {
                for (const tagName of data.tags) {
                    let { data: existing } = await supabase.from("tags").select("id").eq("name", tagName).eq("user_id", user!.id).single();
                    let tagId: string;
                    if (existing) tagId = existing.id;
                    else {
                        const { data: created } = await supabase.from("tags").insert({ name: tagName, user_id: user!.id }).select("id").single();
                        if (!created) continue;
                        tagId = created.id;
                    }
                    await supabase.from("word_tags").insert({ word_id: wordId, tag_id: tagId });
                }
                generatedAnything = true;
            }

            if (generatedAnything) {
                toast({ title: "AI Generation Complete" });
                fetchWord();
            } else {
                toast({ title: "Already Complete" });
            }
        } catch (error: any) {
            handleError(error, { title: "Generation Failed" });
        } finally {
            setIsGeneratingContent(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center gap-6">
                <div className="h-10 w-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
                <p className="dot-text">Loading...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pb-32 bg-background font-sans text-foreground">
            {/* HEADER */}
            <header className="sticky top-0 z-50 w-full px-4 sm:px-6 h-16 sm:h-20 flex items-center bg-background/90 backdrop-blur-md border-b border-border">
                <div className="container max-w-7xl mx-auto flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-black/5">
                        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAIFill}
                            disabled={isGeneratingContent}
                            className="nothing-pill h-10 sm:h-12 px-4 sm:px-6 gap-2 border-border text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                        >
                            <Sparkles className={cn("h-3 w-3 sm:h-4 sm:w-4", isGeneratingContent && "animate-spin")} />
                            {isGeneratingContent ? "GENERATING" : "AI FILL"}
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateField("is_favorite", !word.is_favorite)}
                            className={cn("nothing-pill h-10 w-10 sm:h-12 sm:w-12 transition-all border-border", word.is_favorite ? "bg-amber-50 border-amber-500 text-amber-500" : "hover:bg-black/5")}
                        >
                            <Star className={cn("h-4 w-4 sm:h-5 sm:w-5", word.is_favorite && "fill-current")} />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-16 space-y-12 sm:space-y-20">

                {/* HERO SECTION */}
                <section className="text-center space-y-4 sm:space-y-8">
                    <Badge className="bg-black/5 text-black border border-border rounded-[1rem] sm:rounded-[1.25rem] px-5 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase hover:bg-black/10 transition-colors shadow-none">
                        {word.type || "ENTRY"}
                    </Badge>

                    <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
                        <h1 className="text-5xl sm:text-7xl md:text-[6rem] lg:text-[8rem] font-serif font-bold tracking-tight leading-none text-black break-words">
                            {word.word}
                        </h1>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCopyWord}
                            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-border transition-colors inline-flex items-center justify-center active:scale-95 hover:bg-transparent hover:text-current"
                            aria-label="Copy word"
                        >
                            {copied ? (
                                <Check className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 transition-transform duration-200 scale-110" />
                            ) : (
                                <Copy className="h-5 w-5 sm:h-6 sm:w-6" />
                            )}
                        </Button>
                    </div>

                    {word.pronunciation && (
                        <div className="flex items-center justify-center gap-3 sm:gap-4 pt-4">
                            <span className="font-sans font-medium text-[13px] sm:text-[15px] text-muted-foreground/80 px-4 py-2 border border-border rounded-[1.5rem] sm:rounded-[1.25rem] tracking-wide">
                                {word.pronunciation}
                            </span>
                            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border border-border hover:bg-black hover:text-white transition-colors shrink-0">
                                <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                        </div>
                    )}
                </section>

                {/* BENTO GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">

                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-8 space-y-6 sm:space-y-8">

                        {/* STATUS TOGGLE */}
                        <div className="nothing-card overflow-hidden">
                            {/* HEADER */}
                            <div className="p-6 sm:p-8 flex items-center justify-between border-b border-border/30">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/5 flex items-center justify-center">
                                        <Activity className="h-4 w-4 sm:h-6 sm:w-6 text-black" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight uppercase">Status</h2>
                                </div>
                            </div>

                            {/* BODY */}
                            <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center justify-between sm:justify-center gap-6 bg-background p-4 rounded-full border border-border w-full sm:w-auto">
                                    <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-all", word.status === "new" ? "text-accent" : "text-muted-foreground")}>Active</span>
                                    <Switch
                                        checked={word.status === "mastered"}
                                        onCheckedChange={(checked) => updateField("status", checked ? "mastered" : "new")}
                                        className="data-[state=checked]:bg-black data-[state=unchecked]:bg-accent"
                                    />
                                    <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-all", word.status === "mastered" ? "text-black" : "text-muted-foreground")}>Learned</span>
                                </div>
                            </div>
                        </div>

                        {/* DEFINITIONS SECTION */}
                        <div className="nothing-card overflow-hidden">
                            {/* HEADER */}
                            <div className="p-6 sm:p-8 flex items-center justify-between border-b border-border/30">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/5 flex items-center justify-center">
                                        <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 text-black" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight uppercase">Meanings</h2>
                                </div>

                                <Dialog open={meaningDialogOpen} onOpenChange={setMeaningDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-border hover:bg-black hover:text-white transition-colors">
                                            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-card rounded-[2rem] border-border sm:p-10 p-6">
                                        <DialogHeader><DialogTitle className="text-xl sm:text-2xl font-serif font-bold uppercase tracking-tighter">Add Meaning</DialogTitle></DialogHeader>
                                        <div className="space-y-6 pt-6">
                                            <Input value={newMeaning} onChange={(e) => setNewMeaning(e.target.value)} placeholder="Definition" className="h-14 sm:h-16 rounded-full bg-background border-border focus:border-black font-medium px-6 text-sm sm:text-base" onKeyDown={(e) => e.key === 'Enter' && addMeaning()} />
                                            <Button onClick={addMeaning} className="nothing-pill w-full h-14 sm:h-16 bg-black text-white font-bold uppercase tracking-widest text-xs sm:text-sm">Save</Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {/* BODY */}
                            <div>
                                {meanings.length === 0 ? (
                                    <div className="p-12 sm:p-20 text-center flex flex-col items-center gap-4 opacity-40">
                                        <button
                                            type="button"
                                            onClick={() => setMeaningDialogOpen(true)}
                                            className="h-12 w-12 rounded-full border border-dashed border-current flex items-center justify-center cursor-pointer hover:opacity-70 active:scale-95 transition"
                                            aria-label="Add meaning"
                                        >
                                            <Plus className="h-5 w-5" />
                                        </button>
                                        <p className="text-xs font-bold uppercase tracking-widest">No Definitions Added</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/30">
                                        {meanings.map((m) => (
                                            <div key={m.id} className="group flex items-center justify-between p-6 sm:p-8 hover:bg-black/[0.01] transition-all">
                                                <div className="flex items-center gap-4 sm:gap-6">
                                                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-black" />
                                                    <div className="flex items-center gap-4">
                                                        <p className="text-lg sm:text-xl font-bold text-black">{m.meaning}</p>
                                                        {m.auto_generated && (
                                                            <Badge variant="outline" className="rounded-full px-3 py-1 bg-black/5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest border-border/50 flex gap-1.5 items-center">
                                                                <Sparkles className="h-3 w-3" /> AI
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full text-muted-foreground/40 hover:text-accent hover:bg-accent/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0" onClick={() => deleteMeaning(m.id)}>
                                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* EXAMPLES SECTION */}
                        <div className="nothing-card overflow-hidden">
                            {/* HEADER */}
                            <div className="p-6 sm:p-8 flex items-center justify-between border-b border-border/30">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/5 flex items-center justify-center">
                                        <MessageSquare className="h-4 w-4 sm:h-6 sm:w-6 text-black" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-serif font-bold uppercase tracking-tighter">Examples</h2>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setExampleDialogOpen(true)}
                                    className="nothing-pill border-border bg-white hover:bg-black hover:text-white h-10 sm:h-12 px-6 sm:px-8 text-[10px] sm:text-xs font-bold uppercase tracking-widest"
                                >
                                    Add Example
                                </Button>
                            </div>

                            {/* BODY */}
                            <div>
                                {examples.length === 0 ? (
                                    <div className="p-12 sm:p-20 text-center flex flex-col items-center gap-4 opacity-40">
                                        <button
                                            type="button"
                                            onClick={() => setExampleDialogOpen(true)}
                                            className="h-12 w-12 rounded-full border border-dashed border-current flex items-center justify-center cursor-pointer hover:opacity-70 active:scale-95 transition"
                                            aria-label="Add example"
                                        >
                                            <Plus className="h-5 w-5" />
                                        </button>
                                        <p className="text-xs font-bold uppercase tracking-widest">No Contextual Evidence</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/30">
                                        {examples.map((ex, index) => (
                                            <div
                                                key={ex.id}
                                                className="p-6 sm:p-10 group/ex flex items-center justify-between gap-6 hover:bg-black/[0.01] transition-colors relative"
                                            >
                                                <div className="space-y-4 flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-black/40" />
                                                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                                                            Example {(index + 1).toString().padStart(2, '0')}
                                                        </span>
                                                    </div>
                                                    <p className="text-2xl sm:text-3xl font-serif font-bold text-black leading-tight tracking-tight">
                                                        {ex.sentence}
                                                    </p>
                                                    {ex.sentence_meaning && (
                                                        <div className="pt-2 border-l-2 border-border/40 pl-4">
                                                            <p className="text-base sm:text-lg font-medium text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-none">
                                                                {ex.sentence_meaning}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col items-end justify-center gap-3 shrink-0">
                                                    {ex.auto_generated && (
                                                        <Badge variant="outline" className="rounded-full px-3 py-1 bg-black/5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest border-border/50 flex gap-1.5 items-center">
                                                            <Sparkles className="h-3 w-3" /> AI
                                                        </Badge>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 rounded-full text-muted-foreground/40 hover:text-accent hover:bg-accent/10 transition-all"
                                                        onClick={() => deleteExample(ex.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-4 space-y-6 sm:space-y-8">

                        {/* NOTES section */}
                        <div className="nothing-card overflow-hidden">
                            {/* HEADER */}
                            <div className="p-6 sm:p-8 flex items-center justify-between border-b border-border/30">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/5 flex items-center justify-center">
                                        <StickyNote className="h-4 w-4 sm:h-6 sm:w-6 text-black" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight uppercase">Notes</h2>
                                </div>
                            </div>

                            {/* BODY */}
                            <div className="p-6 sm:p-8">
                                <div className="relative group">
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Write Notes"
                                        className="min-h-[200px] sm:min-h-[250px] bg-background border-border rounded-[1.5rem] p-4 sm:p-6 focus:ring-1 focus:ring-black transition-all text-xs sm:text-sm leading-relaxed resize-none"
                                    />
                                    <Button
                                        size="icon"
                                        onClick={saveNotes}
                                        className="nothing-pill absolute bottom-3 right-3 sm:bottom-4 sm:right-4 h-10 w-10 sm:h-12 sm:w-12 bg-black text-white hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-lg"
                                    >
                                        <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* TAGS section */}
                        <div className="nothing-card overflow-hidden">
                            {/* HEADER */}
                            <div className="p-6 sm:p-8 flex items-center justify-between border-b border-border/30">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/5 flex items-center justify-center">
                                        <TagIcon className="h-4 w-4 sm:h-6 sm:w-6 text-accent" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight uppercase">Tags</h2>
                                </div>
                            </div>

                            {/* BODY */}
                            <div className="p-6 sm:p-8 flex flex-wrap gap-2">
                                {tags.map((t) => (
                                    <Badge key={t.id} variant="secondary" className="bg-background border border-border px-4 py-2 sm:px-5 sm:py-2.5 rounded-[1rem] sm:rounded-[1.25rem] text-[8px] sm:text-[9px] font-bold tracking-[0.2em] uppercase group/tag h-auto">
                                        <span className="font-sans font-bold">{t.name}</span>
                                        <button onClick={() => removeTag(t.id)} className="ml-2 sm:ml-3 opacity-50 sm:opacity-20 group/tag:opacity-100 group-hover/tag:opacity-100 hover:text-accent transition-all animate-in fade-in zoom-in duration-200"><X className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></button>
                                    </Badge>
                                ))}
                                <div className="relative">
                                    <Input
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        placeholder="+"
                                        className="h-[34px] w-12 sm:h-[38px] sm:w-16 rounded-[1rem] sm:rounded-[1.25rem] bg-background border border-dashed border-border text-[10px] sm:text-[11px] font-bold transition-all focus:w-20 sm:focus:w-24 focus:border-black flex items-center justify-center text-center p-0 m-0 leading-none"
                                        onKeyDown={(e) => e.key === 'Enter' && addTag()}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SYSTEM ACTIONS */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <Button
                                variant="outline"
                                className="nothing-pill h-14 sm:h-16 font-bold uppercase tracking-widest text-[9px] sm:text-[10px] gap-2 border-border hover:bg-black hover:text-white transition-colors"
                                onClick={() => navigate(`/word/${wordId}/edit`)}
                            >
                                <Pencil className="h-3 w-3 sm:h-4 sm:w-4" /> Edit
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" className="nothing-pill h-14 sm:h-16 font-bold uppercase tracking-widest text-[9px] sm:text-[10px] gap-2 text-accent border border-border hover:bg-accent hover:text-white hover:border-accent transition-colors">
                                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" /> Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-card border-border rounded-[2rem] sm:p-10 p-6">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl sm:text-3xl font-serif font-bold text-accent">Delete Entry</AlertDialogTitle>
                                        <AlertDialogDescription className="text-muted-foreground pt-4 text-sm sm:text-base font-medium">
                                            Remove "{word.word}" permanently from the vault? This cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="pt-8 sm:pt-12 gap-3 sm:gap-4">
                                        <AlertDialogCancel className="nothing-pill h-12 sm:h-14 bg-background border-border font-bold uppercase tracking-widest text-xs sm:text-sm">Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={deleteWord} className="nothing-pill h-12 sm:h-14 bg-accent hover:bg-accent/90 text-white font-bold uppercase tracking-widest px-8 sm:px-10 text-xs sm:text-sm shadow-none">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>
            </main>

            {/* DIALOGS */}
            <Dialog open={exampleDialogOpen} onOpenChange={setExampleDialogOpen}>
                <DialogContent className="bg-card border-border rounded-[2rem] sm:p-10 p-6">
                    <DialogHeader><DialogTitle className="text-xl sm:text-2xl font-serif font-bold uppercase tracking-tighter">Add Example</DialogTitle></DialogHeader>
                    <div className="space-y-6 pt-6 sm:pt-8">
                        <div className="space-y-2 sm:space-y-4">
                            <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Sentence</Label>
                            <Textarea value={newSentence} onChange={(e) => setNewSentence(e.target.value)} placeholder="Example Sentence" className="rounded-[1.5rem] bg-background border-border min-h-[100px] sm:min-h-[120px] text-sm sm:text-base font-medium p-4 sm:p-6 resize-none" />
                        </div>
                        <div className="space-y-2 sm:space-y-4">
                            <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Translation</Label>
                            <Input value={newTranslation} onChange={(e) => setNewTranslation(e.target.value)} placeholder="English Translation" className="h-14 sm:h-16 rounded-full bg-background border-border text-sm sm:text-base px-6" />
                        </div>
                        <Button onClick={addExample} className="nothing-pill w-full h-14 sm:h-16 bg-black text-white font-bold uppercase tracking-[0.2em] text-xs sm:text-sm">Save Example</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
