import { Request, Response } from "express";
import pool from "../utils/db";
import { getAcademicTableNames } from "../utils/studentPortalAccess";

type BatchAllocationType = "classroom" | "lab";

interface BatchAllocationRow {
  id: number;
  batch_id: number;
  allocation_type: BatchAllocationType;
  location: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const ALLOCATION_TYPES = new Set<BatchAllocationType>(["classroom", "lab"]);

let batchAllocationsTableReadyPromise: Promise<void> | null = null;

const getAuthenticatedAdminId = (
  req: Request,
  res: Response,
): number | null => {
  const authUser =
    req && typeof req === "object" && "user" in req
      ? ((req as Request & { user?: { userId?: unknown; role?: unknown } }).user ??
          null)
      : null;
  const userId = Number(authUser?.userId);
  const role = String(authUser?.role ?? "").trim().toLowerCase();

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({ error: "Authentication is required." });
    return null;
  }

  if (role !== "admin") {
    res.status(403).json({ error: "Only admin users can manage batch allocations." });
    return null;
  }

  return userId;
};

const ensureBatchAllocationsTable = async (): Promise<void> => {
  if (!batchAllocationsTableReadyPromise) {
    batchAllocationsTableReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS batch_allocations (
          allocation_id SERIAL PRIMARY KEY,
          batch_id INTEGER NOT NULL,
          allocation_type VARCHAR(20) NOT NULL CHECK (allocation_type IN ('classroom', 'lab')),
          location VARCHAR(255) NOT NULL,
          notes TEXT,
          created_by INTEGER,
          updated_by INTEGER,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(
        "ALTER TABLE batch_allocations ADD COLUMN IF NOT EXISTS batch_id INTEGER",
      );
      await pool.query(
        "ALTER TABLE batch_allocations ADD COLUMN IF NOT EXISTS allocation_type VARCHAR(20)",
      );
      await pool.query(
        "ALTER TABLE batch_allocations ADD COLUMN IF NOT EXISTS location VARCHAR(255)",
      );
      await pool.query(
        "ALTER TABLE batch_allocations ADD COLUMN IF NOT EXISTS notes TEXT",
      );
      await pool.query(
        "ALTER TABLE batch_allocations ADD COLUMN IF NOT EXISTS created_by INTEGER",
      );
      await pool.query(
        "ALTER TABLE batch_allocations ADD COLUMN IF NOT EXISTS updated_by INTEGER",
      );
      await pool.query(
        "ALTER TABLE batch_allocations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      );
      await pool.query(
        "ALTER TABLE batch_allocations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      );

      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_batch_allocations_batch_id ON batch_allocations (batch_id)",
      );
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_batch_allocations_type ON batch_allocations (allocation_type)",
      );
      await pool.query(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_allocations_unique_batch_type ON batch_allocations (batch_id, allocation_type)",
      );
    })().catch((error) => {
      batchAllocationsTableReadyPromise = null;
      throw error;
    });
  }

  await batchAllocationsTableReadyPromise;
};

const normalizeAllocationType = (value: unknown): BatchAllocationType | null => {
  const allocationType = String(value ?? "").trim().toLowerCase();
  return ALLOCATION_TYPES.has(allocationType as BatchAllocationType)
    ? (allocationType as BatchAllocationType)
    : null;
};

const toNullablePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const normalizeText = (value: unknown, maxLength = 255): string =>
  String(value ?? "").trim().slice(0, maxLength);

const mapBatchAllocationRow = (
  row: Record<string, unknown>,
): BatchAllocationRow => ({
  id: Number(row.id ?? row.allocation_id),
  batch_id: Number(row.batch_id),
  allocation_type:
    normalizeAllocationType(row.allocation_type) ?? "classroom",
  location: normalizeText(row.location),
  notes: normalizeText(row.notes, 2000) || null,
  created_at: String(row.created_at ?? ""),
  updated_at: String(row.updated_at ?? ""),
});

const ensureBatchExists = async (batchId: number): Promise<boolean> => {
  const { batchTableName } = await getAcademicTableNames(pool);
  if (!batchTableName) {
    return true;
  }

  const result = await pool.query(
    `SELECT id FROM ${batchTableName} WHERE id = $1 LIMIT 1`,
    [batchId],
  );
  return result.rows.length > 0;
};

export const getBatchAllocations = async (req: Request, res: Response) => {
  if (getAuthenticatedAdminId(req, res) === null) {
    return;
  }

  try {
    await ensureBatchAllocationsTable();

    const result = await pool.query(
      `
        SELECT
          allocation_id AS id,
          batch_id,
          allocation_type,
          location,
          notes,
          created_at,
          updated_at
        FROM batch_allocations
        ORDER BY batch_id ASC, allocation_type ASC, updated_at DESC
      `,
    );

    return res.json(result.rows.map((row) => mapBatchAllocationRow(row)));
  } catch (error) {
    console.error("Error fetching batch allocations:", error);
    return res.status(500).json({ error: "Failed to fetch batch allocations." });
  }
};

export const saveBatchAllocation = async (req: Request, res: Response) => {
  const adminId = getAuthenticatedAdminId(req, res);
  if (adminId === null) {
    return;
  }

  const allocationId = toNullablePositiveInt(req.body?.allocationId);
  const batchId = toNullablePositiveInt(req.body?.batchId);
  const allocationType = normalizeAllocationType(req.body?.allocationType);
  const location = normalizeText(req.body?.location);
  const notes = normalizeText(req.body?.notes, 2000);

  if (!batchId) {
    return res.status(400).json({ error: "batchId is required." });
  }

  if (!allocationType) {
    return res
      .status(400)
      .json({ error: "allocationType must be either classroom or lab." });
  }

  if (!location) {
    return res.status(400).json({ error: "location is required." });
  }

  try {
    await ensureBatchAllocationsTable();

    if (!(await ensureBatchExists(batchId))) {
      return res.status(404).json({ error: "Batch not found." });
    }

    const result = allocationId
      ? await pool.query(
          `
            UPDATE batch_allocations
            SET
              batch_id = $1,
              allocation_type = $2,
              location = $3,
              notes = $4,
              updated_by = $5,
              updated_at = NOW()
            WHERE allocation_id = $6
            RETURNING
              allocation_id AS id,
              batch_id,
              allocation_type,
              location,
              notes,
              created_at,
              updated_at
          `,
          [
            batchId,
            allocationType,
            location,
            notes || null,
            adminId,
            allocationId,
          ],
        )
      : await pool.query(
          `
            INSERT INTO batch_allocations (
              batch_id,
              allocation_type,
              location,
              notes,
              created_by,
              updated_by
            )
            VALUES ($1, $2, $3, $4, $5, $5)
            ON CONFLICT (batch_id, allocation_type)
            DO UPDATE SET
              location = EXCLUDED.location,
              notes = EXCLUDED.notes,
              updated_by = EXCLUDED.updated_by,
              updated_at = NOW()
            RETURNING
              allocation_id AS id,
              batch_id,
              allocation_type,
              location,
              notes,
              created_at,
              updated_at
          `,
          [batchId, allocationType, location, notes || null, adminId],
        );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Batch allocation not found." });
    }

    return res.json(mapBatchAllocationRow(result.rows[0]));
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      String((error as { code?: unknown }).code ?? "") === "23505"
    ) {
      return res.status(409).json({
        error:
          "An allocation already exists for this batch and allocation type.",
      });
    }

    console.error("Error saving batch allocation:", error);
    return res.status(500).json({ error: "Failed to save batch allocation." });
  }
};

export const deleteBatchAllocation = async (req: Request, res: Response) => {
  if (getAuthenticatedAdminId(req, res) === null) {
    return;
  }

  const allocationId = toNullablePositiveInt(req.params.allocationId);
  if (!allocationId) {
    return res.status(400).json({ error: "Valid allocationId is required." });
  }

  try {
    await ensureBatchAllocationsTable();

    const result = await pool.query(
      "DELETE FROM batch_allocations WHERE allocation_id = $1 RETURNING allocation_id",
      [allocationId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Batch allocation not found." });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting batch allocation:", error);
    return res.status(500).json({ error: "Failed to delete batch allocation." });
  }
};
