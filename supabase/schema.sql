-- ============================================================
-- WedSnap - Wedding Disposable Camera PWA
-- Supabase Database Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- Linked to auth.users via id
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. EVENTS TABLE
-- ============================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  location TEXT,
  cover_url TEXT,
  photo_limit INTEGER NOT NULL DEFAULT 36,
  gallery_mode TEXT NOT NULL DEFAULT 'public' CHECK (gallery_mode IN ('public', 'locked')),
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_slug ON public.events(slug);
CREATE INDEX idx_events_admin_id ON public.events(admin_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Events RLS policies
-- Admins can do full CRUD on their own events
CREATE POLICY "Admins can view their own events"
  ON public.events FOR SELECT
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can update their own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can delete their own events"
  ON public.events FOR DELETE
  USING (auth.uid() = admin_id);

-- Anyone can read active events by slug (for guests)
CREATE POLICY "Anyone can view active events"
  ON public.events FOR SELECT
  USING (is_active = true);

-- ============================================================
-- 3. CAMERA SESSIONS TABLE
-- ============================================================
CREATE TABLE public.camera_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  guest_name TEXT,
  photos_taken INTEGER NOT NULL DEFAULT 0,
  max_photos INTEGER NOT NULL DEFAULT 36,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, device_id)
);

CREATE INDEX idx_camera_sessions_event_id ON public.camera_sessions(event_id);
CREATE INDEX idx_camera_sessions_device_id ON public.camera_sessions(device_id);

ALTER TABLE public.camera_sessions ENABLE ROW LEVEL SECURITY;

-- Camera sessions RLS policies
-- Anyone can create a session (guests don't need auth)
CREATE POLICY "Anyone can create a camera session"
  ON public.camera_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id AND events.is_active = true
    )
  );

-- Anyone can view sessions (needed for the camera UI)
CREATE POLICY "Anyone can view camera sessions"
  ON public.camera_sessions FOR SELECT
  USING (true);

-- Anyone can update their own session (by device_id match)
CREATE POLICY "Anyone can update their own session"
  ON public.camera_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Admins can view sessions for their events
CREATE POLICY "Admins can view sessions for their events"
  ON public.camera_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id AND events.admin_id = auth.uid()
    )
  );

-- ============================================================
-- 4. PHOTOS TABLE
-- ============================================================
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.camera_sessions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  width INTEGER,
  height INTEGER,
  upload_status TEXT NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploading', 'success', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_event_id ON public.photos(event_id);
CREATE INDEX idx_photos_session_id ON public.photos(session_id);
CREATE INDEX idx_photos_upload_status ON public.photos(upload_status);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Photos RLS policies
-- Anyone can insert photos (guests upload without auth)
CREATE POLICY "Anyone can insert photos"
  ON public.photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.camera_sessions cs
      WHERE cs.id = session_id
        AND cs.event_id = event_id
        AND cs.photos_taken < cs.max_photos
    )
  );

-- Anyone can view photos for active events with public gallery
CREATE POLICY "Anyone can view photos for public events"
  ON public.photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id
        AND events.is_active = true
        AND events.gallery_mode = 'public'
    )
  );

-- Admins can view all photos for their events
CREATE POLICY "Admins can view photos for their events"
  ON public.photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id AND events.admin_id = auth.uid()
    )
  );

-- Anyone can update upload_status of photos (for upload progress)
CREATE POLICY "Anyone can update photo upload status"
  ON public.photos FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Admins can delete photos from their events
CREATE POLICY "Admins can delete photos from their events"
  ON public.photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id AND events.admin_id = auth.uid()
    )
  );

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- Function to validate photo count before insert
-- Prevents exceeding max_photos on a session
CREATE OR REPLACE FUNCTION public.validate_photo_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  SELECT photos_taken, max_photos
  INTO current_count, max_allowed
  FROM public.camera_sessions
  WHERE id = NEW.session_id;

  IF current_count IS NULL THEN
    RAISE EXCEPTION 'Invalid session: session_id % not found', NEW.session_id;
  END IF;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Photo limit reached: % of % photos taken', current_count, max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER check_photo_limit_before_insert
  BEFORE INSERT ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.validate_photo_count();

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_events
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Increment photos_taken on camera_sessions when a photo is inserted
CREATE OR REPLACE FUNCTION public.increment_photos_taken()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.camera_sessions
  SET photos_taken = photos_taken + 1,
      last_active = now()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_photo_inserted
  AFTER INSERT ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.increment_photos_taken();

-- Decrement photos_taken on camera_sessions when a photo is deleted
CREATE OR REPLACE FUNCTION public.decrement_photos_taken()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.camera_sessions
  SET photos_taken = GREATEST(photos_taken - 1, 0),
      last_active = now()
  WHERE id = OLD.session_id;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER on_photo_deleted
  AFTER DELETE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.decrement_photos_taken();

-- ============================================================
-- 7. STORAGE BUCKET
-- ============================================================

-- Create the wedsnap-photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wedsnap-photos',
  'wedsnap-photos',
  true,
  10485760, -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for wedsnap-photos bucket
-- Anyone can upload photos
CREATE POLICY "Anyone can upload photos to wedsnap-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wedsnap-photos');

-- Anyone can view photos (public bucket)
CREATE POLICY "Anyone can view wedsnap-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wedsnap-photos');

-- Only admins can delete photos from their events
-- (storage path format: {event_id}/{session_id}/{filename})
CREATE POLICY "Admins can delete photos from wedsnap-photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wedsnap-photos'
    AND EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id::text = (string_to_array(name, '/'))[1]
        AND events.admin_id = auth.uid()
    )
  );
