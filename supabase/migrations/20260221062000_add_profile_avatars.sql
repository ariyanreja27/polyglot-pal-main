-- Add avatar support for profiles + storage bucket for avatar uploads

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create a dedicated bucket for avatars (public so images can be loaded easily)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage.objects (avatars bucket)
-- Note: policies are idempotent via IF NOT EXISTS checks are not supported for CREATE POLICY,
-- so use DO blocks.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Avatar images are publicly readable'
  ) THEN
    CREATE POLICY "Avatar images are publicly readable"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload own avatar'
  ) THEN
    CREATE POLICY "Users can upload own avatar"
      ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update own avatar'
  ) THEN
    CREATE POLICY "Users can update own avatar"
      ON storage.objects
      FOR UPDATE
      USING (bucket_id = 'avatars' AND auth.uid() = owner)
      WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own avatar'
  ) THEN
    CREATE POLICY "Users can delete own avatar"
      ON storage.objects
      FOR DELETE
      USING (bucket_id = 'avatars' AND auth.uid() = owner);
  END IF;
END $$;
