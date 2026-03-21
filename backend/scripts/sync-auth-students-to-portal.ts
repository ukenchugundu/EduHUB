import pool from "../src/utils/db";
import { ensureStudentPortalContext } from "../src/utils/studentPortalAccess";

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options: {
    authUserId: number | null;
    email: string;
  } = {
    authUserId: null,
    email: "",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--user-id" && args[index + 1]) {
      const parsedUserId = Number(args[index + 1]);
      options.authUserId = Number.isInteger(parsedUserId) && parsedUserId > 0
        ? parsedUserId
        : null;
      index += 1;
      continue;
    }
    if (arg === "--email" && args[index + 1]) {
      options.email = String(args[index + 1]).trim().toLowerCase();
      index += 1;
    }
  }

  return options;
};

const run = async () => {
  const options = parseArgs();
  const params: Array<number | string> = [];
  let whereClause = "WHERE role = 'student'";

  if (options.authUserId) {
    params.push(options.authUserId);
    whereClause += ` AND auth_user_id = $${params.length}`;
  }

  if (options.email) {
    params.push(options.email);
    whereClause += ` AND LOWER(email) = $${params.length}`;
  }

  const result = await pool.query<{ auth_user_id: number; email: string }>(
    `
      SELECT auth_user_id, email
      FROM auth_users
      ${whereClause}
      ORDER BY auth_user_id ASC
    `,
    params,
  );

  let syncedCount = 0;
  let missingPortalCount = 0;

  for (const row of result.rows) {
    const context = await ensureStudentPortalContext(
      pool,
      Number(row.auth_user_id),
    );

    if (context?.portalStudentId) {
      syncedCount += 1;
      continue;
    }

    missingPortalCount += 1;
  }

  console.log(
    JSON.stringify(
      {
        totalStudentsMatched: result.rows.length,
        syncedStudents: syncedCount,
        studentsMissingPortalRecord: missingPortalCount,
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
