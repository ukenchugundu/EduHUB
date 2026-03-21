import { Pool, PoolClient } from "pg";

type DbClient = Pool | PoolClient;

const MISSING_RELATION_ERROR = "42P01";

interface AuthStudentRow {
  auth_user_id: number;
  email: string;
  role: string;
  full_name: string | null;
  roll_number: string | null;
  department: string | null;
  academic_year: string | null;
  section: string | null;
}

interface DepartmentLookupRow {
  id: number;
  code: string | null;
  name: string | null;
}

interface BatchLookupRow {
  id: number;
  name: string | null;
}

interface StudentLookupRow {
  id: number;
  student_id: string | null;
  email: string | null;
}

export interface StudentPortalContext {
  authUserId: number;
  email: string;
  fullName: string;
  rollNumber: string;
  studentId: string;
  department: string;
  academicYear: string;
  section: string;
  departmentCode: string;
  portalStudentId: number | null;
  batchId: number | null;
  batchName: string;
}

export interface BatchStudentAuthRow {
  id: number;
  student_id: number;
  full_name: string;
  email: string;
  roll_number: string;
}

const normalizeText = (value: unknown, maxLength = 255): string =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);

const normalizeUpperText = (value: unknown, maxLength = 255): string =>
  normalizeText(value, maxLength).toUpperCase();

const toNullablePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const extractAcademicYearNumber = (value: unknown): number | null => {
  const normalized = normalizeUpperText(value, 40);
  if (!normalized) {
    return null;
  }

  if (
    normalized.startsWith("1") ||
    normalized.startsWith("I ") ||
    normalized === "I" ||
    normalized.includes("1ST")
  ) {
    return 1;
  }
  if (
    normalized.startsWith("2") ||
    normalized.startsWith("II ") ||
    normalized === "II" ||
    normalized.includes("2ND")
  ) {
    return 2;
  }
  if (
    normalized.startsWith("3") ||
    normalized.startsWith("III ") ||
    normalized === "III" ||
    normalized.includes("3RD")
  ) {
    return 3;
  }
  if (
    normalized.startsWith("4") ||
    normalized.startsWith("IV ") ||
    normalized === "IV" ||
    normalized.includes("4TH")
  ) {
    return 4;
  }

  const digitMatch = normalized.match(/\b([1-4])\b/);
  if (digitMatch?.[1]) {
    return Number(digitMatch[1]);
  }

  return null;
};

const toRomanAcademicYear = (value: unknown): string => {
  switch (extractAcademicYearNumber(value)) {
    case 1:
      return "I";
    case 2:
      return "II";
    case 3:
      return "III";
    case 4:
      return "IV";
    default:
      return "";
  }
};

const getStudentBatchCandidateName = (
  departmentCode: string,
  academicYear: string,
  section: string,
): string => {
  const romanYear = toRomanAcademicYear(academicYear);
  const normalizedDepartmentCode = normalizeUpperText(departmentCode, 50);
  const normalizedSection = normalizeUpperText(section, 20);

  if (!romanYear || !normalizedDepartmentCode) {
    return "";
  }

  return normalizedSection
    ? `${romanYear} ${normalizedDepartmentCode}-${normalizedSection}`
    : `${romanYear} ${normalizedDepartmentCode}`;
};

export const isUndefinedTableError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === MISSING_RELATION_ERROR;

export const getExistingTableName = async (
  db: DbClient,
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

const listExistingTableNames = async (
  db: DbClient,
  tableNames: string[],
): Promise<string[]> => {
  const existing: string[] = [];
  for (const tableName of tableNames) {
    const matched = await getExistingTableName(db, [tableName]);
    if (matched) {
      existing.push(matched);
    }
  }
  return existing;
};

const getReferencedTableName = async (
  db: DbClient,
  tableName: string,
  columnName: string,
): Promise<string | null> => {
  const result = await db.query<{ referenced_table: string | null }>(
    `
      SELECT ccu.table_name AS referenced_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = $2
      LIMIT 1
    `,
    [tableName, columnName],
  );

  return result.rows[0]?.referenced_table ?? null;
};

export const getAcademicTableNames = async (db: DbClient) => ({
  batchTableName: await getExistingTableName(db, ["batch", "batches"]),
  departmentTableName: await getExistingTableName(db, [
    "department",
    "departments",
  ]),
  studentTableName: await getExistingTableName(db, ["student", "students"]),
});

const loadAuthStudentRow = async (
  db: DbClient,
  authUserId: number,
): Promise<AuthStudentRow | null> => {
  const result = await db.query<AuthStudentRow>(
    `
      SELECT
        auth_user_id,
        email,
        role,
        full_name,
        roll_number,
        department,
        academic_year,
        section
      FROM auth_users
      WHERE auth_user_id = $1
      LIMIT 1
    `,
    [authUserId],
  );

  const row = result.rows[0];
  if (!row || row.role !== "student") {
    return null;
  }

  return row;
};

const findDepartment = async (
  db: DbClient,
  departmentTableName: string | null,
  departmentValue: string,
): Promise<DepartmentLookupRow | null> => {
  if (!departmentTableName || !departmentValue) {
    return null;
  }

  const result = await db.query<DepartmentLookupRow>(
    `
      SELECT id, code, name
      FROM ${departmentTableName}
      WHERE LOWER(COALESCE(name, '')) = LOWER($1)
         OR LOWER(COALESCE(code, '')) = LOWER($1)
      ORDER BY id ASC
      LIMIT 1
    `,
    [departmentValue],
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  const looseResult = await db.query<DepartmentLookupRow>(
    `
      SELECT id, code, name
      FROM ${departmentTableName}
      WHERE LOWER(COALESCE(name, '')) LIKE LOWER($1)
      ORDER BY id ASC
      LIMIT 1
    `,
    [`%${departmentValue}%`],
  );

  return looseResult.rows[0] ?? null;
};

const findBatch = async (
  db: DbClient,
  batchTableName: string | null,
  departmentId: number | null,
  departmentCode: string,
  academicYear: string,
  section: string,
): Promise<BatchLookupRow | null> => {
  if (!batchTableName) {
    return null;
  }

  const candidateName = getStudentBatchCandidateName(
    departmentCode,
    academicYear,
    section,
  );

  if (candidateName) {
    const result = await db.query<BatchLookupRow>(
      `
        SELECT id, name
        FROM ${batchTableName}
        WHERE UPPER(COALESCE(name, '')) = $1
        ORDER BY academic_year DESC NULLS LAST, id ASC
        LIMIT 1
      `,
      [candidateName],
    );

    if (result.rows[0]) {
      return result.rows[0];
    }
  }

  const romanYear = toRomanAcademicYear(academicYear);
  const normalizedSection = normalizeUpperText(section, 20);
  if (!romanYear) {
    return null;
  }

  const params: Array<number | string> = [];
  let whereClause = "WHERE 1 = 1";
  if (departmentId) {
    params.push(departmentId);
    whereClause += ` AND department_id = $${params.length}`;
  }

  params.push(`${romanYear} %${normalizedSection ? `-${normalizedSection}` : ""}`);
  whereClause += ` AND UPPER(COALESCE(name, '')) LIKE $${params.length}`;

  const fallbackResult = await db.query<BatchLookupRow>(
    `
      SELECT id, name
      FROM ${batchTableName}
      ${whereClause}
      ORDER BY academic_year DESC NULLS LAST, id ASC
      LIMIT 1
    `,
    params,
  );

  return fallbackResult.rows[0] ?? null;
};

const findExistingStudentRecord = async (
  db: DbClient,
  studentTableName: string,
  email: string,
  studentIdentifier: string,
): Promise<StudentLookupRow | null> => {
  const params: string[] = [email];
  let whereClause =
    "WHERE LOWER(COALESCE(email, '')) = LOWER($1)";

  if (studentIdentifier) {
    params.push(studentIdentifier);
    whereClause += ` OR COALESCE(student_id, '') = $${params.length}`;
  }

  const result = await db.query<StudentLookupRow>(
    `
      SELECT id, student_id, email
      FROM ${studentTableName}
      ${whereClause}
      ORDER BY id ASC
      LIMIT 1
    `,
    params,
  );

  return result.rows[0] ?? null;
};

const upsertStudentRecord = async (
  db: DbClient,
  studentTableName: string,
  existingStudent: StudentLookupRow | null,
  values: {
    studentId: string;
    fullName: string;
    email: string;
    departmentId: number | null;
    academicYearNumber: number | null;
    section: string;
    batchId: number | null;
  },
): Promise<number | null> => {
  if (existingStudent) {
    const result = await db.query<{ id: number }>(
      `
        UPDATE ${studentTableName}
        SET
          student_id = $1,
          name = $2,
          email = $3,
          department_id = $4,
          year = $5,
          section = $6,
          batch_id = $7,
          updated_at = NOW()
        WHERE id = $8
        RETURNING id
      `,
      [
        values.studentId || null,
        values.fullName,
        values.email,
        values.departmentId,
        values.academicYearNumber,
        values.section || null,
        values.batchId,
        existingStudent.id,
      ],
    );

    return toNullablePositiveInt(result.rows[0]?.id);
  }

  const result = await db.query<{ id: number }>(
    `
      INSERT INTO ${studentTableName} (
        student_id,
        name,
        email,
        department_id,
        year,
        section,
        batch_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id
    `,
    [
      values.studentId || null,
      values.fullName,
      values.email,
      values.departmentId,
      values.academicYearNumber,
      values.section || null,
      values.batchId,
    ],
  );

  return toNullablePositiveInt(result.rows[0]?.id);
};

const ensureBatchMappingLinks = async (
  db: DbClient,
  authUserId: number,
  portalStudentId: number | null,
  batchId: number | null,
): Promise<void> => {
  if (!batchId) {
    return;
  }

  const mappingTableNames = await listExistingTableNames(db, [
    "batch_students",
    "batch_student",
  ]);

  for (const tableName of mappingTableNames) {
    const targetTable = await getReferencedTableName(db, tableName, "student_id");
    const linkStudentId =
      targetTable === "auth_users"
        ? authUserId
        : targetTable === "student" || targetTable === "students"
          ? portalStudentId
          : null;

    if (!linkStudentId) {
      continue;
    }

    await db.query(
      `
        INSERT INTO ${tableName} (batch_id, student_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
      [batchId, linkStudentId],
    );
  }
};

export const ensureStudentPortalContext = async (
  db: DbClient,
  authUserId: number,
): Promise<StudentPortalContext | null> => {
  const authStudent = await loadAuthStudentRow(db, authUserId);
  if (!authStudent) {
    return null;
  }

  const { batchTableName, departmentTableName, studentTableName } =
    await getAcademicTableNames(db);

  const email = normalizeText(authStudent.email, 320);
  const fullName = normalizeText(authStudent.full_name, 255);
  const rollNumber = normalizeText(authStudent.roll_number, 120);
  const studentId = rollNumber || email;
  const department = normalizeText(authStudent.department, 120);
  const academicYear = normalizeText(authStudent.academic_year, 40);
  const section = normalizeUpperText(authStudent.section, 40);

  const departmentRow = await findDepartment(db, departmentTableName, department);
  const departmentId = toNullablePositiveInt(departmentRow?.id);
  const departmentCode = normalizeUpperText(departmentRow?.code, 50);
  const batchRow = await findBatch(
    db,
    batchTableName,
    departmentId,
    departmentCode,
    academicYear,
    section,
  );
  const batchId = toNullablePositiveInt(batchRow?.id);
  const batchName = normalizeText(batchRow?.name, 120);

  let portalStudentId: number | null = null;
  if (studentTableName) {
    const existingStudent = await findExistingStudentRecord(
      db,
      studentTableName,
      email,
      studentId,
    );

    portalStudentId = await upsertStudentRecord(db, studentTableName, existingStudent, {
      studentId,
      fullName,
      email,
      departmentId,
      academicYearNumber: extractAcademicYearNumber(academicYear),
      section,
      batchId,
    });
  }

  await ensureBatchMappingLinks(db, authUserId, portalStudentId, batchId);

  return {
    authUserId,
    email,
    fullName,
    rollNumber,
    studentId,
    department,
    academicYear,
    section,
    departmentCode,
    portalStudentId,
    batchId,
    batchName,
  };
};

export const getStudentBatchIdForAuthUser = async (
  db: DbClient,
  authUserId?: number,
): Promise<number | null> => {
  const parsedAuthUserId = toNullablePositiveInt(authUserId);
  if (!parsedAuthUserId) {
    return null;
  }

  const context = await ensureStudentPortalContext(db, parsedAuthUserId);
  return context?.batchId ?? null;
};

export const getBatchStudentRows = async (
  db: DbClient,
  batchId: number,
): Promise<BatchStudentAuthRow[]> => {
  const parsedBatchId = toNullablePositiveInt(batchId);
  if (!parsedBatchId) {
    return [];
  }

  const { studentTableName } = await getAcademicTableNames(db);
  if (studentTableName) {
    const result = await db.query<BatchStudentAuthRow>(
      `
        SELECT
          au.auth_user_id AS id,
          au.auth_user_id AS student_id,
          COALESCE(NULLIF(au.full_name, ''), s.name) AS full_name,
          COALESCE(NULLIF(au.email, ''), s.email) AS email,
          COALESCE(NULLIF(au.roll_number, ''), s.student_id) AS roll_number
        FROM ${studentTableName} s
        INNER JOIN auth_users au
          ON au.role = 'student'
         AND (
           LOWER(COALESCE(au.email, '')) = LOWER(COALESCE(s.email, ''))
           OR (
             COALESCE(au.roll_number, '') <> ''
             AND au.roll_number = COALESCE(s.student_id, '')
           )
         )
        WHERE s.batch_id = $1
        ORDER BY
          COALESCE(NULLIF(au.roll_number, ''), s.student_id),
          COALESCE(NULLIF(au.full_name, ''), s.name)
      `,
      [parsedBatchId],
    );

    if (result.rows.length > 0) {
      return result.rows.map((row) => ({
        id: Number(row.id),
        student_id: Number(row.student_id),
        full_name: normalizeText(row.full_name, 255),
        email: normalizeText(row.email, 320),
        roll_number: normalizeText(row.roll_number, 120),
      }));
    }
  }

  for (const tableName of ["batch_students", "batch_student"] as const) {
    try {
      const result = await db.query<BatchStudentAuthRow>(
        `
          SELECT
            au.auth_user_id AS id,
            au.auth_user_id AS student_id,
            au.full_name,
            au.email,
            au.roll_number
          FROM ${tableName} bs
          JOIN auth_users au ON au.auth_user_id = bs.student_id
          WHERE bs.batch_id = $1
            AND au.role = 'student'
          ORDER BY au.roll_number, au.full_name
        `,
        [parsedBatchId],
      );

      return result.rows.map((row) => ({
        id: Number(row.id),
        student_id: Number(row.student_id),
        full_name: normalizeText(row.full_name, 255),
        email: normalizeText(row.email, 320),
        roll_number: normalizeText(row.roll_number, 120),
      }));
    } catch (error) {
      if (isUndefinedTableError(error)) {
        continue;
      }

      throw error;
    }
  }

  return [];
};

export const resolvePortalStudentIdByIdentifier = async (
  db: DbClient,
  identifier: string,
): Promise<number | null> => {
  const normalizedIdentifier = normalizeText(identifier, 320);
  if (!normalizedIdentifier) {
    return null;
  }

  const { studentTableName } = await getAcademicTableNames(db);
  if (!studentTableName) {
    return null;
  }

  const params: Array<string | number> = [normalizedIdentifier];
  let whereClause = `
    WHERE LOWER(COALESCE(student_id, '')) = LOWER($1)
       OR LOWER(COALESCE(email, '')) = LOWER($1)
  `;

  const numericIdentifier = toNullablePositiveInt(normalizedIdentifier);
  if (numericIdentifier) {
    params.push(numericIdentifier);
    whereClause += ` OR id = $${params.length}`;
  }

  const result = await db.query<{ id: number }>(
    `
      SELECT id
      FROM ${studentTableName}
      ${whereClause}
      ORDER BY id ASC
      LIMIT 1
    `,
    params,
  );

  return toNullablePositiveInt(result.rows[0]?.id);
};
