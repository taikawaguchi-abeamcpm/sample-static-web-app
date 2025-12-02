import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { getPool, sqlTypes } from "../shared/db";

type Action = "adopt" | "reject";

const updateFeatureCandidate: AzureFunction = async (
  context: Context,
  req: HttpRequest
): Promise<void> => {
  let payload: { candidate_id?: string; action?: Action } | null = null;

  try {
    payload = (req.body ?? null) as { candidate_id?: string; action?: Action } | null;
  } catch (err) {
    context.log.warn("Failed to parse update payload", err as any);
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
    const pool = await getPool();
    const result = await pool
      .request()
      .input("candidate_id", sqlTypes.VarChar(100), payload.candidate_id)
      .input("status", sqlTypes.VarChar(50), nextStatus)
      .query(`
        UPDATE feature_candidates
        SET status = @status
        WHERE candidate_id = @candidate_id;
        SELECT @@ROWCOUNT AS affected;
      `);

    const affected =
      result.rowsAffected?.[0] ?? result.recordset?.[0]?.affected ?? 0;

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
  } catch (err) {
    context.log.error("updateFeatureCandidate error", err as any);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        message:
          err instanceof Error ? err.message : "Failed to update candidate"
      }
    };
  }
};

export default updateFeatureCandidate;
