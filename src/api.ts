import { CandidateStatus, CandidateType, FeatureCandidate, UpdateCandidatePayload } from './types';

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

  const payload = (await res.json()) as FeatureCandidate[];
  return payload;
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
