import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPool, sqlTypes } from '../shared/db';

type Action = 'adopt' | 'reject';

async function handler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let payload: { candidate_id?: string; action?: Action } | null = null;
  try {
    payload = (await request.json()) as { candidate_id?: string; action?: Action };
  } catch (err) {
    context.warn('Failed to parse update payload', err);
  }

  if (!payload?.candidate_id || !payload?.action) {
    return {
      status: 400,
      jsonBody: { message: 'candidate_id and action are required.' }
    };
  }

  if (!['adopt', 'reject'].includes(payload.action)) {
    return {
      status: 400,
      jsonBody: { message: 'action must be "adopt" or "reject"' }
    };
  }

  const nextStatus = payload.action === 'adopt' ? 'adopted' : 'rejected';

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('candidate_id', sqlTypes.VarChar(100), payload.candidate_id)
      .input('status', sqlTypes.VarChar(50), nextStatus)
      .query(`
        UPDATE feature_candidates
        SET status = @status
        WHERE candidate_id = @candidate_id;
        SELECT @@ROWCOUNT AS affected;
      `);

    const affected = result.rowsAffected?.[0] ?? result.recordset?.[0]?.affected ?? 0;

    if (!affected) {
      return {
        status: 404,
        jsonBody: { message: 'Candidate not found.' }
      };
    }

    return {
      jsonBody: { candidate_id: payload.candidate_id, status: nextStatus }
    };
  } catch (err) {
    context.error('updateFeatureCandidate error', err);
    return {
      status: 500,
      jsonBody: { message: err instanceof Error ? err.message : 'Failed to update candidate' }
    };
  }
}

app.http('updateFeatureCandidate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'updateFeatureCandidate',
  handler
});
