import {
  CandidateStatus,
  CandidateType,
  FeatureCandidate,
  ScoreDefinition,
  TableResult,
  TagDefinition,
  UpdateCandidatePayload
} from './types';

export interface FetchParams {
  type?: CandidateType;
  status?: CandidateStatus;
}

const API_BASE = '/api';

export async function fetchFeatureCandidates(params: FetchParams): Promise<FeatureCandidate[]> {
  const query = new URLSearchParams();
  query.set('type', params.type ?? 'behavior_feature');
  query.set('status', params.status ?? 'new');

  const res = await fetch(`${API_BASE}/getFeatureCandidates?${query.toString()}`);

  if (!res.ok) {
    throw new Error(`Failed to load candidates (${res.status})`);
  }

  return (await res.json()) as FeatureCandidate[];
}

export interface GenerateTagOptions {
  sample_size?: number;
  max_candidates?: number;
  min_candidates?: number;
}

export async function generateTagCandidates(body: GenerateTagOptions = {}) {
  const res = await fetch(`${API_BASE}/generateTagCandidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Failed to trigger tag generation (${res.status})`);
  }

  return (await res.json()) as {
    message: string;
    upstream_status?: number;
    upstream_response?: string;
  };
}

export async function updateFeatureCandidate(data: UpdateCandidatePayload) {
  const res = await fetch(`${API_BASE}/updateFeatureCandidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Failed to update candidate (${res.status})`);
  }

  return (await res.json()) as { candidate_id: string; status: CandidateStatus };
}

export interface MasterQuery {
  include_inactive?: boolean;
  limit?: number;
}

export async function fetchTagDefinitions(params: MasterQuery = {}): Promise<TagDefinition[]> {
  const query = new URLSearchParams();
  if (params.include_inactive) query.set('include_inactive', 'true');
  if (params.limit) query.set('limit', String(params.limit));

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`${API_BASE}/getTagDefinitions${suffix}`);

  if (!res.ok) {
    throw new Error(`Failed to load tag definitions (${res.status})`);
  }
  return (await res.json()) as TagDefinition[];
}

export async function fetchScoreDefinitions(params: MasterQuery = {}): Promise<ScoreDefinition[]> {
  const query = new URLSearchParams();
  if (params.include_inactive) query.set('include_inactive', 'true');
  if (params.limit) query.set('limit', String(params.limit));

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`${API_BASE}/getScoreDefinitions${suffix}`);

  if (!res.ok) {
    throw new Error(`Failed to load score definitions (${res.status})`);
  }
  return (await res.json()) as ScoreDefinition[];
}

export interface AccountQueryParams {
  account_id?: string;
  account_name?: string;
  tag_id?: string;
  tag_name?: string;
  score_id?: string;
  score_name?: string;
  limit?: number;
}

function buildQuery(params: AccountQueryParams = {}) {
  const query = new URLSearchParams();
  if (params.account_id) query.set('account_id', params.account_id);
  if (params.account_name) query.set('account_name', params.account_name);
  if (params.tag_id) query.set('tag_id', params.tag_id);
  if (params.tag_name) query.set('tag_name', params.tag_name);
  if (params.score_id) query.set('score_id', params.score_id);
  if (params.score_name) query.set('score_name', params.score_name);
  if (params.limit) query.set('limit', String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return suffix;
}

export async function fetchAccountTags(params: AccountQueryParams = {}): Promise<TableResult> {
  const res = await fetch(`${API_BASE}/getAccountTags${buildQuery(params)}`);

  if (!res.ok) {
    throw new Error(`Failed to load account tags (${res.status})`);
  }
  return (await res.json()) as TableResult;
}

export async function fetchAccountScores(params: AccountQueryParams = {}): Promise<TableResult> {
  const res = await fetch(`${API_BASE}/getAccountScores${buildQuery(params)}`);

  if (!res.ok) {
    throw new Error(`Failed to load account scores (${res.status})`);
  }
  return (await res.json()) as TableResult;
}
