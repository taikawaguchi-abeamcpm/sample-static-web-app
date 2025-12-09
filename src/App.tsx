import { useCallback, useEffect, useState } from 'react';
import {
  fetchAccountScores,
  fetchAccountTags,
  fetchFeatureCandidates,
  fetchScoreDefinitions,
  fetchTagDefinitions,
  generateTagCandidates,
  updateFeatureCandidate
} from './api';
import type {
  CandidateStatus,
  CandidateType,
  FeatureCandidate,
  ScoreDefinition,
  TableResult,
  TagDefinition
} from './types';

type TabKey = 'candidates' | 'masters' | 'account-evals';

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

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('candidates');

  const [typeFilter, setTypeFilter] = useState<CandidateType>('behavior_feature');
  const [statusFilter, setStatusFilter] = useState<CandidateStatus>('new');
  const [candidates, setCandidates] = useState<FeatureCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<FeatureCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([]);
  const [scoreDefinitions, setScoreDefinitions] = useState<ScoreDefinition[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);

  const [accountIdFilter, setAccountIdFilter] = useState('');
  const [tagIdFilter, setTagIdFilter] = useState('');
  const [scoreIdFilter, setScoreIdFilter] = useState('');
  const [accountLimit, setAccountLimit] = useState(200);
  const [accountTagTable, setAccountTagTable] = useState<TableResult>({ columns: [], rows: [] });
  const [accountScoreTable, setAccountScoreTable] = useState<TableResult>({ columns: [], rows: [] });
  const [accountLoading, setAccountLoading] = useState(false);

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

  const loadMasterData = useCallback(async () => {
    setError(null);
    setMasterLoading(true);
    try {
      const [tags, scores] = await Promise.all([fetchTagDefinitions(), fetchScoreDefinitions()]);
      setTagDefinitions(tags);
      setScoreDefinitions(scores);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load master data');
      setTagDefinitions([]);
      setScoreDefinitions([]);
    } finally {
      setMasterLoading(false);
    }
  }, []);

  const loadAccountEvaluations = useCallback(async () => {
    setError(null);
    setAccountLoading(true);
    try {
      const queryAccountId = accountIdFilter.trim() || undefined;
      const queryTagId = tagIdFilter.trim() || undefined;
      const queryScoreId = scoreIdFilter.trim() || undefined;
      const limit = Number.isFinite(accountLimit) ? accountLimit : 200;

      const [tags, scores] = await Promise.all([
        fetchAccountTags({ account_id: queryAccountId, tag_id: queryTagId, limit }),
        fetchAccountScores({ account_id: queryAccountId, score_id: queryScoreId, limit })
      ]);
      setAccountTagTable(tags);
      setAccountScoreTable(scores);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load account evaluations');
      setAccountTagTable({ columns: [], rows: [] });
      setAccountScoreTable({ columns: [], rows: [] });
    } finally {
      setAccountLoading(false);
    }
  }, [accountIdFilter, accountLimit, scoreIdFilter, tagIdFilter]);

  const handleGenerateTags = async () => {
    setError(null);
    setInfoMessage(null);
    setGenerating(true);
    try {
      const res = await generateTagCandidates();
      setInfoMessage(res.message || 'Triggered tag candidate generation.');
      await loadCandidates();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to trigger tag generation');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'candidates') {
      loadCandidates();
    }
  }, [activeTab, loadCandidates]);

  useEffect(() => {
    if (activeTab === 'masters') {
      loadMasterData();
    } else if (activeTab === 'account-evals') {
      loadAccountEvaluations();
    }
  }, [activeTab, loadAccountEvaluations, loadMasterData]);

  useEffect(() => {
    setError(null);
  }, [activeTab]);

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

  const renderDynamicTable = (data: TableResult, emptyMessage: string) => {
    if (accountLoading) {
      return <div className="empty-state">Loading...</div>;
    }
    if (!data.rows.length) {
      return <div className="empty-state">{emptyMessage}</div>;
    }
    return (
      <div className="table-scroll compact">
        <table>
          <thead>
            <tr>
              {data.columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx}>
                {data.columns.map((col) => (
                  <td key={col}>{formatCell((row as Record<string, unknown>)[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const candidateSection = (
    <>
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
            title={typeFilter !== 'tag' ? 'Switch Type to tag to trigger generation.' : 'Trigger tag generation'}
          >
            {generating ? 'Triggering...' : 'Generate tag candidates'}
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
                      <span className={`status-badge status-${candidate.status}`}>{candidate.status}</span>
                    </td>
                    <td>{formatDate(candidate.created_at)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="detail-panel">{detailPanel}</div>
      </div>
    </>
  );

  const masterSection = (
    <div className="section-grid">
      <div className="table-card">
        <div className="card-header">
          <h3>Adopted Tags</h3>
          <button className="secondary" onClick={loadMasterData} disabled={masterLoading}>
            {masterLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {masterLoading ? (
          <div className="empty-state">Loading tag definitions...</div>
        ) : tagDefinitions.length === 0 ? (
          <div className="empty-state">No tags found.</div>
        ) : (
          <div className="table-scroll compact">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Value Type</th>
                  <th>Source</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {tagDefinitions.map((tag) => (
                  <tr key={tag.tag_id}>
                    <td>{tag.tag_id}</td>
                    <td>{tag.tag_name}</td>
                    <td>{tag.tag_code}</td>
                    <td>{tag.value_type || '-'}</td>
                    <td>{tag.source_type || '-'}</td>
                    <td>{formatDate(tag.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="table-card">
        <div className="card-header">
          <h3>Adopted Scores</h3>
          <button className="secondary" onClick={loadMasterData} disabled={masterLoading}>
            {masterLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {masterLoading ? (
          <div className="empty-state">Loading score definitions...</div>
        ) : scoreDefinitions.length === 0 ? (
          <div className="empty-state">No scores found.</div>
        ) : (
          <div className="table-scroll compact">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Direction</th>
                  <th>Source</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {scoreDefinitions.map((score) => (
                  <tr key={score.score_id}>
                    <td>{score.score_id}</td>
                    <td>{score.score_name}</td>
                    <td>{score.score_code}</td>
                    <td>{score.direction || '-'}</td>
                    <td>{score.source_type || '-'}</td>
                    <td>{formatDate(score.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const accountSection = (
    <>
      <div className="filters">
        <label>
          Account ID
          <input value={accountIdFilter} onChange={(e) => setAccountIdFilter(e.target.value)} placeholder="optional" />
        </label>
        <label>
          Tag ID
          <input value={tagIdFilter} onChange={(e) => setTagIdFilter(e.target.value)} placeholder="optional" />
        </label>
        <label>
          Score ID
          <input value={scoreIdFilter} onChange={(e) => setScoreIdFilter(e.target.value)} placeholder="optional" />
        </label>
        <label>
          Limit
          <input
            type="number"
            min={1}
            max={2000}
            value={accountLimit}
            onChange={(e) => setAccountLimit(Number(e.target.value) || 0)}
          />
        </label>
        <label>
          &nbsp;
          <button className="primary" onClick={loadAccountEvaluations} disabled={accountLoading}>
            {accountLoading ? 'Loading...' : 'Search'}
          </button>
        </label>
      </div>

      <div className="section-grid">
        <div className="table-card">
          <div className="card-header">
            <h3>Account Tags</h3>
          </div>
          {renderDynamicTable(accountTagTable, 'No tag evaluations found.')}
        </div>
        <div className="table-card">
          <div className="card-header">
            <h3>Account Scores</h3>
          </div>
          {renderDynamicTable(accountScoreTable, 'No score evaluations found.')}
        </div>
      </div>
    </>
  );

  return (
    <div className="app-shell">
      <h1>AI Target Console</h1>

      <div className="tab-bar">
        <button className={`tab-button ${activeTab === 'candidates' ? 'active' : ''}`} onClick={() => setActiveTab('candidates')}>
          Feature Candidates
        </button>
        <button className={`tab-button ${activeTab === 'masters' ? 'active' : ''}`} onClick={() => setActiveTab('masters')}>
          Tag/Score Master
        </button>
        <button
          className={`tab-button ${activeTab === 'account-evals' ? 'active' : ''}`}
          onClick={() => setActiveTab('account-evals')}
        >
          Account Evaluations
        </button>
      </div>

      {activeTab === 'candidates' && candidateSection}
      {activeTab === 'masters' && masterSection}
      {activeTab === 'account-evals' && accountSection}

      {infoMessage && <div className="info-box">{infoMessage}</div>}
      {error && <div className="error-box">{error}</div>}
    </div>
  );
}
