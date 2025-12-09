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

const typeOptions: CandidateType[] = ['tag', 'score', 'behavior_feature'];
const statusOptions: CandidateStatus[] = ['new', 'adopted', 'rejected'];

function formatDate(value?: string) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch (err) {
    console.warn('日付のフォーマットに失敗しました', err);
    return value;
  }
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  return String(value);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('candidates');

  const [typeFilter, setTypeFilter] = useState<CandidateType>('tag');
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
  const [masterType, setMasterType] = useState<'tag' | 'score'>('tag');

  const [accountNameFilter, setAccountNameFilter] = useState('');
  const [tagNameFilter, setTagNameFilter] = useState('');
  const [scoreNameFilter, setScoreNameFilter] = useState('');
  const [accountLimit, setAccountLimit] = useState(200);
  const [accountTagTable, setAccountTagTable] = useState<TableResult>({ columns: [], rows: [] });
  const [accountScoreTable, setAccountScoreTable] = useState<TableResult>({ columns: [], rows: [] });
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountViewType, setAccountViewType] = useState<'tag' | 'score'>('tag');

  const loadCandidates = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await fetchFeatureCandidates({ type: typeFilter, status: statusFilter });
      setCandidates(list);
      setSelectedCandidate((prev) => (prev ? list.find((c) => c.candidate_id === prev.candidate_id) ?? null : null));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '候補の取得に失敗しました');
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
      setError(err instanceof Error ? err.message : 'マスターの取得に失敗しました');
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
      const queryAccountName = accountNameFilter.trim() || undefined;
      const queryTagName = tagNameFilter.trim() || undefined;
      const queryScoreName = scoreNameFilter.trim() || undefined;
      const limit = Number.isFinite(accountLimit) ? accountLimit : 200;

      const [tags, scores] = await Promise.all([
        fetchAccountTags({ account_name: queryAccountName, tag_name: queryTagName, limit }),
        fetchAccountScores({ account_name: queryAccountName, score_name: queryScoreName, limit })
      ]);
      setAccountTagTable(tags);
      setAccountScoreTable(scores);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'アカウントの評価情報取得に失敗しました');
      setAccountTagTable({ columns: [], rows: [] });
      setAccountScoreTable({ columns: [], rows: [] });
    } finally {
      setAccountLoading(false);
    }
  }, [accountLimit, accountNameFilter, scoreNameFilter, tagNameFilter]);

  const handleGenerateTags = async () => {
    setError(null);
    setInfoMessage(null);
    setGenerating(true);
    try {
      const res = await generateTagCandidates();
      setInfoMessage(res.message || 'タグ候補の生成をトリガーしました。');
      await loadCandidates();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'タグ生成の呼び出しに失敗しました');
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
      setError(err instanceof Error ? err.message : '候補の更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const detailPanel = selectedCandidate ? (
    <div>
      <h2>{selectedCandidate.name_proposed}</h2>
      <p>
        <strong>ソース:</strong> {selectedCandidate.source}
      </p>
      <p>
        <strong>ステータス:</strong> {selectedCandidate.status}
      </p>
      <section>
        <h3>説明</h3>
        <p>{selectedCandidate.description_proposed || 'なし'}</p>
      </section>
      <section>
        <h3>算出ロジック案</h3>
        <pre>{selectedCandidate.logic_proposed || 'なし'}</pre>
      </section>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="secondary" disabled={updating} onClick={() => handleAction('adopt')}>
          採用
        </button>
        <button className="danger" disabled={updating} onClick={() => handleAction('reject')}>
          却下
        </button>
      </div>
    </div>
  ) : (
    <div className="empty-state">詳細を確認する候補を選択してください。</div>
  );

  const renderDynamicTable = (data: TableResult, emptyMessage: string, className?: string) => {
    if (accountLoading) {
      return <div className="empty-state">読込中...</div>;
    }
    if (!data.rows.length) {
      return <div className="empty-state">{emptyMessage}</div>;
    }
    return (
      <div className="table-scroll compact">
        <table className={className}>
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
          種別
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as CandidateType)}>
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          ステータス
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
            {loading ? '読込中...' : '検索'}
          </button>
        </label>
        <label>
          &nbsp;
          <button
            className="primary"
            onClick={handleGenerateTags}
            disabled={generating || loading || typeFilter !== 'tag'}
            title={typeFilter !== 'tag' ? '種別を tag にすると生成できます' : 'タグ候補生成を実行'}
          >
            {generating ? '実行中...' : 'タグ候補を生成'}
          </button>
        </label>
      </div>

      <div className="table-wrapper">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>提案名</th>
                <th>ソース</th>
                <th>ステータス</th>
                <th>作成日時</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">データを読込中...</div>
                  </td>
                </tr>
              )}
              {!loading && candidates.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">候補が見つかりません。</div>
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
          <h3>マスター一覧</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select value={masterType} onChange={(e) => setMasterType(e.target.value as 'tag' | 'score')}>
              <option value="tag">タグ</option>
              <option value="score">スコア</option>
            </select>
            <button className="secondary" onClick={loadMasterData} disabled={masterLoading}>
              {masterLoading ? '読込中...' : '再読込'}
            </button>
          </div>
        </div>
        {masterLoading ? (
          <div className="empty-state">マスターを読込中...</div>
        ) : masterType === 'tag' ? (
          tagDefinitions.length === 0 ? (
            <div className="empty-state">タグが見つかりません。</div>
          ) : (
            <div className="table-scroll compact">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>名称</th>
                    <th>説明</th>
                    <th>作成日時</th>
                  </tr>
                </thead>
                <tbody>
                  {tagDefinitions.map((tag) => (
                    <tr key={tag.tag_id}>
                      <td>{tag.tag_id}</td>
                      <td>{tag.tag_name}</td>
                      <td>{tag.description || '-'}</td>
                      <td>{formatDate(tag.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : scoreDefinitions.length === 0 ? (
          <div className="empty-state">スコアが見つかりません。</div>
        ) : (
          <div className="table-scroll compact">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>名称</th>
                  <th>コード</th>
                  <th>方向性</th>
                  <th>ソース</th>
                  <th>更新日時</th>
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
        企業名
        <input value={accountNameFilter} onChange={(e) => setAccountNameFilter(e.target.value)} placeholder="キーワードで検索" />
      </label>
      <label>
        タグ名
        <input value={tagNameFilter} onChange={(e) => setTagNameFilter(e.target.value)} placeholder="キーワードで検索" />
      </label>
      <label>
        スコア名
        <input value={scoreNameFilter} onChange={(e) => setScoreNameFilter(e.target.value)} placeholder="キーワードで検索" />
      </label>
      <label>
        最大件数
        <input
          type="number"
          min={1}
          max={2000}
          value={accountLimit}
          onChange={(e) => setAccountLimit(Number(e.target.value) || 0)}
        />
      </label>
      <label>
        表示
        <select value={accountViewType} onChange={(e) => setAccountViewType(e.target.value as 'tag' | 'score')}>
          <option value="tag">タグ</option>
          <option value="score">スコア</option>
        </select>
      </label>
      <label>
        &nbsp;
        <button className="primary" onClick={loadAccountEvaluations} disabled={accountLoading}>
          {accountLoading ? '読込中...' : '検索'}
        </button>
      </label>
    </div>

    <div className="section-grid">
      {accountViewType === 'tag' ? (
        <div className="table-card">
          <div className="card-header">
            <h3>企業タグ</h3>
          </div>
          <div className="table-scroll compact">
            <table className="account-table">
              <colgroup>
                <col className="col-account" />
                <col className="col-tag" />
                <col className="col-value" />
                <col className="col-confidence" />
                <col className="col-created" />
              </colgroup>
              <thead>
                <tr>
                  <th>企業名</th>
                  <th>タグ</th>
                  <th>判断材料となった活動</th>
                  <th>信頼度</th>
                  <th>作成日時</th>
                </tr>
              </thead>
              <tbody>
                {accountTagTable.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">タグの評価がありません。</div>
                    </td>
                  </tr>
                ) : (
                  accountTagTable.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td>{formatCell((row as Record<string, unknown>)['account_name'])}</td>
                      <td>{formatCell((row as Record<string, unknown>)['tag_name'])}</td>
                      <td>{formatCell((row as Record<string, unknown>)['tag_value'])}</td>
                      <td>{formatCell((row as Record<string, unknown>)['confidence_score'])}</td>
                      <td>{formatDate((row as Record<string, string>)['created_at'])}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="table-card">
          <div className="card-header">
            <h3>企業スコア</h3>
          </div>
          {renderDynamicTable(accountScoreTable, 'スコアの評価がありません。', 'account-table')}
        </div>
      )}
    </div>
  </>
);

  return (
    <div className="app-shell">
      <h1>AI Targeting Platform</h1>

      <div className="tab-bar">
        <button className={`tab-button ${activeTab === 'candidates' ? 'active' : ''}`} onClick={() => setActiveTab('candidates')}>
          タグ・スコア候補レビュー
        </button>
        <button className={`tab-button ${activeTab === 'masters' ? 'active' : ''}`} onClick={() => setActiveTab('masters')}>
          タグ/スコア マスタ
        </button>
        <button
          className={`tab-button ${activeTab === 'account-evals' ? 'active' : ''}`}
          onClick={() => setActiveTab('account-evals')}
        >
          企業分析結果
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
