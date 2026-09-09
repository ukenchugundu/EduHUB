import jwt from "jsonwebtoken";
import { Request } from "express";
import { PoolClient, Pool } from "pg";
import { verifyAndDecodeJwt } from "../middlewares/auth";

export interface RequestAuthUser {
  userId: number;
  role: string;
  email?: string;
}

export interface FacultyClassAllocation {
  className: string;
  batchId: number | null;
  department: string;
  academicYear: string;
  section: string;
  studentCount: number;
}

interface InMemoryFacultyClassAllocation extends FacultyClassAllocation {
  facultyId: number;
  createdAt: string;
  updatedAt: string;
}

const inMemoryFacultyClassAllocations: InMemoryFacultyClassAllocation[] = [];
const MISSING_RELATION_ERROR = "42P01";

const normalizeText = (value: unknown, maxLength = 255): string =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);

const toNullablePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const buildClassAccessKey = (
  className: string,
  batchId?: number | null,
): string => {
  const parsedBatchId = toNullablePositiveInt(batchId);
  if (parsedBatchId) {
    return `batch:${parsedBatchId}`;
  }
  return `class:${normalizeClassName(className)}`;
};

const mergeClassOptions = (
  options: FacultyClassAllocation[],
): FacultyClassAllocation[] => {
  const byKey = new Map<string, FacultyClassAllocation>();

  for (const option of options) {
    const className = normalizeText(option.className);
    if (!className) {
      continue;
    }

    const nextOption: FacultyClassAllocation = {
      className,
      batchId: toNullablePositiveInt(option.batchId),
      department: normalizeText(option.department, 120),
      academicYear: normalizeText(option.academicYear, 40),
      section: normalizeText(option.section, 40),
      studentCount: Number.isFinite(Number(option.studentCount))
        ? Math.max(0, Number(option.studentCount))
        : 0,
    };

    const key = buildClassAccessKey(className, nextOption.batchId);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, nextOption);
      continue;
    }

    byKey.set(key, {
      ...existing,
      department: existing.department || nextOption.department,
      academicYear: existing.academicYear || nextOption.academicYear,
      section: existing.section || nextOption.section,
      studentCount: Math.max(existing.studentCount, nextOption.studentCount),
    });
  }

  return Array.from(byKey.values()).sort((left, right) => {
    const leftBatchId = left.batchId ?? Number.MAX_SAFE_INTEGER;
    const rightBatchId = right.batchId ?? Number.MAX_SAFE_INTEGER;
    if (leftBatchId !== rightBatchId) {
      return leftBatchId - rightBatchId;
    }
    return left.className.localeCompare(right.className);
  });
};

const getExistingTableName = async (
  db: Pool | PoolClient,
  tableNames: string[],
): Promise<string | null> => {
  for (const tableName of tableNames) {
    const result = await db.query<{ name: string | null }>(
      "SELECT to_regclass($1)::text AS name",
      [`public.${tableName}`],
    );

    if (result.rows[0]?.name) {
      return tableName;
    }
  }

  return null;
};

const mapAllocationRow = (
  row: Record<string, unknown>,
): FacultyClassAllocation => ({
  className: normalizeText(row.class_name ?? row.className),
  batchId: toNullablePositiveInt(row.batch_id ?? row.batchId),
  department: normalizeText(row.department, 120),
  academicYear: normalizeText(
    row.academic_year ?? row.academicYear,
    40,
  ),
  section: normalizeText(row.section, 40),
  studentCount: Number(row.student_count ?? row.studentCount ?? 0) || 0,
});

export const normalizeClassName = (value: unknown): string =>
  normalizeText(value).toLowerCase();

export const buildDerivedClassName = ({
  department,
  academicYear,
  section,
}: {
  department?: unknown;
  academicYear?: unknown;
  section?: unknown;
}): string => {
  const normalizedDepartment = normalizeText(department, 120);
  const normalizedAcademicYear = normalizeText(academicYear, 40);
  const normalizedSection = normalizeText(section, 40);

  const baseParts = [normalizedAcademicYear, normalizedDepartment].filter(
    Boolean,
  );
  const baseLabel = baseParts.join(" ");

  if (normalizedSection) {
    return baseLabel
      ? `${baseLabel} - Section ${normalizedSection}`
      : `Section ${normalizedSection}`;
  }

  return baseLabel;
};

export const getAuthUserFromRequest = (
  req: Request,
): RequestAuthUser | null => {
  if ((req as any).user) {
    const user = (req as any).user;
    const userId = Number(user.userId ?? user.id);
    const role = String(user.role ?? "").trim();
    const email = String(user.email ?? "").trim();
    if (Number.isInteger(userId) && userId > 0 && role) {
      return {
        userId,
        role,
        email: email || undefined,
      };
    }
  }

  const authHeader =
    req.headers.authorization ||
    (req.headers["x-access-token"] as string | undefined);
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token =
    (headerValue && headerValue.startsWith("Bearer ")
      ? headerValue.split(" ")[1]
      : headerValue) || (req.query?.token as string | undefined);

  if (!token) {
    return null;
  }

  const decoded = verifyAndDecodeJwt(token);
  if (!decoded) {
    return null;
  }

  const userId = Number(decoded.userId ?? decoded.id);
  const role = String(decoded.role ?? "").trim();
  const email = String(decoded.email ?? "").trim();

  if (!Number.isInteger(userId) || userId <= 0 || !role) {
    return null;
  }

  return {
    userId,
    role,
    email: email || undefined,
  };
};

export const ensureFacultyClassAllocationsTable = async (
  db: Pool | PoolClient,
): Promise<void> => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS faculty_class_allocations (
      allocation_id SERIAL PRIMARY KEY,
      faculty_id INT NOT NULL,
      class_name VARCHAR(255) NOT NULL,
      batch_id INT,
      department VARCHAR(120),
      academic_year VARCHAR(40),
      section VARCHAR(40),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(
    "ALTER TABLE faculty_class_allocations ADD COLUMN IF NOT EXISTS faculty_id INT",
  );
  await db.query(
    "ALTER TABLE faculty_class_allocations ADD COLUMN IF NOT EXISTS class_name VARCHAR(255)",
  );
  await db.query(
    "ALTER TABLE faculty_class_allocations ADD COLUMN IF NOT EXISTS batch_id INT",
  );
  await db.query(
    "ALTER TABLE faculty_class_allocations ADD COLUMN IF NOT EXISTS department VARCHAR(120)",
  );
  await db.query(
    "ALTER TABLE faculty_class_allocations ADD COLUMN IF NOT EXISTS academic_year VARCHAR(40)",
  );
  await db.query(
    "ALTER TABLE faculty_class_allocations ADD COLUMN IF NOT EXISTS section VARCHAR(40)",
  );
  await db.query(
    "ALTER TABLE faculty_class_allocations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  );
  await db.query(
    "ALTER TABLE faculty_class_allocations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  );
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_faculty_class_allocations_faculty ON faculty_class_allocations (faculty_id)",
  );
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_faculty_class_allocations_batch ON faculty_class_allocations (batch_id)",
  );
  await db.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_class_allocations_unique_class ON faculty_class_allocations (faculty_id, lower(class_name))",
  );
  await db.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_class_allocations_unique_batch ON faculty_class_allocations (faculty_id, batch_id) WHERE batch_id IS NOT NULL",
  );
};

export const getFacultyClassAllocations = async (
  db: Pool | PoolClient,
  facultyId: number,
): Promise<FacultyClassAllocation[]> => {
  await ensureFacultyClassAllocationsTable(db);

  const result = await db.query(
    `
      SELECT class_name, batch_id, department, academic_year, section
      FROM faculty_class_allocations
      WHERE faculty_id = $1
      ORDER BY class_name ASC
    `,
    [facultyId],
  );

  return result.rows.map((row) => mapAllocationRow(row));
};

export const getAllFacultyClassAllocations = async (
  db: Pool | PoolClient,
): Promise<Map<number, FacultyClassAllocation[]>> => {
  await ensureFacultyClassAllocationsTable(db);

  const result = await db.query(
    `
      SELECT faculty_id, class_name, batch_id, department, academic_year, section
      FROM faculty_class_allocations
      ORDER BY faculty_id ASC, class_name ASC
    `,
  );

  const byFacultyId = new Map<number, FacultyClassAllocation[]>();
  for (const row of result.rows) {
    const facultyId = Number(row.faculty_id);
    if (!Number.isInteger(facultyId) || facultyId <= 0) {
      continue;
    }

    const next = byFacultyId.get(facultyId) ?? [];
    next.push(mapAllocationRow(row));
    byFacultyId.set(facultyId, next);
  }

  return byFacultyId;
};

export const listAvailableFacultyClassOptions = async (
  db: Pool | PoolClient,
): Promise<FacultyClassAllocation[]> => {
  const options: FacultyClassAllocation[] = [];

  const batchesTable = await getExistingTableName(db, ["batches", "batch"]);
  if (batchesTable) {
    const departmentsTable = await getExistingTableName(db, [
      "departments",
      "department",
    ]);
    const batchStudentsTable = await getExistingTableName(db, [
      "batch_students",
      "batch_student",
    ]);

    const batchQuery = `
      SELECT
        b.id AS batch_id,
        b.name AS class_name,
        ${
          departmentsTable
            ? "COALESCE(d.name, '')"
            : "''"
        } AS department,
        COALESCE(b.academic_year, '') AS academic_year,
        ''::VARCHAR AS section,
        ${
          batchStudentsTable
            ? "COUNT(DISTINCT bs.student_id)::INT"
            : "0"
        } AS student_count
      FROM ${batchesTable} b
      ${
        departmentsTable
          ? `LEFT JOIN ${departmentsTable} d ON d.id = b.department_id`
          : ""
      }
      ${
        batchStudentsTable
          ? `LEFT JOIN ${batchStudentsTable} bs ON bs.batch_id = b.id`
          : ""
      }
      GROUP BY
        b.id,
        b.name,
        ${
          departmentsTable
            ? "d.name,"
            : ""
        }
        b.academic_year
      ORDER BY b.name ASC
    `;

    const batchResult = await db.query(batchQuery);
    options.push(...batchResult.rows.map((row) => mapAllocationRow(row)));
  }

  try {
    const studentResult = await db.query(
      `
        SELECT
          COALESCE(department, '') AS department,
          COALESCE(academic_year, '') AS academic_year,
          COALESCE(section, '') AS section,
          COUNT(*)::INT AS student_count
        FROM auth_users
        WHERE role = 'student'
          AND (
            COALESCE(NULLIF(department, ''), '') <> ''
            OR COALESCE(NULLIF(section, ''), '') <> ''
          )
        GROUP BY department, academic_year, section
        ORDER BY department ASC, academic_year ASC, section ASC
      `,
    );

    for (const row of studentResult.rows) {
      const className = buildDerivedClassName({
        department: row.department,
        academicYear: row.academic_year,
        section: row.section,
      });
      if (!className) {
        continue;
      }

      options.push(
        mapAllocationRow({
          class_name: className,
          batch_id: null,
          department: row.department,
          academic_year: row.academic_year,
          section: row.section,
          student_count: row.student_count,
        }),
      );
    }
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code !== MISSING_RELATION_ERROR) {
      throw error;
    }
  }

  return mergeClassOptions(options);
};

export const buildFacultyClassOptionsFromStudentRows = (
  rows: Array<{
    department?: string | null;
    academic_year?: string | null;
    academicYear?: string | null;
    section?: string | null;
  }>,
): FacultyClassAllocation[] => {
  const options = rows.map((row) => ({
    className: buildDerivedClassName({
      department: row.department,
      academicYear: row.academic_year ?? row.academicYear,
      section: row.section,
    }),
    batchId: null,
    department: normalizeText(row.department, 120),
    academicYear: normalizeText(
      row.academic_year ?? row.academicYear,
      40,
    ),
    section: normalizeText(row.section, 40),
    studentCount: 1,
  }));

  return mergeClassOptions(options);
};

export const setInMemoryFacultyClassAllocations = (
  facultyId: number,
  allocations: FacultyClassAllocation[],
): FacultyClassAllocation[] => {
  for (let index = inMemoryFacultyClassAllocations.length - 1; index >= 0; index -= 1) {
    if (inMemoryFacultyClassAllocations[index].facultyId === facultyId) {
      inMemoryFacultyClassAllocations.splice(index, 1);
    }
  }

  const now = new Date().toISOString();
  const normalizedAllocations = mergeClassOptions(allocations);
  for (const allocation of normalizedAllocations) {
    inMemoryFacultyClassAllocations.push({
      facultyId,
      ...allocation,
      createdAt: now,
      updatedAt: now,
    });
  }

  return normalizedAllocations;
};

export const getInMemoryFacultyClassAllocations = (
  facultyId: number,
): FacultyClassAllocation[] =>
  inMemoryFacultyClassAllocations
    .filter((allocation) => allocation.facultyId === facultyId)
    .map((allocation) => ({
      className: allocation.className,
      batchId: allocation.batchId,
      department: allocation.department,
      academicYear: allocation.academicYear,
      section: allocation.section,
      studentCount: allocation.studentCount,
    }))
    .sort((left, right) => left.className.localeCompare(right.className));

export const clearInMemoryFacultyClassAllocations = (facultyId: number): void => {
  for (let index = inMemoryFacultyClassAllocations.length - 1; index >= 0; index -= 1) {
    if (inMemoryFacultyClassAllocations[index].facultyId === facultyId) {
      inMemoryFacultyClassAllocations.splice(index, 1);
    }
  }
};

export const facultyHasClassAccess = async (
  db: Pool | PoolClient,
  facultyId: number,
  className: string,
  batchId?: number | null,
): Promise<boolean> => {
  const allowedClasses = await getFacultyClassAllocations(db, facultyId);
  return allowedClasses.some((allocation) => {
    if (
      allocation.batchId !== null &&
      toNullablePositiveInt(batchId) !== null &&
      allocation.batchId === toNullablePositiveInt(batchId)
    ) {
      return true;
    }

    return (
      normalizeClassName(allocation.className) === normalizeClassName(className)
    );
  });
};

export const facultyHasClassAccessInMemory = (
  facultyId: number,
  className: string,
  batchId?: number | null,
): boolean =>
  getInMemoryFacultyClassAllocations(facultyId).some((allocation) => {
    if (
      allocation.batchId !== null &&
      toNullablePositiveInt(batchId) !== null &&
      allocation.batchId === toNullablePositiveInt(batchId)
    ) {
      return true;
    }

    return (
      normalizeClassName(allocation.className) === normalizeClassName(className)
    );
  });
