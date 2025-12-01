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
