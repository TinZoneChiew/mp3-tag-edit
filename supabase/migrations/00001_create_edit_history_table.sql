-- Create edit_history table for persistence
CREATE TABLE IF NOT EXISTS public.edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    title TEXT,
    artist TEXT,
    album TEXT,
    year TEXT,
    genre TEXT,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.edit_history ENABLE ROW LEVEL SECURITY;

-- Allow public access for reading and writing (for this tool)
CREATE POLICY "Allow public read edit_history" ON public.edit_history FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert edit_history" ON public.edit_history FOR INSERT TO public WITH CHECK (true);
