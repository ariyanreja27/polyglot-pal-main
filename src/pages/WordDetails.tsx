import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Plus, Trash2, Pencil, Sparkles, X } from "lucide-react";

interface Meaning { id: string; meaning: string; auto_generated: boolean; }
interface Example { id: string; sentence: string; sentence_meaning: string | null; auto_generated: boolean; }
interface Tag { id: string; name: string; }

export default function WordDetails() {
  const { wordId } = useParams<{ wordId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [word, setWord] = useState<any>(null);
  const [meanings, setMeanings] = useState<Meaning[]>([]);
  const [examples, setExamples] = useState<Example[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [notes, setNotes] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [newSentence, setNewSentence] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newTag, setNewTag] = useState("");
  const [meaningDialogOpen, setMeaningDialogOpen] = useState(false);
  const [exampleDialogOpen, setExampleDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchWord = async () => {
    if (!wordId || !user) return;
    const { data: w } = await supabase.from("words").select("*").eq("id", wordId).single();
    if (!w) { navigate("/"); return; }
    setWord(w);
    setNotes(w.notes || "");

    const { data: m } = await supabase.from("meanings").select("*").eq("word_id", wordId).order("created_at");
    setMeanings(m || []);

    const { data: ex } = await supabase.from("examples").select("*").eq("word_id", wordId).order("created_at");
    setExamples(ex || []);

    const { data: wt } = await supabase.from("word_tags").select("tag_id").eq("word_id", wordId);
    if (wt && wt.length > 0) {
      const { data: t } = await supabase.from("tags").select("*").in("id", wt.map((x) => x.tag_id));
      setTags(t || []);
    } else {
      setTags([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchWord(); }, [wordId, user]);

  const updateField = async (field: string, value: any) => {
    await supabase.from("words").update({ [field]: value }).eq("id", wordId);
    setWord((prev: any) => ({ ...prev, [field]: value }));
  };

  const saveNotes = async () => {
    await supabase.from("words").update({ notes }).eq("id", wordId);
    toast({ title: "Notes saved" });
  };

  const addMeaning = async () => {
    if (!newMeaning.trim() || !wordId) return;
    await supabase.from("meanings").insert({ word_id: wordId, meaning: newMeaning.trim() });
    setNewMeaning("");
    setMeaningDialogOpen(false);
    fetchWord();
  };

  const deleteMeaning = async (id: string) => {
    await supabase.from("meanings").delete().eq("id", id);
    setMeanings((prev) => prev.filter((m) => m.id !== id));
  };

  const addExample = async () => {
    if (!newSentence.trim() || !wordId) return;
    await supabase.from("examples").insert({ word_id: wordId, sentence: newSentence.trim(), sentence_meaning: newTranslation.trim() || null });
    setNewSentence(""); setNewTranslation("");
    setExampleDialogOpen(false);
    fetchWord();
  };

  const deleteExample = async (id: string) => {
    await supabase.from("examples").delete().eq("id", id);
    setExamples((prev) => prev.filter((e) => e.id !== id));
  };

  const addTag = async () => {
    if (!newTag.trim() || !user || !wordId) return;
    // Find or create tag
    let { data: existing } = await supabase.from("tags").select("id").eq("name", newTag.trim()).eq("user_id", user.id).single();
    let tagId: string;
    if (existing) {
      tagId = existing.id;
    } else {
      const { data: created } = await supabase.from("tags").insert({ name: newTag.trim(), user_id: user.id }).select("id").single();
      if (!created) return;
      tagId = created.id;
    }
    await supabase.from("word_tags").insert({ word_id: wordId, tag_id: tagId });
    setNewTag("");
    fetchWord();
  };

  const removeTag = async (tagId: string) => {
    if (!wordId) return;
    await supabase.from("word_tags").delete().eq("word_id", wordId).eq("tag_id", tagId);
    setTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  const deleteWord = async () => {
    if (!wordId) return;
    await supabase.from("words").delete().eq("id", wordId);
    navigate(-1);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!word) return null;

  const statusColor = (s: string) => s === "mastered" ? "bg-emerald-100 text-emerald-700" : s === "learning" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-semibold truncate">{word.word}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-8">
        {/* Header Info */}
        <section className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold">{word.word}</h2>
              {word.pronunciation && <p className="text-muted-foreground mt-1">/{word.pronunciation}/</p>}
            </div>
            <button onClick={() => updateField("is_favorite", !word.is_favorite)}>
              <Star className={`h-6 w-6 ${word.is_favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {word.type && <Badge variant="outline" className="capitalize">{word.type}</Badge>}
            <Badge className={statusColor(word.status)}>{word.status}</Badge>
            <Badge variant="outline">{word.difficulty}</Badge>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Reviews: {word.review_count}</span>
            {word.last_reviewed && <span>Last: {new Date(word.last_reviewed).toLocaleDateString()}</span>}
          </div>
        </section>

        {/* Meanings */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Meanings</h3>
            <Dialog open={meaningDialogOpen} onOpenChange={setMeaningDialogOpen}>
              <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Add</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Meaning</DialogTitle></DialogHeader>
                <Input placeholder="Enter meaning..." value={newMeaning} onChange={(e) => setNewMeaning(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMeaning()} />
                <Button onClick={addMeaning}>Add</Button>
              </DialogContent>
            </Dialog>
          </div>
          {meanings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meanings added yet.</p>
          ) : (
            <ol className="list-decimal list-inside space-y-1.5">
              {meanings.map((m) => (
                <li key={m.id} className="flex items-start gap-2 group">
                  <span className="flex-1">{m.meaning} {m.auto_generated && <span className="text-xs text-muted-foreground ml-1">(auto)</span>}</span>
                  <button onClick={() => deleteMeaning(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Examples */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Examples</h3>
            <Dialog open={exampleDialogOpen} onOpenChange={setExampleDialogOpen}>
              <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Add</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Example</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Sentence..." value={newSentence} onChange={(e) => setNewSentence(e.target.value)} />
                  <Input placeholder="Translation..." value={newTranslation} onChange={(e) => setNewTranslation(e.target.value)} />
                  <Button onClick={addExample}>Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {examples.length === 0 ? (
            <p className="text-sm text-muted-foreground">No examples added yet.</p>
          ) : (
            <div className="space-y-3">
              {examples.map((ex) => (
                <div key={ex.id} className="bg-muted/50 rounded-lg p-3 group relative">
                  <p className="font-medium text-sm">{ex.sentence}</p>
                  {ex.sentence_meaning && <p className="text-sm text-muted-foreground mt-1">→ {ex.sentence_meaning}</p>}
                  {ex.auto_generated && <span className="text-xs text-muted-foreground">(auto-generated)</span>}
                  <button onClick={() => deleteExample(ex.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Notes */}
        <section className="space-y-3">
          <h3 className="font-semibold text-lg">Notes</h3>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this word..." rows={3} />
          <Button variant="outline" size="sm" onClick={saveNotes}>Save Notes</Button>
        </section>

        {/* Tags */}
        <section className="space-y-3">
          <h3 className="font-semibold text-lg">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Badge key={t.id} variant="secondary" className="gap-1">
                {t.name}
                <button onClick={() => removeTag(t.id)}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add tag..." value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} className="max-w-[200px]" />
            <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
          </div>
        </section>

        {/* Learning Controls */}
        <section className="space-y-3">
          <h3 className="font-semibold text-lg">Learning Controls</h3>
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Status</label>
              <Select value={word.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                  <SelectItem value="mastered">Mastered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Difficulty</label>
              <Select value={word.difficulty} onValueChange={(v) => updateField("difficulty", v)}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => navigate(`/word/${wordId}/edit`)}><Pencil className="h-4 w-4 mr-1" /> Edit Word</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="h-4 w-4 mr-1" /> Delete Word</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{word.word}"?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete this word and all its meanings and examples.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteWord}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </main>
    </div>
  );
}
