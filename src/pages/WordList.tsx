import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Search, Star, GraduationCap, BookMarked, Sparkles } from "lucide-react";

interface WordRow {
  id: string;
  word: string;
  type: string | null;
  status: string;
  is_favorite: boolean;
  difficulty: string;
  created_at: string;
  last_reviewed: string | null;
  first_meaning?: string;
}

export default function WordList() {
  const { languageId } = useParams<{ languageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [langName, setLangName] = useState("");
  const [words, setWords] = useState<WordRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [favOnly, setFavOnly] = useState(false);
  const [sortBy, setSortBy] = useState("az");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user || !languageId) return;
    const { data: lang } = await supabase.from("languages").select("name").eq("id", languageId).single();
    if (lang) setLangName(lang.name);

    const { data: wordsData } = await supabase.from("words").select("*").eq("language_id", languageId).eq("user_id", user.id);
    if (!wordsData) { setLoading(false); return; }

    const wordIds = wordsData.map((w) => w.id);
    const { data: meaningsData } = wordIds.length > 0
      ? await supabase.from("meanings").select("word_id, meaning").in("word_id", wordIds)
      : { data: [] };

    const enriched: WordRow[] = wordsData.map((w) => ({
      ...w,
      first_meaning: meaningsData?.find((m) => m.word_id === w.id)?.meaning,
    }));
    setWords(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, languageId]);

  const toggleFavorite = async (wordId: string, current: boolean) => {
    await supabase.from("words").update({ is_favorite: !current }).eq("id", wordId);
    setWords((prev) => prev.map((w) => w.id === wordId ? { ...w, is_favorite: !current } : w));
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
      if (sortBy === "az") return a.word.localeCompare(b.word);
      if (sortBy === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "reviewed") return (new Date(b.last_reviewed || 0).getTime()) - (new Date(a.last_reviewed || 0).getTime());
      if (sortBy === "difficulty") { const d = { easy: 1, medium: 2, hard: 3 }; return (d[b.difficulty as keyof typeof d] || 0) - (d[a.difficulty as keyof typeof d] || 0); }
      return 0;
    });

  const stats = {
    total: words.length,
    mastered: words.filter((w) => w.status === "mastered").length,
    learning: words.filter((w) => w.status === "learning").length,
    new_count: words.filter((w) => w.status === "new").length,
  };

  const statusColor = (s: string) => s === "mastered" ? "bg-emerald-100 text-emerald-700" : s === "learning" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-semibold">{langName}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="flex flex-wrap gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">{stats.total} total</Badge>
          <Badge className={`text-sm px-3 py-1 ${statusColor("mastered")}`}><GraduationCap className="h-3 w-3 mr-1" />{stats.mastered} mastered</Badge>
          <Badge className={`text-sm px-3 py-1 ${statusColor("learning")}`}><BookMarked className="h-3 w-3 mr-1" />{stats.learning} learning</Badge>
          <Badge className={`text-sm px-3 py-1 ${statusColor("new")}`}><Sparkles className="h-3 w-3 mr-1" />{stats.new_count} new</Badge>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search words or meanings..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="noun">Noun</SelectItem>
              <SelectItem value="verb">Verb</SelectItem>
              <SelectItem value="adjective">Adjective</SelectItem>
              <SelectItem value="pronoun">Pronoun</SelectItem>
              <SelectItem value="adverb">Adverb</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="learning">Learning</SelectItem>
              <SelectItem value="mastered">Mastered</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="az">A–Z</SelectItem>
              <SelectItem value="date">Date Added</SelectItem>
              <SelectItem value="reviewed">Recently Reviewed</SelectItem>
              <SelectItem value="difficulty">Difficulty</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={favOnly ? "default" : "outline"} size="icon" onClick={() => setFavOnly(!favOnly)} title="Favorites only">
            <Star className={`h-4 w-4 ${favOnly ? "fill-current" : ""}`} />
          </Button>
          <Button onClick={() => navigate(`/language/${languageId}/add`)}><Plus className="h-4 w-4 mr-1" /> Add Word</Button>
        </div>

        {/* Word List */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {words.length === 0 ? "No words yet. Add your first word!" : "No words match your filters."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border cursor-pointer hover:shadow-sm hover:border-primary/20 transition-all"
                onClick={() => navigate(`/word/${w.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{w.word}</span>
                    {w.type && <span className="text-xs text-muted-foreground capitalize">{w.type}</span>}
                  </div>
                  {w.first_meaning && <p className="text-sm text-muted-foreground truncate mt-0.5">{w.first_meaning}</p>}
                </div>
                <Badge className={`text-xs shrink-0 ${statusColor(w.status)}`}>{w.status}</Badge>
                <button
                  className="shrink-0"
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(w.id, w.is_favorite); }}
                >
                  <Star className={`h-4 w-4 ${w.is_favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
