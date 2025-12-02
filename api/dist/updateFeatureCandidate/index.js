"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../shared/db");
const updateFeatureCandidate = async (context, req) => {
    let payload = null;
    try {
        payload = (req.body ?? null);
    }
    catch (err) {
        context.log.warn("Failed to parse update payload", err);
    }
    if (!payload?.candidate_id || !payload?.action) {
        context.res = {
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: { message: "candidate_id and action are required." }
        };
        return;
    }
    if (!["adopt", "reject"].includes(payload.action)) {
        context.res = {
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: { message: 'action must be "adopt" or "reject"' }
        };
        return;
    }
    const nextStatus = payload.action === "adopt" ? "adopted" : "rejected";
    try {
        const pool = await (0, db_1.getPool)();
        const result = await pool
            .request()
            .input("candidate_id", db_1.sqlTypes.VarChar(100), payload.candidate_id)
            .input("status", db_1.sqlTypes.VarChar(50), nextStatus)
            .query(`
        UPDATE feature_candidates
        SET status = @status
        WHERE candidate_id = @candidate_id;
        SELECT @@ROWCOUNT AS affected;
      `);
        const affected = result.rowsAffected?.[0] ?? result.recordset?.[0]?.affected ?? 0;
        if (!affected) {
            context.res = {
                status: 404,
                headers: { "Content-Type": "application/json" },
                body: { message: "Candidate not found." }
            };
            return;
        }
        context.res = {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: { candidate_id: payload.candidate_id, status: nextStatus }
        };
    }
    catch (err) {
        context.log.error("updateFeatureCandidate error", err);
        context.res = {
            status: 500,
            headers: { "Content-Type": "application/json" },
            body: {
                message: err instanceof Error ? err.message : "Failed to update candidate"
            }
        };
    }
};
exports.default = updateFeatureCandidate;
