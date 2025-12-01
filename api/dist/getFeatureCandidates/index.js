"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const db_1 = require("../shared/db");
const DEFAULT_TYPE = 'behavior_feature';
const DEFAULT_STATUS = 'new';
async function handler(request, context) {
    try {
        const url = new URL(request.url);
        const typeParam = url.searchParams.get('type') ?? DEFAULT_TYPE;
        const statusParam = url.searchParams.get('status') ?? DEFAULT_STATUS;
        const pool = await (0, db_1.getPool)();
        const query = `
      SELECT TOP (100)
        candidate_id,
        type,
        source,
        name_proposed,
        description_proposed,
        logic_proposed,
        status,
        created_at
      FROM feature_candidates
      WHERE type = @type AND status = @status
      ORDER BY created_at DESC;
    `;
        const result = await pool
            .request()
            .input('type', db_1.sqlTypes.VarChar(100), typeParam)
            .input('status', db_1.sqlTypes.VarChar(100), statusParam)
            .query(query);
        return {
            jsonBody: result.recordset ?? []
        };
    }
    catch (err) {
        context.error('getFeatureCandidates error', err);
        return {
            status: 500,
            jsonBody: { message: err instanceof Error ? err.message : 'Failed to load feature candidates' }
        };
    }
}
functions_1.app.http('getFeatureCandidates', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'getFeatureCandidates',
    handler
});
