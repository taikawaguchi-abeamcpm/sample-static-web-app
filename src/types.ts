export type CandidateType = 'behavior_feature' | 'tag' | 'score';
export type CandidateStatus = 'new' | 'adopted' | 'rejected';

export interface FeatureCandidate {
  candidate_id: string;
  type: CandidateType;
  source: string;
  name_proposed: string;
  description_proposed: string;
  logic_proposed: string;
  status: CandidateStatus;
  created_at: string;
}

export interface UpdateCandidatePayload {
  candidate_id: string;
  action: 'adopt' | 'reject';
}

export interface TagDefinition {
  tag_id: string;
  tag_code: string;
  tag_name: string;
  description?: string | null;
  value_type?: string | null;
  source_type?: string | null;
  is_multi_valued?: boolean | number | null;
  is_active?: boolean | number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScoreDefinition {
  score_id: string;
  score_code: string;
  score_name: string;
  description?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  direction?: string | null;
  source_type?: string | null;
  refresh_interval?: string | number | null;
  is_active?: boolean | number | null;
  created_at?: string;
  updated_at?: string;
}

export interface TableResult {
  columns: string[];
  rows: Record<string, unknown>[];
}
