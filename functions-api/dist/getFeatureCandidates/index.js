"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../shared/db");
const DEFAULT_TYPE = "behavior_feature";
const DEFAULT_STATUS = "new";
const getFeatureCandidates = async (context, req) => {
    try {
        const typeParam = req.query.type ?? DEFAULT_TYPE;
        const statusParam = req.query.status ?? DEFAULT_STATUS;
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
            .input("type", db_1.sqlTypes.VarChar(100), typeParam)
            .input("status", db_1.sqlTypes.VarChar(100), statusParam)
            .query(query);
        context.res = {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: result.recordset ?? []
        };
    }
    catch (err) {
        context.log.error("getFeatureCandidates error", err);
        context.res = {
            status: 500,
            headers: { "Content-Type": "application/json" },
            body: {
                message: err instanceof Error
                    ? err.message
                    : "Failed to load feature candidates"
            }
        };
    }
};
exports.default = getFeatureCandidates;
