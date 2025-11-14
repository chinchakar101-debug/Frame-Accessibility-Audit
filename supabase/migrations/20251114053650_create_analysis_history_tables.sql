/*
  # Figma Accessibility Analysis History System

  ## Overview
  Creates a persistent storage system for Figma frame accessibility analyses with 
  change detection, session persistence, and visual indicator support.

  ## New Tables

  ### `frame_analyses`
  Stores historical analysis results for Figma frames with full metadata.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for each analysis record
  - `frame_id` (text, indexed) - Figma frame ID (format: "123:456")
  - `frame_name` (text) - Human-readable frame name for display
  - `user_id` (text) - User identifier (Figma user ID or session ID)
  - `content_hash` (text, indexed) - Fingerprint of frame content for change detection
  - `total_issues` (integer) - Total count of accessibility issues found
  - `fail_count` (integer) - Count of AA/AAA failures
  - `warning_count` (integer) - Count of warnings
  - `analysis_data` (jsonb) - Complete analysis results with all issues
  - `plugin_version` (text) - Plugin version that performed the analysis
  - `analyzed_at` (timestamptz) - When the analysis was performed
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `frame_changes`
  Tracks detected changes in frames since their last analysis.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique change detection record ID
  - `frame_id` (text, indexed) - Figma frame ID
  - `previous_hash` (text) - Content hash from last analysis
  - `current_hash` (text) - Current content hash
  - `change_detected_at` (timestamptz) - When the change was detected
  - `is_resolved` (boolean) - Whether frame was re-analyzed
  - `created_at` (timestamptz) - Record creation timestamp

  ### `analysis_sessions`
  Tracks user sessions and their analysis activity.
  
  **Columns:**
  - `id` (uuid, primary key) - Session identifier
  - `user_id` (text) - User identifier
  - `session_start` (timestamptz) - Session start time
  - `session_end` (timestamptz) - Session end time (nullable)
  - `frames_analyzed` (integer) - Count of frames analyzed in session
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  
  1. Row Level Security (RLS) enabled on all tables
  2. Users can only access their own analysis data
  3. Indexes on frame_id and content_hash for fast lookups
  4. Automatic timestamp management with triggers

  ## Change Detection Mechanism
  
  The system uses a content fingerprinting approach:
  - Each frame's content is hashed (children count, text content, colors)
  - On frame selection, current hash is compared with stored hash
  - If hashes differ, a change is detected and recorded
  - Visual indicators can query the frame_changes table

  ## Important Notes
  
  - All timestamps use UTC
  - JSONB used for flexible storage of analysis results
  - Indexes optimize common query patterns
  - Data retention: analyses older than 90 days can be archived
*/

-- Create frame_analyses table
CREATE TABLE IF NOT EXISTS frame_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  frame_id text NOT NULL,
  frame_name text NOT NULL,
  user_id text NOT NULL,
  content_hash text NOT NULL,
  total_issues integer NOT NULL DEFAULT 0,
  fail_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  analysis_data jsonb NOT NULL,
  plugin_version text NOT NULL DEFAULT '1.0.0',
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for fast frame lookups
CREATE INDEX IF NOT EXISTS idx_frame_analyses_frame_id ON frame_analyses(frame_id);
CREATE INDEX IF NOT EXISTS idx_frame_analyses_user_id ON frame_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_frame_analyses_content_hash ON frame_analyses(content_hash);
CREATE INDEX IF NOT EXISTS idx_frame_analyses_analyzed_at ON frame_analyses(analyzed_at DESC);

-- Create composite index for user + frame queries
CREATE INDEX IF NOT EXISTS idx_frame_analyses_user_frame ON frame_analyses(user_id, frame_id);

-- Create frame_changes table
CREATE TABLE IF NOT EXISTS frame_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  frame_id text NOT NULL,
  previous_hash text NOT NULL,
  current_hash text NOT NULL,
  change_detected_at timestamptz NOT NULL DEFAULT now(),
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for change detection queries
CREATE INDEX IF NOT EXISTS idx_frame_changes_frame_id ON frame_changes(frame_id);
CREATE INDEX IF NOT EXISTS idx_frame_changes_is_resolved ON frame_changes(is_resolved);
CREATE INDEX IF NOT EXISTS idx_frame_changes_frame_unresolved ON frame_changes(frame_id, is_resolved);

-- Create analysis_sessions table
CREATE TABLE IF NOT EXISTS analysis_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  session_start timestamptz NOT NULL DEFAULT now(),
  session_end timestamptz,
  frames_analyzed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for session queries
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_start ON analysis_sessions(session_start DESC);

-- Enable Row Level Security
ALTER TABLE frame_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE frame_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for frame_analyses
CREATE POLICY "Users can view own analyses"
  ON frame_analyses FOR SELECT
  TO authenticated
  USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can insert own analyses"
  ON frame_analyses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update own analyses"
  ON frame_analyses FOR UPDATE
  TO authenticated
  USING (user_id = auth.jwt()->>'sub')
  WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can delete own analyses"
  ON frame_analyses FOR DELETE
  TO authenticated
  USING (user_id = auth.jwt()->>'sub');

-- RLS Policies for frame_changes
CREATE POLICY "Users can view own frame changes"
  ON frame_changes FOR SELECT
  TO authenticated
  USING (
    frame_id IN (
      SELECT frame_id FROM frame_analyses WHERE user_id = auth.jwt()->>'sub'
    )
  );

CREATE POLICY "Users can insert own frame changes"
  ON frame_changes FOR INSERT
  TO authenticated
  WITH CHECK (
    frame_id IN (
      SELECT frame_id FROM frame_analyses WHERE user_id = auth.jwt()->>'sub'
    )
  );

CREATE POLICY "Users can update own frame changes"
  ON frame_changes FOR UPDATE
  TO authenticated
  USING (
    frame_id IN (
      SELECT frame_id FROM frame_analyses WHERE user_id = auth.jwt()->>'sub'
    )
  )
  WITH CHECK (
    frame_id IN (
      SELECT frame_id FROM frame_analyses WHERE user_id = auth.jwt()->>'sub'
    )
  );

-- RLS Policies for analysis_sessions
CREATE POLICY "Users can view own sessions"
  ON analysis_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can insert own sessions"
  ON analysis_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update own sessions"
  ON analysis_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.jwt()->>'sub')
  WITH CHECK (user_id = auth.jwt()->>'sub');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for frame_analyses
DROP TRIGGER IF EXISTS update_frame_analyses_updated_at ON frame_analyses;
CREATE TRIGGER update_frame_analyses_updated_at
  BEFORE UPDATE ON frame_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to get latest analysis for a frame
CREATE OR REPLACE FUNCTION get_latest_analysis(p_frame_id text, p_user_id text)
RETURNS TABLE (
  id uuid,
  frame_id text,
  frame_name text,
  content_hash text,
  total_issues integer,
  fail_count integer,
  warning_count integer,
  analysis_data jsonb,
  analyzed_at timestamptz,
  has_changes boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fa.id,
    fa.frame_id,
    fa.frame_name,
    fa.content_hash,
    fa.total_issues,
    fa.fail_count,
    fa.warning_count,
    fa.analysis_data,
    fa.analyzed_at,
    EXISTS(
      SELECT 1 FROM frame_changes fc 
      WHERE fc.frame_id = fa.frame_id 
      AND fc.is_resolved = false
    ) as has_changes
  FROM frame_analyses fa
  WHERE fa.frame_id = p_frame_id 
  AND fa.user_id = p_user_id
  ORDER BY fa.analyzed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to detect and record frame changes
CREATE OR REPLACE FUNCTION detect_frame_change(
  p_frame_id text,
  p_previous_hash text,
  p_current_hash text
)
RETURNS boolean AS $$
DECLARE
  v_has_changed boolean;
BEGIN
  v_has_changed := p_previous_hash != p_current_hash;
  
  IF v_has_changed THEN
    INSERT INTO frame_changes (frame_id, previous_hash, current_hash)
    VALUES (p_frame_id, p_previous_hash, p_current_hash);
  END IF;
  
  RETURN v_has_changed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to resolve frame changes (mark as re-analyzed)
CREATE OR REPLACE FUNCTION resolve_frame_changes(p_frame_id text)
RETURNS void AS $$
BEGIN
  UPDATE frame_changes
  SET is_resolved = true
  WHERE frame_id = p_frame_id
  AND is_resolved = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;