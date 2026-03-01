import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Search, Star, GraduationCap, BookMarked, Sparkles, AlertTriangle, Trash2, BookOpen, Pencil, Activity, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { handleError } from "@/lib/error-handler";

interface WordRow {
  id: string;
  word: string;
  type: string | null;
  status: string;
  is_favorite: boolean;
  created_at: string;
  last_reviewed: string | null;
  first_meaning?: string;
}

const SWIPE_THRESHOLD = 60;
const MAX_SWIPE_LEFT = -80; // Enough space for Edit and Delete buttons stacked

/**
 * WordCardItem Component
 * 
 * Renders a single swipeable word item card in the vocabulary list. 
 * Supports touch gestures for swiping to reveal quick actions: left swipe reveals 
 * edit/delete actions, and a right swipe acts as a quick status toggle.
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {WordRow} props.w - The word data object to display.
 * @param {number} props.index - The numeric index of the word in the list.
 * @param {boolean} props.isOpen - Indicates whether this card's swipe actions are currently revealed.
 * @param {(id: string | null) => void} props.onOpen - Callback to mark this card as open (for swipe limits).
 * @param {(id: string) => void} props.onClick - Callback fired when the card is pressed.
 * @param {(id: string, current: boolean) => void} props.onToggleFavorite - Callback to toggle favorite status.
 * @param {(id: string, currentStatus: string) => void} props.onToggleStatus - Callback to toggle learning status.
 * @param {(id: string) => void} props.onEdit - Callback to navigate to the edit screen.
 * @param {(id: string) => void} props.onDelete - Callback to initiate deletion of the word.
 * @returns {JSX.Element} The rendered swipeable word card.
 */
function WordCardItem({
  w,
  index,
  isOpen,
  onOpen,
  onClick,
  onToggleFavorite,
  onToggleStatus,
  onEdit,
  onDelete
}: {
  w: WordRow;
  index: number;
  isOpen: boolean;
  onOpen: (id: string | null) => void;
  onClick: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  // When parent tells us we are no longer open, reset our position.
  useEffect(() => {
    if (!isOpen && translateX !== 0) {
      setTranslateX(0);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const diffX = currentX - startX;
    const diffY = currentY - startY;

    // Prevent swipe if vertical scroll is dominant
    if (Math.abs(diffY) > Math.abs(diffX)) return;

    // We allow swiping right (diffX > 0) slightly to show action intent, 
    // and left (diffX < 0) up to MAX_SWIPE_LEFT.
    // If it was already open, we're effectively starting from MAX_SWIPE_LEFT.
    let newX = isOpen ? MAX_SWIPE_LEFT + diffX : diffX;

    // Limit left drag
    if (newX < MAX_SWIPE_LEFT - 20) newX = MAX_SWIPE_LEFT - 20; // slight rubber band
    // limit right drag
    if (newX > SWIPE_THRESHOLD + 30) newX = SWIPE_THRESHOLD + 30;

    setTranslateX(newX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (translateX > SWIPE_THRESHOLD) {
      // Swiped right enough to trigger status toggle
      onToggleStatus(w.id, w.status);
      setTranslateX(0);
      onOpen(null);
    } else if (translateX < -SWIPE_THRESHOLD) {
      // Swiped left enough to reveal buttons
      setTranslateX(MAX_SWIPE_LEFT);
      onOpen(w.id);
    } else {
      // Did not reach threshold, snap back to closed (or opened if it already was open and they barely nudged it)
      if (isOpen && translateX < MAX_SWIPE_LEFT + 20) {
        setTranslateX(MAX_SWIPE_LEFT);
      } else {
        setTranslateX(0);
        onOpen(null);
      }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-transparent">
      {/* Background layer for Left Swipe Actions (Edit/Delete) - revealed when swiping left */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex flex-col items-center justify-center w-[80px] gap-2 pr-4",
          translateX < 0 ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(w.id); }}
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow-sm"
        >
          <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(w.id); }}
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-sm"
        >
          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>

      <div
        className={cn(
          "absolute inset-y-0 left-0 flex items-center justify-start px-6 transition-opacity pointer-events-none",
          translateX > 0 ? "opacity-100" : "opacity-0"
        )}
      >
        <div className={cn(
          "h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white shadow-sm",
          w.status === "mastered" ? "bg-accent" : "bg-black"
        )}>
          {w.status === "mastered" ? (
            <BookMarked className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </div>
      </div>

      {/* Foreground Sliding Card */}
      <div
        className={cn(
          "nothing-card relative group p-5 sm:p-6 flex flex-row items-center justify-between cursor-pointer hover:border-black/30 bg-white shadow-sm border border-border/60",
          !isDragging && "transition-transform duration-300 ease-out"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (isOpen) onOpen(null); // Click to close if open
          else onClick(w.id); // Normal click
        }}
      >
        <div className="space-y-2 flex-1 min-w-0">
          {/* Top Row: Word, Badge, Index */}
          <div className="flex flex-row items-start justify-between w-full">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap pr-4 pointer-events-none">
              <div className={cn(
                "h-3 w-1 sm:h-2.5 sm:w-2.5 rounded-full translate-y-[0.8px] shrink-0",
                w.status === "mastered" ? "bg-black" : "bg-accent"
              )} />
              <h3 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold leading-none text-black">
                {w.word}
              </h3>
              {w.type && (
                <Badge variant="outline" className="text-[9px] sm:text-[10px] px-2 py-0 h-4 sm:h-5 flex items-center justify-center font-bold tracking-widest uppercase rounded-full border-border bg-black/5 text-muted-foreground whitespace-nowrap">
                  {w.type}
                </Badge>
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-widest text-muted-foreground/30 mt-1 pointer-events-none">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>

          {/* Bottom Row: Meaning and Star */}
          <div className="flex flex-row items-center justify-between w-full pt-1">
            <div className="flex-1 min-w-0 pr-4">
              <p
                className="text-base sm:text-lg font-sans font-medium text-foreground/80 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {w.first_meaning}
              </p>
            </div>
            <button
              className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-all active:scale-75 shrink-0 -mr-2"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(w.id, w.is_favorite); }}
            >
              <Star
                className={cn(
                  "h-4 w-4 sm:h-5 sm:w-5 transition-all",
                  w.is_favorite ? "fill-amber-400 text-amber-500" : "text-border"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const normalizeSort = (raw: string | null | undefined) => {
  const v = raw ?? "asc";
  if (v === "az") return "asc";
  if (v === "date") return "newest";
  if (v === "reviewed") return "newest";
  if (v === "asc" || v === "desc" || v === "newest" || v === "oldest") return v;
  return "asc";
};

/**
 * WordList Component
 * 
 * The primary vocabulary dashboard for a specific language. It renders a searchable,
 * filterable, and sortable list of word cards. It pulls contextual user settings from
 * URL search parameters or local storage to recall specific filters between sessions.
 * 
 * Features:
 * - Advanced text search across word names and initial meanings.
 * - Dynamic filtering by 'Type', 'Status' (Active/Learned), and Favorites.
 * - Sorting configurations (Alphabetical, Chronological).
 * - Swipeable item gestures utilizing the WordCardItem component.
 * - Aggregated statistical HUD (Total, Learned, Active).
 * 
 * @component
 * @example
 * // Route-driven component requiring the :languageId param:
 * // /language/:languageId
 * <WordList />
 * 
 * @returns {JSX.Element} The rendered list view of the user's vocabulary.
 */
export default function WordList() {
  const { languageId } = useParams<{ languageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const storageKey = languageId ? `wordlist_filters_${languageId}` : "wordlist_filters";

  const [langName, setLangName] = useState("");
  const [words, setWords] = useState<WordRow[]>([]);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [filterType, setFilterType] = useState(() => searchParams.get("type") ?? "all");
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get("status") ?? "all");
  const [favOnly, setFavOnly] = useState(() => (searchParams.get("fav") ?? "0") === "1");
  const [sortBy, setSortBy] = useState(() => normalizeSort(searchParams.get("sort")));
  const [loading, setLoading] = useState(true);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [wordToDelete, setWordToDelete] = useState<WordRow | null>(null);

  useEffect(() => {
    if (!languageId) return;

    const hasAnyUrlFilter =
      searchParams.has("q") ||
      searchParams.has("type") ||
      searchParams.has("status") ||
      searchParams.has("fav") ||
      searchParams.has("sort");

    if (hasAnyUrlFilter) return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        q?: string;
        type?: string;
        status?: string;
        fav?: boolean;
        sort?: string;
      };

      const next = new URLSearchParams();
      if (parsed.q) next.set("q", parsed.q);
      if (parsed.type && parsed.type !== "all") next.set("type", parsed.type);
      if (parsed.status && parsed.status !== "all") next.set("status", parsed.status);
      if (parsed.fav) next.set("fav", "1");
      const normalizedSort = normalizeSort(parsed.sort);
      if (normalizedSort !== "asc") next.set("sort", normalizedSort);

      if ([...next.keys()].length > 0) {
        setSearchParams(next, { replace: true });
      }
    } catch {
      // ignore
    }
  }, [languageId, storageKey, searchParams, setSearchParams]);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const type = searchParams.get("type") ?? "all";
    const status = searchParams.get("status") ?? "all";
    const fav = (searchParams.get("fav") ?? "0") === "1";
    const sort = normalizeSort(searchParams.get("sort"));

    setSearch(q);
    setFilterType(type);
    setFilterStatus(status);
    setFavOnly(fav);
    setSortBy(sort);
  }, [searchParams]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);

        if (search) next.set("q", search);
        else next.delete("q");

        if (filterType !== "all") next.set("type", filterType);
        else next.delete("type");

        if (filterStatus !== "all") next.set("status", filterStatus);
        else next.delete("status");

        if (favOnly) next.set("fav", "1");
        else next.delete("fav");

        if (sortBy !== "asc") next.set("sort", sortBy);
        else next.delete("sort");

        try {
          if (languageId) {
            window.localStorage.setItem(
              storageKey,
              JSON.stringify({
                q: search,
                type: filterType,
                status: filterStatus,
                fav: favOnly,
                sort: sortBy,
              }),
            );
          }
        } catch {
          // ignore
        }

        return next;
      });
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [search, filterType, filterStatus, favOnly, sortBy, setSearchParams, languageId, storageKey]);

  /**
   * Retrieves the language details and all vocabulary entries for the current user and language from Supabase.
   * Further aggregates related database tables (e.g., pulling the first 'meaning' for display in the list preview).
   * 
   * @async
   * @function fetchData
   * @returns {Promise<void>}
   */
  const fetchData = async () => {
    if (!user || !languageId) return;
    try {
      const { data: lang, error: lError } = await supabase.from("languages").select("name").eq("id", languageId).single();
      if (lError) throw lError;
      if (lang) setLangName(lang.name);

      const { data: wordsData, error: wError } = await supabase.from("words").select("*").eq("language_id", languageId).eq("user_id", user.id);
      if (wError) throw wError;
      if (!wordsData) { setLoading(false); return; }

      const wordIds = wordsData.map((w) => w.id);
      const { data: meaningsData, error: mError } = wordIds.length > 0
        ? await supabase.from("meanings").select("word_id, meaning").in("word_id", wordIds)
        : { data: [], error: null };
      if (mError) throw mError;

      const enriched: WordRow[] = wordsData.map((w) => {
        const meanings = meaningsData?.filter((m) => m.word_id === w.id).map(m => m.meaning) || [];
        return {
          ...w,
          first_meaning: meanings.length > 0 ? meanings.join(", ") : undefined,
        };
      });
      setWords(enriched);
    } catch (error) {
      handleError(error, { title: "Fetch Failed" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user, languageId]);

  /**
   * Toggles the favorite ('starred') status of a specific word.
   * Persists immediately to the database and updates local state optimistically.
   * 
   * @async
   * @function toggleFavorite
   * @param {string} wordId - The unique ID of the word.
   * @param {boolean} current - The current favorite status before toggling.
   * @returns {Promise<void>}
   */
  const toggleFavorite = async (wordId: string, current: boolean) => {
    try {
      const { error } = await supabase.from("words").update({ is_favorite: !current }).eq("id", wordId);
      if (error) throw error;
      setWords((prev) => prev.map((w) => w.id === wordId ? { ...w, is_favorite: !current } : w));
    } catch (error) {
      handleError(error, { title: "Update Failed" });
    }
  };

  /**
   * Toggles the learning status of a word, swapping between 'new' (Active) and 'mastered' (Learned).
   * Optimistically updates the UI and adds haptic feedback if permitted by the browser.
   * 
   * @async
   * @function toggleStatus
   * @param {string} wordId - The unique ID of the word.
   * @param {string} currentStatus - The existing status of the word ('new' or 'mastered').
   * @returns {Promise<void>}
   */
  const toggleStatus = async (wordId: string, currentStatus: string) => {
    const newStatus = currentStatus === "mastered" ? "new" : "mastered";
    try {
      const { error } = await supabase.from("words").update({ status: newStatus }).eq("id", wordId);
      if (error) throw error;
      // Optimistic upate
      setWords((prev) => prev.map((w) => w.id === wordId ? { ...w, status: newStatus } : w));
      // Add subtle haptic feedback if supported
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    } catch (error) {
      handleError(error, { title: "Status Update Failed" });
    }
  };

  const deleteWord = async (wordId: string) => {
    const word = words.find(w => w.id === wordId);
    if (word) setWordToDelete(word);
  };

  const confirmDeleteWord = async () => {
    if (!wordToDelete) return;
    try {
      const { error } = await supabase.from("words").delete().eq("id", wordToDelete.id);
      if (error) throw error;
      setWords((prev) => prev.filter(w => w.id !== wordToDelete.id));
      toast({ title: "Word deleted" });
      setWordToDelete(null);
    } catch (error) {
      handleError(error, { title: "Delete Failed" });
    }
  };

  const handleDeleteLanguage = async () => {
    if (!languageId || !user) return;
    try {
      const { error } = await supabase.from("languages").delete().eq("id", languageId);
      if (error) throw error;
      toast({ title: "Language deleted" });
      navigate("/");
    } catch (error) {
      handleError(error, { title: "Language Delete Failed", description: "Could not remove this language." });
    }
  };

  const filtered = words
    .filter((w) => {
      if (search) {
        const s = search.toLowerCase();
        if (!w.word.toLowerCase().includes(s) && !w.first_meaning?.toLowerCase().includes(s)) return false;
      }
      if (filterType !== "all" && w.type !== filterType) return false;
      if (filterStatus !== "all" && w.status !== filterStatus) return false;
      if (favOnly && !w.is_favorite) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "asc") return a.word.localeCompare(b.word);
      if (sortBy === "desc") return b.word.localeCompare(a.word);
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return 0;
    });

  const stats = {
    total: words.length,
    mastered: words.filter((w) => w.status === "mastered").length,
    new_count: words.filter((w) => w.status === "new" || w.status === "learning").length,
  };

  return (
    <div className="min-h-screen pb-32 bg-background text-foreground font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-border h-16 sm:h-20 flex items-center">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4 truncate">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full hover:bg-black/5 hover:text-black">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold tracking-tighter truncate">{langName} Language</h1>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 hover:text-black shrink-0">
                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border rounded-[2rem] sm:p-10 p-6">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl sm:text-3xl font-serif font-bold text-accent">Delete Language</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground pt-4 text-sm sm:text-base font-medium">
                  Are you sure you want to permanently delete this language? This will completely remove all its words, meanings, examples, and notes. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="pt-8 sm:pt-12 gap-3 sm:gap-4">
                <AlertDialogCancel className="nothing-pill h-12 sm:h-14 bg-background border-border font-bold uppercase tracking-widest text-xs sm:text-sm">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteLanguage} className="nothing-pill h-12 sm:h-14 bg-accent hover:bg-accent/90 text-white font-bold uppercase tracking-widest px-8 sm:px-10 text-xs sm:text-sm shadow-none">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-8 sm:space-y-12">
        {/* STATS HUD ELEGANT CARDS (COMPACT) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
          {/* Total Box */}
          <div className="bg-white border border-border rounded-[2rem] p-5 sm:p-6 flex flex-col justify-between items-start relative overflow-hidden shadow-sm hover:shadow-md transition-all group min-h-[120px] sm:min-h-[140px]">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-black/5 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-black/60" />
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Total Repository</p>
            </div>
            <div className="flex items-end justify-between w-full">
              <span className="text-4xl sm:text-5xl font-serif font-bold tracking-tighter text-black leading-none">
                {stats.total.toString().padStart(3, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pb-1">Entries</span>
            </div>
          </div>

          {/* Sub-grid for Learned & Active */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Learned Box */}
            <div className="bg-black/5 border-transparent text-black rounded-[2rem] p-5 flex flex-col justify-center items-start relative overflow-hidden shadow-sm hover:shadow-md transition-all group gap-2">
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-black/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black truncate">Learned</p>
              </div>
              <span className="text-3xl sm:text-4xl font-serif font-bold tracking-tighter">{stats.mastered}</span>
            </div>

            {/* Active Box */}
            <div className="bg-accent/10 border-transparent text-accent rounded-[2rem] p-5 flex flex-col justify-center items-start relative overflow-hidden shadow-sm hover:shadow-md transition-all group gap-2">
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <BookMarked className="h-3 w-3 sm:h-4 sm:w-4 text-accent" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/80 truncate">Active</p>
              </div>
              <span className="text-3xl sm:text-4xl font-serif font-bold tracking-tighter">{stats.new_count}</span>
            </div>
          </div>
        </div>

        {/* CONTROLS SEARCH & FILTERS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-center">
          <div className="lg:col-span-4 flex items-center gap-2 sm:gap-3">
            <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-focus-within:text-black transition-colors" />
              <Input
                className="h-12 border-border focus:border-black sm:h-14 pl-10 pr-10 sm:pl-12 sm:pr-12 rounded-full bg-white transition-all font-medium text-sm sm:text-base shadow-sm w-full"
                placeholder="Search Semantic Core"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-black transition-colors"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setFavOnly(!favOnly)}
              className={cn("h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-full border-border bg-white shadow-sm transition-colors", favOnly ? "text-amber-500 border-amber-500 bg-amber-50" : "hover:bg-black/5")}
            >
              <Star className={cn("h-4 w-4 sm:h-5 sm:w-5", favOnly && "fill-current")} />
            </Button>
          </div>

          <div className="lg:col-span-8 flex flex-wrap gap-2 sm:gap-3 w-full">
            <div className="flex flex-nowrap overflow-x-auto pb-1 sm:pb-0 scrollbar-hide gap-2 sm:gap-3 items-center w-full lg:w-auto lg:flex-1">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-12 sm:h-14 min-w-[110px] sm:min-w-[130px] rounded-full border-border bg-white text-[10px] font-bold uppercase tracking-widest shadow-sm flex-1">
                  <SelectValue placeholder="TYPE" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  <SelectItem value="all">ALL TYPES</SelectItem>
                  <SelectItem value="noun">NOUN</SelectItem>
                  <SelectItem value="pronoun">PRONOUN</SelectItem>
                  <SelectItem value="adjective">ADJECTIVE</SelectItem>
                  <SelectItem value="verb">VERB</SelectItem>
                  <SelectItem value="adverb">ADVERB</SelectItem>
                  <SelectItem value="preposition">PREPOSITION</SelectItem>
                  <SelectItem value="conjunction">CONJUNCTION</SelectItem>
                  <SelectItem value="interjection">INTERJECTION</SelectItem>
                  <SelectItem value="determiner">DETERMINER</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-12 sm:h-14 min-w-[110px] sm:min-w-[130px] rounded-full border-border bg-white text-[10px] font-bold uppercase tracking-widest shadow-sm flex-1">
                  <SelectValue placeholder="STATUS" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  <SelectItem value="all">ALL STATUS</SelectItem>
                  <SelectItem value="mastered">LEARNED</SelectItem>
                  <SelectItem value="new">ACTIVE</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-12 sm:h-14 min-w-[110px] sm:min-w-[130px] rounded-full border-border bg-white text-[10px] font-bold uppercase tracking-widest shadow-sm flex-1">
                  <SelectValue placeholder="SORT" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  <SelectItem value="asc">ASCENDING</SelectItem>
                  <SelectItem value="desc">DESCENDING</SelectItem>
                  <SelectItem value="newest">NEWEST FIRST</SelectItem>
                  <SelectItem value="oldest">OLDEST FIRST</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => navigate(`/language/${languageId}/add`)}
              className="nothing-pill h-12 sm:h-14 px-6 sm:px-8 bg-black hover:bg-black/80 text-white font-bold uppercase tracking-widest flex-1 lg:flex-none justify-center shadow-sm text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" /> Add Word
            </Button>
          </div>
        </div>

        {/* WORD LIST */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 sm:py-32 gap-6 opacity-40">
            <div className="h-10 w-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
            <p className="dot-text">Accessing Database...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="nothing-card p-12 sm:p-20 text-center flex flex-col items-center justify-center space-y-4 sm:space-y-6 bg-white border border-border/60 shadow-sm opacity-60">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border border-border/60 bg-background flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground uppercase tracking-widest text-xs sm:text-sm">No entries found matching criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 pb-20">
            {filtered.map((w, index) => (
              <WordCardItem
                key={w.id}
                w={w}
                index={index}
                isOpen={openCardId === w.id}
                onOpen={setOpenCardId}
                onClick={(id) => navigate(`/word/${id}`)}
                onToggleFavorite={toggleFavorite}
                onToggleStatus={toggleStatus}
                onEdit={(id) => navigate(`/word/${id}/edit`)}
                onDelete={deleteWord}
              />
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={wordToDelete !== null} onOpenChange={(open) => !open && setWordToDelete(null)}>
        <AlertDialogContent className="bg-card border-border rounded-[2rem] sm:p-10 p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl sm:text-3xl font-serif font-bold text-accent">Delete Entry</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground pt-4 text-sm sm:text-base font-medium">
              Remove "{wordToDelete?.word}" permanently from the vault? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-8 sm:pt-12 gap-3 sm:gap-4">
            <AlertDialogCancel className="nothing-pill h-12 sm:h-14 bg-background border-border font-bold uppercase tracking-widest text-xs sm:text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteWord} className="nothing-pill h-12 sm:h-14 bg-accent hover:bg-accent/90 text-white font-bold uppercase tracking-widest px-8 sm:px-10 text-xs sm:text-sm shadow-none">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
