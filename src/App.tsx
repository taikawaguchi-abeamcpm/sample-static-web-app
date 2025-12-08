import { useCallback, useEffect, useState } from 'react';
import { fetchFeatureCandidates, generateTagCandidates, updateFeatureCandidate } from './api';
import type { CandidateStatus, CandidateType, FeatureCandidate } from './types';

const typeOptions: CandidateType[] = ['behavior_feature', 'tag', 'score'];
const statusOptions: CandidateStatus[] = ['new', 'adopted', 'rejected'];

function formatDate(value?: string) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch (err) {
    console.warn('Failed to format date', err);
    return value;
  }
}

export default function App() {
  const [typeFilter, setTypeFilter] = useState<CandidateType>('behavior_feature');
  const [statusFilter, setStatusFilter] = useState<CandidateStatus>('new');
  const [candidates, setCandidates] = useState<FeatureCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<FeatureCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await fetchFeatureCandidates({ type: typeFilter, status: statusFilter });
      setCandidates(list);
      setSelectedCandidate((prev) => (prev ? list.find((c) => c.candidate_id === prev.candidate_id) ?? null : null));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to fetch candidates');
      setCandidates([]);
      setSelectedCandidate(null);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  const handleGenerateTags = async () => {
    setError(null);
    setInfoMessage(null);
    setGenerating(true);
    try {
      const res = await generateTagCandidates();
      setInfoMessage(res.message || 'タグ候補生成をトリガーしました。');
      await loadCandidates();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to trigger tag generation');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleAction = async (action: 'adopt' | 'reject') => {
    if (!selectedCandidate) return;
    setUpdating(true);
    setError(null);
    try {
      await updateFeatureCandidate({ candidate_id: selectedCandidate.candidate_id, action });
      await loadCandidates();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to update candidate');
    } finally {
      setUpdating(false);
    }
  };

  const detailPanel = selectedCandidate ? (
    <div>
      <h2>{selectedCandidate.name_proposed}</h2>
      <p>
        <strong>Source:</strong> {selectedCandidate.source}
      </p>
      <p>
        <strong>Status:</strong> {selectedCandidate.status}
      </p>
      <section>
        <h3>Description</h3>
        <p>{selectedCandidate.description_proposed || 'n/a'}</p>
      </section>
      <section>
        <h3>Logic Proposal</h3>
        <pre>{selectedCandidate.logic_proposed || 'n/a'}</pre>
      </section>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="secondary" disabled={updating} onClick={() => handleAction('adopt')}>
          Adopt
        </button>
        <button className="danger" disabled={updating} onClick={() => handleAction('reject')}>
          Reject
        </button>
      </div>
    </div>
  ) : (
    <div className="empty-state">Select a candidate to review details.</div>
  );

  return (
    <div className="app-shell">
      <h1>Feature Candidate Review</h1>
      <div className="filters">
        <label>
          Type
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as CandidateType)}>
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CandidateStatus)}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          &nbsp;
          <button className="primary" onClick={loadCandidates} disabled={loading}>
            {loading ? 'Loading...' : 'Search'}
          </button>
        </label>
        <label>
          &nbsp;
          <button
            className="primary"
            onClick={handleGenerateTags}
            disabled={generating || loading || typeFilter !== 'tag'}
            title={typeFilter !== 'tag' ? 'Type を tag にすると有効化されます' : 'タグ候補生成をトリガーします'}
          >
            {generating ? '生成中...' : 'タグ候補生成'}
          </button>
        </label>
      </div>

      <div className="table-wrapper">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name Proposal</th>
                <th>Source</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">Loading data...</div>
                  </td>
                </tr>
              )}
              {!loading && candidates.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">No candidates found.</div>
                  </td>
                </tr>
              )}
              {!loading &&
                candidates.map((candidate) => (
                  <tr
                    key={candidate.candidate_id}
                    onClick={() => setSelectedCandidate(candidate)}
                    style={{ backgroundColor: candidate.candidate_id === selectedCandidate?.candidate_id ? '#eef2ff' : undefined }}
                  >
                    <td>{candidate.candidate_id}</td>
                    <td>{candidate.name_proposed}</td>
                    <td>{candidate.source}</td>
                    <td>
                      <span className={`status-badge status-${candidate.status}`}>
                        {candidate.status}
                      </span>
                    </td>
                    <td>{formatDate(candidate.created_at)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="detail-panel">{detailPanel}</div>
      </div>

      {infoMessage && <div className="info-box">{infoMessage}</div>}
      {error && <div className="error-box">{error}</div>}
    </div>
  );
}
