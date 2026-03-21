const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ENV_PATH = path.join(ROOT_DIR, ".env");
const VSCODE_SETTINGS_PATH = path.join(ROOT_DIR, ".vscode", "settings.json");

const loadConnectionStrings = () => {
  const envText = fs.readFileSync(ENV_PATH, "utf8");
  const settingsText = fs.readFileSync(VSCODE_SETTINGS_PATH, "utf8");

  const targetMatch = envText.match(/^DATABASE_URL=(.+)$/m);
  const sourceMatch = settingsText.match(/"connectString"\s*:\s*"([^"]+)"/m);

  if (!targetMatch?.[1]) {
    throw new Error("DATABASE_URL was not found in .env");
  }
  if (!sourceMatch?.[1]) {
    throw new Error("Old source connectString was not found in .vscode/settings.json");
  }

  return {
    targetUrl: targetMatch[1].trim(),
    sourceUrl: sourceMatch[1].trim(),
  };
};

const createPool = (connectionString) =>
  new Pool({
    connectionString,
    ssl: connectionString.includes(".supabase.co")
      ? { rejectUnauthorized: false }
      : false,
    connectionTimeoutMillis: 15000,
  });

const quoteIdentifier = (identifier) => `"${String(identifier).replace(/"/g, "\"\"")}"`;

const getPublicTables = async (db) => {
  const result = await db.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `,
  );

  return result.rows.map((row) => row.table_name);
};

const getColumns = async (db, tableName) => {
  const result = await db.query(
    `
      SELECT
        column_name,
        ordinal_position,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [tableName],
  );

  return result.rows;
};

const getPrimaryKeyColumns = async (db, tableName) => {
  const result = await db.query(
    `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    `,
    [tableName],
  );

  return result.rows.map((row) => row.column_name);
};

const getForeignKeyDependencies = async (db) => {
  const result = await db.query(
    `
      SELECT
        tc.table_name AS child_table,
        ccu.table_name AS parent_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
    `,
  );

  return result.rows;
};

const topologicallySortTables = (tables, foreignKeys) => {
  const tableSet = new Set(tables);
  const incoming = new Map();
  const outgoing = new Map();

  for (const tableName of tables) {
    incoming.set(tableName, new Set());
    outgoing.set(tableName, new Set());
  }

  for (const relation of foreignKeys) {
    const child = relation.child_table;
    const parent = relation.parent_table;
    if (!tableSet.has(child) || !tableSet.has(parent) || child === parent) {
      continue;
    }
    incoming.get(child).add(parent);
    outgoing.get(parent).add(child);
  }

  const ready = tables.filter((tableName) => incoming.get(tableName).size === 0);
  ready.sort();

  const ordered = [];
  while (ready.length > 0) {
    const current = ready.shift();
    ordered.push(current);
    for (const child of outgoing.get(current)) {
      const childIncoming = incoming.get(child);
      childIncoming.delete(current);
      if (childIncoming.size === 0) {
        ready.push(child);
        ready.sort();
      }
    }
  }

  if (ordered.length !== tables.length) {
    const remaining = tables.filter((tableName) => !ordered.includes(tableName));
    remaining.sort();
    ordered.push(...remaining);
  }

  return ordered;
};

const getRowCount = async (db, tableName) => {
  const result = await db.query(
    `SELECT COUNT(*)::bigint AS count FROM ${quoteIdentifier(tableName)}`,
  );
  return Number(result.rows[0]?.count ?? 0);
};

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const insertRows = async (db, tableName, columns, rows, primaryKeyColumns) => {
  if (rows.length === 0 || columns.length === 0) {
    return 0;
  }

  const columnSql = columns.map(quoteIdentifier).join(", ");
  const conflictSql =
    primaryKeyColumns.length > 0
      ? ` ON CONFLICT (${primaryKeyColumns.map(quoteIdentifier).join(", ")}) DO NOTHING`
      : "";

  let insertedCount = 0;
  for (const rowBatch of chunk(rows, 100)) {
    const values = [];
    const placeholders = rowBatch.map((row, rowIndex) => {
      const valuePlaceholders = columns.map((columnName, columnIndex) => {
        values.push(row[columnName]);
        return `$${rowIndex * columns.length + columnIndex + 1}`;
      });
      return `(${valuePlaceholders.join(", ")})`;
    });

    const result = await db.query(
      `INSERT INTO ${quoteIdentifier(tableName)} (${columnSql}) VALUES ${placeholders.join(", ")}${conflictSql}`,
      values,
    );
    insertedCount += result.rowCount ?? 0;
  }

  return insertedCount;
};

const resetSerialSequences = async (db, tableName, columns) => {
  for (const column of columns) {
    if (!String(column.column_default ?? "").includes("nextval(")) {
      continue;
    }

    const tableSql = quoteIdentifier(tableName);
    const columnSql = quoteIdentifier(column.column_name);
    await db.query(
      `
        SELECT setval(
          pg_get_serial_sequence($1, $2),
          COALESCE((SELECT MAX(${columnSql}) FROM ${tableSql}), 1),
          (SELECT COUNT(*) > 0 FROM ${tableSql})
        )
      `,
      [`public.${tableName}`, column.column_name],
    );
  }
};

const main = async () => {
  const { sourceUrl, targetUrl } = loadConnectionStrings();
  const source = createPool(sourceUrl);
  const target = createPool(targetUrl);

  try {
    const [sourceTables, targetTables, foreignKeys] = await Promise.all([
      getPublicTables(source),
      getPublicTables(target),
      getForeignKeyDependencies(source),
    ]);

    const targetTableSet = new Set(targetTables);
    const sharedTables = sourceTables.filter((tableName) => targetTableSet.has(tableName));
    const orderedTables = topologicallySortTables(sharedTables, foreignKeys);

    const summary = [];
    for (const tableName of orderedTables) {
      const [sourceColumns, targetColumns, primaryKeyColumns, sourceCount, targetBeforeCount] =
        await Promise.all([
          getColumns(source, tableName),
          getColumns(target, tableName),
          getPrimaryKeyColumns(target, tableName),
          getRowCount(source, tableName),
          getRowCount(target, tableName),
        ]);

      if (sourceCount === 0) {
        summary.push({
          tableName,
          sourceCount,
          targetBeforeCount,
          insertedCount: 0,
          targetAfterCount: targetBeforeCount,
          skipped: "source_empty",
        });
        continue;
      }

      const targetColumnNames = new Set(targetColumns.map((column) => column.column_name));
      const sharedColumnNames = sourceColumns
        .map((column) => column.column_name)
        .filter((columnName) => targetColumnNames.has(columnName));

      if (sharedColumnNames.length === 0) {
        summary.push({
          tableName,
          sourceCount,
          targetBeforeCount,
          insertedCount: 0,
          targetAfterCount: targetBeforeCount,
          skipped: "no_shared_columns",
        });
        continue;
      }

      const rowsResult = await source.query(
        `SELECT ${sharedColumnNames.map(quoteIdentifier).join(", ")} FROM ${quoteIdentifier(tableName)}`,
      );

      const insertedCount = await insertRows(
        target,
        tableName,
        sharedColumnNames,
        rowsResult.rows,
        primaryKeyColumns.filter((columnName) => sharedColumnNames.includes(columnName)),
      );
      await resetSerialSequences(target, tableName, targetColumns);

      const targetAfterCount = await getRowCount(target, tableName);
      summary.push({
        tableName,
        sourceCount,
        targetBeforeCount,
        insertedCount,
        targetAfterCount,
        skipped: null,
      });
    }

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
