CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL,
  author text DEFAULT 'M&M Commercial Moving',
  tags text[] DEFAULT '{}',
  published boolean DEFAULT false,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts(published, published_at DESC);

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published posts" ON blog_posts FOR SELECT USING (published = true);
CREATE POLICY "Authenticated users can manage posts" ON blog_posts FOR ALL USING (auth.role() = 'authenticated');
