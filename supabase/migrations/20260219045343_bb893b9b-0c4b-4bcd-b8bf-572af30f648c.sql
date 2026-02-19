
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Languages table
CREATE TABLE public.languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own languages" ON public.languages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own languages" ON public.languages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own languages" ON public.languages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own languages" ON public.languages FOR DELETE USING (auth.uid() = user_id);

-- Words table
CREATE TABLE public.words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  type TEXT CHECK (type IN ('noun', 'verb', 'adjective', 'pronoun', 'adverb', 'other')),
  pronunciation TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'learning', 'mastered')),
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  notes TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  review_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own words" ON public.words FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own words" ON public.words FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own words" ON public.words FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own words" ON public.words FOR DELETE USING (auth.uid() = user_id);

-- Meanings table
CREATE TABLE public.meanings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  meaning TEXT NOT NULL,
  auto_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meanings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own meanings" ON public.meanings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.words WHERE words.id = meanings.word_id AND words.user_id = auth.uid()));
CREATE POLICY "Users can insert own meanings" ON public.meanings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.words WHERE words.id = meanings.word_id AND words.user_id = auth.uid()));
CREATE POLICY "Users can update own meanings" ON public.meanings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.words WHERE words.id = meanings.word_id AND words.user_id = auth.uid()));
CREATE POLICY "Users can delete own meanings" ON public.meanings FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.words WHERE words.id = meanings.word_id AND words.user_id = auth.uid()));

-- Examples table
CREATE TABLE public.examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  sentence TEXT NOT NULL,
  sentence_meaning TEXT,
  auto_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own examples" ON public.examples FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.words WHERE words.id = examples.word_id AND words.user_id = auth.uid()));
CREATE POLICY "Users can insert own examples" ON public.examples FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.words WHERE words.id = examples.word_id AND words.user_id = auth.uid()));
CREATE POLICY "Users can update own examples" ON public.examples FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.words WHERE words.id = examples.word_id AND words.user_id = auth.uid()));
CREATE POLICY "Users can delete own examples" ON public.examples FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.words WHERE words.id = examples.word_id AND words.user_id = auth.uid()));

-- Tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- Word_Tags junction table
CREATE TABLE public.word_tags (
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (word_id, tag_id)
);
ALTER TABLE public.word_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own word_tags" ON public.word_tags FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.words WHERE words.id = word_tags.word_id AND words.user_id = auth.uid()));
CREATE POLICY "Users can insert own word_tags" ON public.word_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.words WHERE words.id = word_tags.word_id AND words.user_id = auth.uid()));
CREATE POLICY "Users can delete own word_tags" ON public.word_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.words WHERE words.id = word_tags.word_id AND words.user_id = auth.uid()));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
