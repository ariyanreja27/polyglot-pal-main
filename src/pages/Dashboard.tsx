import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, LogOut, GraduationCap, BookMarked, Sparkles } from "lucide-react";

interface LanguageWithStats {
  id: string;
  name: string;
  total: number;
  mastered: number;
  learning: number;
  new_count: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [languages, setLanguages] = useState<LanguageWithStats[]>([]);
  const [newLang, setNewLang] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchLanguages = async () => {
    if (!user) return;
    const { data: langs } = await supabase.from("languages").select("id, name").eq("user_id", user.id);
    if (!langs) { setLoading(false); return; }

    const { data: words } = await supabase.from("words").select("language_id, status").eq("user_id", user.id);

    const stats: LanguageWithStats[] = langs.map((l) => {
      const langWords = words?.filter((w) => w.language_id === l.id) || [];
      return {
        id: l.id,
        name: l.name,
        total: langWords.length,
        mastered: langWords.filter((w) => w.status === "mastered").length,
        learning: langWords.filter((w) => w.status === "learning").length,
        new_count: langWords.filter((w) => w.status === "new").length,
      };
    });
    setLanguages(stats);
    setLoading(false);
  };

  useEffect(() => { fetchLanguages(); }, [user]);

  const addLanguage = async () => {
    if (!newLang.trim() || !user) return;
    const { error } = await supabase.from("languages").insert({ name: newLang.trim(), user_id: user.id });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewLang("");
      setDialogOpen(false);
      fetchLanguages();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold">VocabBuilder</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-1" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">My Languages</h2>
            <p className="text-muted-foreground text-sm mt-1">Select a language to view your vocabulary</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Add Language</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Language</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input placeholder="e.g. Spanish, Japanese..." value={newLang} onChange={(e) => setNewLang(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLanguage()} />
                <Button onClick={addLanguage} className="w-full">Add Language</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        ) : languages.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No languages yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Add your first language to start building vocabulary</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Language</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {languages.map((lang) => (
              <Card key={lang.id} className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/30" onClick={() => navigate(`/language/${lang.id}`)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{lang.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary mb-3">{lang.total} <span className="text-sm font-normal text-muted-foreground">words</span></p>
                  <div className="flex gap-3 text-xs">
                    <span className="flex items-center gap-1 text-emerald-600"><GraduationCap className="h-3 w-3" />{lang.mastered} mastered</span>
                    <span className="flex items-center gap-1 text-amber-600"><BookMarked className="h-3 w-3" />{lang.learning} learning</span>
                    <span className="flex items-center gap-1 text-primary"><Sparkles className="h-3 w-3" />{lang.new_count} new</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
