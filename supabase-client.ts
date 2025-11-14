interface SupabaseConfig {
  url: string;
  anonKey: string;
}

interface AnalysisRecord {
  id?: string;
  frame_id: string;
  frame_name: string;
  user_id: string;
  content_hash: string;
  total_issues: number;
  fail_count: number;
  warning_count: number;
  analysis_data: any;
  plugin_version: string;
  analyzed_at?: string;
}

interface LatestAnalysis {
  id: string;
  frame_id: string;
  frame_name: string;
  content_hash: string;
  total_issues: number;
  fail_count: number;
  warning_count: number;
  analysis_data: any;
  analyzed_at: string;
  has_changes: boolean;
}

class SupabaseClient {
  private config: SupabaseConfig;
  private userId: string;

  constructor(config: SupabaseConfig, userId: string) {
    this.config = config;
    this.userId = userId;
  }

  private async request(
    path: string,
    method: string = 'GET',
    body?: any
  ): Promise<any> {
    const url = `${this.config.url}/rest/v1${path}`;
    const headers: Record<string, string> = {
      'apikey': this.config.anonKey,
      'Authorization': `Bearer ${this.config.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    const options: any = {
      method,
      headers
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase request failed: ${error}`);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  async saveAnalysis(analysis: AnalysisRecord): Promise<any> {
    return await this.request('/frame_analyses', 'POST', {
      ...analysis,
      user_id: this.userId
    });
  }

  async getLatestAnalysis(frameId: string): Promise<LatestAnalysis | null> {
    const result = await this.request(
      `/rpc/get_latest_analysis`,
      'POST',
      {
        p_frame_id: frameId,
        p_user_id: this.userId
      }
    );

    return result && result.length > 0 ? result[0] : null;
  }

  async detectFrameChange(
    frameId: string,
    previousHash: string,
    currentHash: string
  ): Promise<boolean> {
    const result = await this.request(
      `/rpc/detect_frame_change`,
      'POST',
      {
        p_frame_id: frameId,
        p_previous_hash: previousHash,
        p_current_hash: currentHash
      }
    );

    return result;
  }

  async resolveFrameChanges(frameId: string): Promise<void> {
    await this.request(
      `/rpc/resolve_frame_changes`,
      'POST',
      {
        p_frame_id: frameId
      }
    );
  }

  async getAllAnalyses(limit: number = 50): Promise<any[]> {
    return await this.request(
      `/frame_analyses?user_id=eq.${this.userId}&order=analyzed_at.desc&limit=${limit}`
    );
  }

  async getFrameHistory(frameId: string): Promise<any[]> {
    return await this.request(
      `/frame_analyses?user_id=eq.${this.userId}&frame_id=eq.${frameId}&order=analyzed_at.desc`
    );
  }

  async getUnresolvedChanges(): Promise<any[]> {
    const analyses = await this.request(
      `/frame_analyses?user_id=eq.${this.userId}&select=frame_id,frame_name`
    );

    const frameIds = analyses.map((a: any) => a.frame_id);

    if (frameIds.length === 0) {
      return [];
    }

    const changes = await this.request(
      `/frame_changes?is_resolved=eq.false&frame_id=in.(${frameIds.join(',')})`
    );

    return changes || [];
  }

  async startSession(): Promise<string> {
    const result = await this.request('/analysis_sessions', 'POST', {
      user_id: this.userId,
      session_start: new Date().toISOString(),
      frames_analyzed: 0
    });

    return result[0].id;
  }

  async endSession(sessionId: string, framesAnalyzed: number): Promise<void> {
    await this.request(
      `/analysis_sessions?id=eq.${sessionId}`,
      'PATCH',
      {
        session_end: new Date().toISOString(),
        frames_analyzed: framesAnalyzed
      }
    );
  }
}

function createSupabaseClient(userId: string): SupabaseClient | null {
  const url = 'https://mqvwxskywrbhnukhtzmy.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xdnd4c2t5d3JiaG51a2h0em15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTM2MDIsImV4cCI6MjA3ODY2OTYwMn0.0RM9nBZc5vANpsDUGPkiSo6NzEUHkp8Q1eDiS6UB5-I';

  if (!url || !anonKey) {
    console.warn('Supabase credentials not found. Persistent history disabled.');
    return null;
  }

  return new SupabaseClient({ url, anonKey }, userId);
}

export { SupabaseClient, createSupabaseClient, AnalysisRecord, LatestAnalysis };
