"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const db_1 = require("../shared/db");
async function handler(request, context) {
    let payload = null;
    try {
        payload = (await request.json());
    }
    catch (err) {
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
        const pool = await (0, db_1.getPool)();
        const result = await pool
            .request()
            .input('candidate_id', db_1.sqlTypes.VarChar(100), payload.candidate_id)
            .input('status', db_1.sqlTypes.VarChar(50), nextStatus)
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
    }
    catch (err) {
        context.error('updateFeatureCandidate error', err);
        return {
            status: 500,
            jsonBody: { message: err instanceof Error ? err.message : 'Failed to update candidate' }
        };
    }
}
functions_1.app.http('updateFeatureCandidate', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'updateFeatureCandidate',
    handler
});
