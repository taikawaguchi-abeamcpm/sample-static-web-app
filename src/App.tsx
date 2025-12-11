import { useCallback, useEffect, useState } from 'react';
import {
  fetchAccountScores,
  fetchAccountTags,
  fetchFeatureCandidates,
  createScoreDefinition,
  createTagDefinition,
  deleteScoreDefinition,
  deleteTagDefinition,
  fetchScoreDefinitions,
  fetchTagDefinitions,
  generateTagCandidates,
  updateTagDefinition,
  updateScoreDefinition,
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

function formatCsvCell(value: unknown) {
  const normalized = value === null || value === undefined ? '' : String(value);
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
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
  const [masterSaving, setMasterSaving] = useState(false);
  const [showTagAccordion, setShowTagAccordion] = useState(false);
  const [showScoreAccordion, setShowScoreAccordion] = useState(false);
  const [tagCreateForm, setTagCreateForm] = useState({ tag_name: '', description: '' });
  const [tagEditForm, setTagEditForm] = useState({ tag_name: '', description: '' });
  const [selectedTagId, setSelectedTagId] = useState('');
  const [scoreCreateForm, setScoreCreateForm] = useState({ score_name: '', description: '' });
  const [scoreEditForm, setScoreEditForm] = useState({ score_name: '', description: '' });
  const [selectedScoreId, setSelectedScoreId] = useState('');

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
      setError(err instanceof Error ? err.message : 'マスタの取得に失敗しました');
      setTagDefinitions([]);
      setScoreDefinitions([]);
    } finally {
      setMasterLoading(false);
    }
  }, []);

  const loadAccountEvaluations = async () => {
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
  };

  const handleDownloadAccountCsv = useCallback(() => {
    const table = accountViewType === 'tag' ? accountTagTable : accountScoreTable;
    if (!table.rows.length) {
      setInfoMessage('ダウンロード対象の行がありません');
      return;
    }

    const header = table.columns.map(formatCsvCell).join(',');
    const rows = table.rows
      .map((row) => table.columns.map((col) => formatCsvCell((row as Record<string, unknown>)[col])).join(','))
      .join('\r\n');
    const csv = [header, rows].filter(Boolean).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileName = `${accountViewType}-evaluations_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }, [accountScoreTable, accountTagTable, accountViewType]);

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
  }, [activeTab, loadMasterData]);

  useEffect(() => {
    setError(null);
  }, [activeTab]);

  useEffect(() => {
    if (tagDefinitions.length && !selectedTagId) {
      const first = tagDefinitions[0];
      setSelectedTagId(first.tag_id);
      setTagEditForm({ tag_name: first.tag_name || '', description: first.description ?? '' });
    }
  }, [selectedTagId, tagDefinitions]);

  useEffect(() => {
    const target = tagDefinitions.find((t) => t.tag_id === selectedTagId);
    if (target) {
      setTagEditForm({ tag_name: target.tag_name || '', description: target.description ?? '' });
    } else {
      setTagEditForm({ tag_name: '', description: '' });
    }
  }, [selectedTagId, tagDefinitions]);

  useEffect(() => {
    if (scoreDefinitions.length && !selectedScoreId) {
      const first = scoreDefinitions[0];
      setSelectedScoreId(first.score_id);
      setScoreEditForm({ score_name: first.score_name || '', description: first.description ?? '' });
    }
  }, [scoreDefinitions, selectedScoreId]);

  useEffect(() => {
    const target = scoreDefinitions.find((s) => s.score_id === selectedScoreId);
    if (target) {
      setScoreEditForm({ score_name: target.score_name || '', description: target.description ?? '' });
    } else {
      setScoreEditForm({ score_name: '', description: '' });
    }
  }, [scoreDefinitions, selectedScoreId]);

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

  const handleCreateTagMaster = async () => {
    const tag_name = tagCreateForm.tag_name.trim();
    const description = tagCreateForm.description.trim();

    if (!tag_name) {
      setError('タグ名称を入力してください');
      return;
    }

    setMasterSaving(true);
    setError(null);
    setInfoMessage(null);
    try {
      await createTagDefinition({
        tag_name,
        description: description || undefined,
        value_type: 'string',
        source_type: 'manual',
        is_multi_valued: false
      });
      setInfoMessage('タグを登録しました');
      setTagCreateForm({ tag_name: '', description: '' });
      await loadMasterData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'タグの登録に失敗しました');
    } finally {
      setMasterSaving(false);
    }
  };

  const handleUpdateTagMaster = async () => {
    if (!selectedTagId) {
      setError('更新するタグを選択してください');
      return;
    }
    const tag_name = tagEditForm.tag_name.trim();
    const description = tagEditForm.description.trim();
    if (!tag_name && !description) {
      setError('名称または説明を入力してください');
      return;
    }

    setMasterSaving(true);
    setError(null);
    setInfoMessage(null);
    try {
      await updateTagDefinition({
        tag_id: selectedTagId,
        tag_name: tag_name || undefined,
        description: description || undefined
      });
      setInfoMessage('タグを更新しました');
      await loadMasterData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'タグの更新に失敗しました');
    } finally {
      setMasterSaving(false);
    }
  };

  const handleDeleteTagMaster = async () => {
    if (!selectedTagId) {
      setError('削除するタグを選択してください');
      return;
    }
    if (!window.confirm('選択中のタグを削除しますか？')) {
      return;
    }
    setMasterSaving(true);
    setError(null);
    setInfoMessage(null);
    try {
      await deleteTagDefinition(selectedTagId);
      setInfoMessage('タグを削除しました');
      setSelectedTagId('');
      setTagEditForm({ tag_name: '', description: '' });
      await loadMasterData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'タグの削除に失敗しました');
    } finally {
      setMasterSaving(false);
    }
  };

  const handleCreateScoreMaster = async () => {
    const score_name = scoreCreateForm.score_name.trim();
    const description = scoreCreateForm.description.trim();

    if (!score_name) {
      setError('スコア名称を入力してください');
      return;
    }

    setMasterSaving(true);
    setError(null);
    setInfoMessage(null);
    try {
      await createScoreDefinition({
        score_name,
        description: description || undefined,
        direction: 'higher_is_better',
        source_type: 'manual'
      });
      setInfoMessage('スコアを登録しました');
      setScoreCreateForm({ score_name: '', description: '' });
      await loadMasterData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'スコアの登録に失敗しました');
    } finally {
      setMasterSaving(false);
    }
  };

  const handleUpdateScoreMaster = async () => {
    if (!selectedScoreId) {
      setError('更新するスコアを選択してください');
      return;
    }
    const score_name = scoreEditForm.score_name.trim();
    const description = scoreEditForm.description.trim();
    if (!score_name && !description) {
      setError('名称または説明を入力してください');
      return;
    }

    setMasterSaving(true);
    setError(null);
    setInfoMessage(null);
    try {
      await updateScoreDefinition({
        score_id: selectedScoreId,
        score_name: score_name || undefined,
        description: description || undefined
      });
      setInfoMessage('スコアを更新しました');
      await loadMasterData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'スコアの更新に失敗しました');
    } finally {
      setMasterSaving(false);
    }
  };

  const handleDeleteScoreMaster = async () => {
    if (!selectedScoreId) {
      setError('削除するスコアを選択してください');
      return;
    }
    if (!window.confirm('選択中のスコアを削除しますか？')) {
      return;
    }

    setMasterSaving(true);
    setError(null);
    setInfoMessage(null);
    try {
      await deleteScoreDefinition(selectedScoreId);
      setInfoMessage('スコアを削除しました');
      setSelectedScoreId('');
      setScoreEditForm({ score_name: '', description: '' });
      await loadMasterData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'スコアの削除に失敗しました');
    } finally {
      setMasterSaving(false);
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

      <div className="table-wrapper candidates-grid">
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
          <h3>タグ/スコア マスタ</h3>
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
          <div className="empty-state">マスタを読込中...</div>
        ) : masterType === 'tag' ? (
          <>
            <div className="form-block">
              <div className="accordion-header">
                <h4>タグ登録 / 更新</h4>
                <button className="secondary" onClick={() => setShowTagAccordion((v) => !v)}>
                  {showTagAccordion ? '閉じる' : '開く'}
                </button>
              </div>
              {showTagAccordion && (
                <>
                  <div className="form-grid">
                    <label>
                      タグ名称 *
                      <input
                        value={tagCreateForm.tag_name}
                        onChange={(e) => setTagCreateForm({ ...tagCreateForm, tag_name: e.target.value })}
                        placeholder="画面表示用の名称"
                      />
                    </label>
                    <label className="wide">
                      説明
                      <textarea
                        rows={2}
                        value={tagCreateForm.description}
                        onChange={(e) => setTagCreateForm({ ...tagCreateForm, description: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button className="primary" onClick={handleCreateTagMaster} disabled={masterSaving}>
                      {masterSaving ? '処理中...' : '登録'}
                    </button>
                  </div>

                  <div className="divider" />

                  <label>
                    対象タグ
                    <select value={selectedTagId} onChange={(e) => setSelectedTagId(e.target.value)}>
                      <option value="">選択してください</option>
                      {tagDefinitions.map((tag) => (
                        <option key={tag.tag_id} value={tag.tag_id}>
                          {tag.tag_name} ({tag.tag_id})
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-grid">
                    <label>
                      名称
                      <input
                        value={tagEditForm.tag_name}
                        onChange={(e) => setTagEditForm({ ...tagEditForm, tag_name: e.target.value })}
                      />
                    </label>
                    <label className="wide">
                      説明
                      <textarea
                        rows={2}
                        value={tagEditForm.description}
                        onChange={(e) => setTagEditForm({ ...tagEditForm, description: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button className="primary" onClick={handleUpdateTagMaster} disabled={!selectedTagId || masterSaving}>
                      {masterSaving ? '処理中...' : '更新'}
                    </button>
                    <button className="danger" onClick={handleDeleteTagMaster} disabled={!selectedTagId || masterSaving}>
                      削除
                    </button>
                  </div>
                </>
              )}
            </div>

            {tagDefinitions.length === 0 ? (
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
            )}
          </>
        ) : (
          <>
            <div className="form-block">
              <div className="accordion-header">
                <h4>スコア登録 / 更新</h4>
                <button className="secondary" onClick={() => setShowScoreAccordion((v) => !v)}>
                  {showScoreAccordion ? '閉じる' : '開く'}
                </button>
              </div>
              {showScoreAccordion && (
                <>
                  <div className="form-grid">
                    <label>
                      スコア名称 *
                      <input
                        value={scoreCreateForm.score_name}
                        onChange={(e) => setScoreCreateForm({ ...scoreCreateForm, score_name: e.target.value })}
                        placeholder="画面表示用の名称"
                      />
                    </label>
                    <label className="wide">
                      説明
                      <textarea
                        rows={2}
                        value={scoreCreateForm.description}
                        onChange={(e) => setScoreCreateForm({ ...scoreCreateForm, description: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button className="primary" onClick={handleCreateScoreMaster} disabled={masterSaving}>
                      {masterSaving ? '処理中...' : '登録'}
                    </button>
                  </div>

                  <div className="divider" />

                  <label>
                    対象スコア
                    <select value={selectedScoreId} onChange={(e) => setSelectedScoreId(e.target.value)}>
                      <option value="">選択してください</option>
                      {scoreDefinitions.map((score) => (
                        <option key={score.score_id} value={score.score_id}>
                          {score.score_name} ({score.score_id})
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-grid">
                    <label>
                      名称
                      <input
                        value={scoreEditForm.score_name}
                        onChange={(e) => setScoreEditForm({ ...scoreEditForm, score_name: e.target.value })}
                      />
                    </label>
                    <label className="wide">
                      説明
                      <textarea
                        rows={2}
                        value={scoreEditForm.description}
                        onChange={(e) => setScoreEditForm({ ...scoreEditForm, description: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button className="primary" onClick={handleUpdateScoreMaster} disabled={!selectedScoreId || masterSaving}>
                      {masterSaving ? '処理中...' : '更新'}
                    </button>
                    <button className="danger" onClick={handleDeleteScoreMaster} disabled={!selectedScoreId || masterSaving}>
                      削除
                    </button>
                  </div>
                </>
              )}
            </div>

            {scoreDefinitions.length === 0 ? (
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
          </>
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
            <button className="secondary" onClick={handleDownloadAccountCsv} disabled={accountTagTable.rows.length === 0}>
              CSVダウンロード
            </button>
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
            <button className="secondary" onClick={handleDownloadAccountCsv} disabled={accountScoreTable.rows.length === 0}>
              CSVダウンロード
            </button>
          </div>
          {renderDynamicTable(accountScoreTable, 'スコアの評価がありません。', 'account-table')}
        </div>
      )}
    </div>
  </>
);

const quickStats = [
  { label: '候補', caption: 'フィルタ結果' },
  { label: 'タグマスタ', caption: '登録済み' },
  { label: 'スコアマスタ', caption: '登録済み' }
];

  return (
    <div className="app-shell">
      <div className="page-header">
        <div className="page-title">
          <p className="eyebrow">レベニュープロセス基盤</p>
          <h1>AI Targeting Platform</h1>
          <p className="lede">
            AIが顧客データから見つけたタグ/スコアを登録して、当てはまる企業をリストアップしましょう。
          </p>
        </div>
        <div className="hero-metrics">
          {quickStats.map((item) => {
            const count =
              item.label === '候補'
                ? candidates.length
                : item.label === 'タグマスタ'
                ? tagDefinitions.length
                : scoreDefinitions.length;
            const display = count ? `${count}件` : '--';
            return (
              <div className="metric-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{display}</strong>
                <small>{item.caption}</small>
              </div>
            );
          })}
        </div>
      </div>

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
