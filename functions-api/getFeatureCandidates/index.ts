import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { getPool, sqlTypes } from "../shared/db";

const DEFAULT_TYPE = "behavior_feature";
const DEFAULT_STATUS = "new";

const getFeatureCandidates: AzureFunction = async (
  context: Context,
  req: HttpRequest
): Promise<void> => {
  try {
    const typeParam =
      (req.query.type as string | undefined) ?? DEFAULT_TYPE;
    const statusParam =
      (req.query.status as string | undefined) ?? DEFAULT_STATUS;

    const pool = await getPool();
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
      .input("type", sqlTypes.VarChar(100), typeParam)
      .input("status", sqlTypes.VarChar(100), statusParam)
      .query(query);

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: result.recordset ?? []
    };
  } catch (err) {
    const anyErr = err as any;
    context.log.error("getFeatureCandidates error", err as any);
    context.res = {
    status: 500,
    headers: { "Content-Type": "application/json" },
    body: {
      message: anyErr?.message ?? "Failed to get candidate",
      code: anyErr?.code,
      errno: anyErr?.errno,
      name: anyErr?.name
    }
  };
  }
};

export default getFeatureCandidates;
