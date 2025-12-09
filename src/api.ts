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

export interface CreateTagPayload {
  tag_name: string;
  tag_code?: string;
  description?: string;
  is_multi_valued?: boolean;
  value_type?: string;
  source_type?: string;
}

export async function createTagDefinition(payload: CreateTagPayload) {
  const res = await fetch(`${API_BASE}/createTagDefinition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Failed to create tag (${res.status})`);
  }
  return (await res.json()) as TagDefinition;
}

export interface UpdateTagPayload {
  tag_id: string;
  tag_name?: string;
  description?: string;
}

export async function updateTagDefinition(payload: UpdateTagPayload) {
  const res = await fetch(`${API_BASE}/updateTagDefinition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Failed to update tag (${res.status})`);
  }
  return (await res.json()) as TagDefinition;
}

export async function deleteTagDefinition(tag_id: string) {
  const res = await fetch(`${API_BASE}/deleteTagDefinition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_id })
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Failed to delete tag (${res.status})`);
  }
  return (await res.json()) as { tag_id: string; status: string };
}

export interface CreateScorePayload {
  score_name: string;
  score_code?: string;
  description?: string;
  min_value?: number;
  max_value?: number;
  direction?: string;
  source_type?: string;
  refresh_interval?: string | number;
}

export async function createScoreDefinition(payload: CreateScorePayload) {
  const res = await fetch(`${API_BASE}/createScoreDefinition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Failed to create score (${res.status})`);
  }
  return (await res.json()) as ScoreDefinition;
}

export interface UpdateScorePayload {
  score_id: string;
  score_name?: string;
  description?: string;
}

export async function updateScoreDefinition(payload: UpdateScorePayload) {
  const res = await fetch(`${API_BASE}/updateScoreDefinition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Failed to update score (${res.status})`);
  }
  return (await res.json()) as ScoreDefinition;
}

export async function deleteScoreDefinition(score_id: string) {
  const res = await fetch(`${API_BASE}/deleteScoreDefinition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score_id })
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Failed to delete score (${res.status})`);
  }
  return (await res.json()) as { score_id: string; status: string };
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
