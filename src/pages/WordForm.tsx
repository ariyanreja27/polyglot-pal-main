import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";

interface Language {
  id: string;
  name: string;
}

export default function WordForm() {
  const { languageId, wordId } = useParams<{ languageId?: string; wordId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!wordId;

  const [word, setWord] = useState("");
  const [type, setType] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [meaning, setMeaning] = useState("");
  const [exSentence, setExSentence] = useState("");
  const [exTranslation, setExTranslation] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("new");
  const [difficulty, setDifficulty] = useState("medium");
  const [saving, setSaving] = useState(false);
  const [effectiveLangId, setEffectiveLangId] = useState(languageId || "");
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(true);

  useEffect(() => {
    if (isEdit && wordId) {
      (async () => {
        const { data: w } = await supabase.from("words").select("*").eq("id", wordId).single();
        if (!w) return;
        setWord(w.word);
        setType(w.type || "");
        setPronunciation(w.pronunciation || "");
        setNotes(w.notes || "");
        setStatus(w.status);
        setDifficulty(w.difficulty);
        setEffectiveLangId(w.language_id);

        const { data: m } = await supabase.from("meanings").select("meaning").eq("word_id", wordId).limit(1);
        if (m?.[0]) setMeaning(m[0].meaning);

        const { data: ex } = await supabase.from("examples").select("sentence, sentence_meaning").eq("word_id", wordId).limit(1);
        if (ex?.[0]) { setExSentence(ex[0].sentence); setExTranslation(ex[0].sentence_meaning || ""); }

        const { data: wt } = await supabase.from("word_tags").select("tag_id").eq("word_id", wordId);
        if (wt && wt.length > 0) {
          const { data: t } = await supabase.from("tags").select("name").in("id", wt.map((x) => x.tag_id));
          if (t) setTags(t.map((x) => x.name).join(", "));
        }
      })();
    }
  }, [wordId, isEdit]);

  useEffect(() => {
    if (user) {
      (async () => {
        const { data } = await supabase.from("languages").select("id, name").eq("user_id", user.id);
        setLanguages(data || []);
        setLoadingLanguages(false);
      })();
    }
  }, [user]);

  const handleSave = async () => {
    if (!word.trim() || !user) {
      toast({ title: "Error", description: "Please enter a word", variant: "destructive" });
      return;
    }

    if (!effectiveLangId) {
      toast({ title: "Error", description: "Please select a language first", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      let savedWordId = wordId;

      if (isEdit && wordId) {
        await supabase.from("words").update({
          word: word.trim(), type: type || null, pronunciation: pronunciation || null,
          notes: notes || null, status, difficulty,
        }).eq("id", wordId);
      } else {
        const { data, error } = await supabase.from("words").insert({
          word: word.trim(), type: type || null, pronunciation: pronunciation || null,
          notes: notes || null, status, difficulty,
          user_id: user.id, language_id: effectiveLangId,
        }).select("id").single();
        if (error) throw error;
        savedWordId = data.id;
      }

      // Handle meaning
      if (meaning.trim() && savedWordId) {
        if (isEdit) {
          const { data: existing } = await supabase.from("meanings").select("id").eq("word_id", savedWordId).limit(1);
          if (existing?.[0]) {
            await supabase.from("meanings").update({ meaning: meaning.trim() }).eq("id", existing[0].id);
          } else {
            await supabase.from("meanings").insert({ word_id: savedWordId, meaning: meaning.trim() });
          }
        } else {
          await supabase.from("meanings").insert({ word_id: savedWordId!, meaning: meaning.trim() });
        }
      }

      // Handle example
      if (exSentence.trim() && savedWordId) {
        if (isEdit) {
          const { data: existing } = await supabase.from("examples").select("id").eq("word_id", savedWordId).limit(1);
          if (existing?.[0]) {
            await supabase.from("examples").update({ sentence: exSentence.trim(), sentence_meaning: exTranslation.trim() || null }).eq("id", existing[0].id);
          } else {
            await supabase.from("examples").insert({ word_id: savedWordId, sentence: exSentence.trim(), sentence_meaning: exTranslation.trim() || null });
          }
        } else {
          await supabase.from("examples").insert({ word_id: savedWordId!, sentence: exSentence.trim(), sentence_meaning: exTranslation.trim() || null });
        }
      }

      // Handle tags
      if (tags.trim() && savedWordId) {
        // Remove old tags if editing
        if (isEdit) await supabase.from("word_tags").delete().eq("word_id", savedWordId);
        const tagNames = tags.split(",").map((t) => t.trim()).filter(Boolean);
        for (const name of tagNames) {
          let { data: existing } = await supabase.from("tags").select("id").eq("name", name).eq("user_id", user.id).single();
          let tagId: string;
          if (existing) { tagId = existing.id; }
          else {
            const { data: created } = await supabase.from("tags").insert({ name, user_id: user.id }).select("id").single();
            if (!created) continue;
            tagId = created.id;
          }
          await supabase.from("word_tags").insert({ word_id: savedWordId!, tag_id: tagId });
        }
      }

      toast({ title: isEdit ? "Word updated" : "Word added" });
      navigate(isEdit ? `/word/${wordId}` : `/language/${effectiveLangId}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-semibold">{isEdit ? "Edit Word" : "Add Word"}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {!isEdit && !languageId && (
          <div className="space-y-2">
            <Label>Language *</Label>
            <Select value={effectiveLangId} onValueChange={setEffectiveLangId} disabled={loadingLanguages}>
              <SelectTrigger>
                <SelectValue placeholder={loadingLanguages ? "Loading languages..." : "Select a language..."} />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Word *</Label>
          <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Enter word..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="noun">Noun</SelectItem>
                <SelectItem value="verb">Verb</SelectItem>
                <SelectItem value="adjective">Adjective</SelectItem>
                <SelectItem value="pronoun">Pronoun</SelectItem>
                <SelectItem value="adverb">Adverb</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Pronunciation</Label>
            <Input value={pronunciation} onChange={(e) => setPronunciation(e.target.value)} placeholder="/prəˌnʌn.siˈeɪ.ʃən/" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Meaning</Label>
          <Input value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="Enter meaning..." />
        </div>

        <div className="space-y-2">
          <Label>Example Sentence</Label>
          <Input value={exSentence} onChange={(e) => setExSentence(e.target.value)} placeholder="Example sentence..." />
        </div>

        <div className="space-y-2">
          <Label>Example Translation</Label>
          <Input value={exTranslation} onChange={(e) => setExTranslation(e.target.value)} placeholder="Translation..." />
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={3} />
        </div>

        <div className="space-y-2">
          <Label>Tags (comma-separated)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="food, travel, formal..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="mastered">Mastered</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving || !word.trim()} className="w-full">
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Word"}
        </Button>
      </main>
    </div>
  );
}
