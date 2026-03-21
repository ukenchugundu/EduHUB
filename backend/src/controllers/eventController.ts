import { Request, Response } from "express";
import { PoolClient } from "pg";
import pool from "../utils/db";

type UserRole = "student" | "faculty" | "admin";

interface EventRecord {
  id: number;
  title: string;
  description: string;
  event_date: string;
  location: string;
  max_participants: number | null;
  image_url: string | null;
  category: string;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  registered_count?: number;
  is_registered?: boolean;
}

interface RegistrationRecord {
  id: number;
  event_id: number;
  user_id: number;
  registered_at: string;
  full_name: string;
  email: string;
  role: UserRole;
}

interface InMemoryUser {
  auth_user_id: number;
  email: string;
  role: UserRole;
  full_name: string;
}

interface NormalizedEventPayload {
  title: string;
  description: string;
  eventDateIso: string;
  location: string;
  maxParticipants: number | null;
  imageUrl: string | null;
  category: string;
  status: string;
}

const dbConnectionErrorCodes = new Set([
  "28P01",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ECONNRESET",
  "ETIMEDOUT",
  "3D000",
]);

const inMemoryUsers: InMemoryUser[] = [];
const inMemoryEvents: EventRecord[] = [];
const inMemoryRegistrations: RegistrationRecord[] = [];
let inMemoryEventId = 1;
let inMemoryRegistrationId = 1;

const isDatabaseConnectionError = (error: unknown): boolean => {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  if (dbConnectionErrorCodes.has(code)) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("password authentication failed") ||
    message.includes("client password must be a string") ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("timeout expired") ||
    message.includes("connect econnrefused") ||
    (message.includes("database") && message.includes("does not exist"))
  );
};

const nowIso = (): string => new Date().toISOString();

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "t" || normalized === "1";
  }
  return false;
};

const mapEventRow = (row: Record<string, unknown>): EventRecord => ({
  id: Number(row.id),
  title: String(row.title ?? ""),
  description: String(row.description ?? ""),
  event_date: new Date(String(row.event_date ?? nowIso())).toISOString(),
  location: String(row.location ?? ""),
  max_participants:
    row.max_participants === null || row.max_participants === undefined
      ? null
      : Number(row.max_participants),
  image_url:
    row.image_url === null || row.image_url === undefined
      ? null
      : String(row.image_url),
  category: String(row.category ?? "Conference"),
  status: String(row.status ?? "upcoming"),
  created_by:
    row.created_by === null || row.created_by === undefined
      ? 0
      : Number(row.created_by),
  created_at: new Date(String(row.created_at ?? nowIso())).toISOString(),
  updated_at: new Date(String(row.updated_at ?? nowIso())).toISOString(),
  created_by_name:
    row.created_by_name === null || row.created_by_name === undefined
      ? undefined
      : String(row.created_by_name),
  registered_count:
    row.registered_count === null || row.registered_count === undefined
      ? 0
      : Number(row.registered_count),
  is_registered: toBoolean(row.is_registered),
});

const mapRegistrationRow = (
  row: Record<string, unknown>,
): RegistrationRecord => ({
  id: Number(row.id),
  event_id: Number(row.event_id),
  user_id: Number(row.user_id),
  registered_at: new Date(String(row.registered_at ?? nowIso())).toISOString(),
  full_name: String(row.full_name ?? ""),
  email: String(row.email ?? ""),
  role:
    row.role === "admin" || row.role === "faculty" || row.role === "student"
      ? row.role
      : "student",
});

const getAuthenticatedUser = (
  req: Request,
): { userId: number; role: UserRole } | null => {
  const user = (req as Request & { user?: { userId?: unknown; role?: unknown } })
    .user;
  const userId = Number(user?.userId);
  const role = user?.role;
  if (!Number.isInteger(userId) || userId < 1) {
    return null;
  }
  if (role !== "admin" && role !== "faculty" && role !== "student") {
    return null;
  }
  return { userId, role };
};

const parseEventIdParam = (req: Request, res: Response): number | null => {
  const eventId = Number(req.params.id);
  if (!Number.isInteger(eventId) || eventId < 1) {
    res.status(400).json({ error: "Invalid event id" });
    return null;
  }
  return eventId;
};

const normalizeEventPayload = (
  body: unknown,
): { payload?: NormalizedEventPayload; error?: string } => {
  const source = (body ?? {}) as Record<string, unknown>;
  const title = String(source.title ?? "")
    .trim()
    .slice(0, 255);
  if (!title) {
    return { error: "Title is required" };
  }

  const rawEventDate = String(source.eventDate ?? source.event_date ?? "").trim();
  const parsedDate = new Date(rawEventDate);
  if (!rawEventDate || Number.isNaN(parsedDate.getTime())) {
    return { error: "A valid event date is required" };
  }

  const rawMaxParticipants = source.maxParticipants ?? source.max_participants;
  let maxParticipants: number | null = null;
  if (
    rawMaxParticipants !== undefined &&
    rawMaxParticipants !== null &&
    String(rawMaxParticipants).trim() !== ""
  ) {
    const parsedMaxParticipants = Number(rawMaxParticipants);
    if (!Number.isInteger(parsedMaxParticipants) || parsedMaxParticipants < 1) {
      return { error: "Maximum participants must be a positive integer" };
    }
    maxParticipants = parsedMaxParticipants;
  }

  const category = String(source.category ?? "Conference").trim() || "Conference";
  const status = String(source.status ?? "upcoming").trim() || "upcoming";
  const imageUrl = String(source.imageUrl ?? source.image_url ?? "").trim();

  return {
    payload: {
      title,
      description: String(source.description ?? "").trim(),
      eventDateIso: parsedDate.toISOString(),
      location: String(source.location ?? "").trim(),
      maxParticipants,
      imageUrl: imageUrl || null,
      category,
      status,
    },
  };
};

const ensureAuthUsersTable = async (db: PoolClient | typeof pool): Promise<void> => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS auth_users (
      auth_user_id SERIAL PRIMARY KEY,
      email VARCHAR(320) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL,
      full_name VARCHAR(255) NOT NULL DEFAULT '',
      roll_number VARCHAR(120),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query("ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS email VARCHAR(320)");
  await db.query("ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS password_hash TEXT");
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student'",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NOT NULL DEFAULT ''",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS roll_number VARCHAR(120)",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ",
  );
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'auth_users'
          AND column_name = 'username'
      ) THEN
        EXECUTE 'UPDATE auth_users SET full_name = COALESCE(NULLIF(full_name, ''''), username) WHERE username IS NOT NULL';
        EXECUTE 'ALTER TABLE auth_users ALTER COLUMN username DROP NOT NULL';
      END IF;
    END $$;
  `);
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'auth_users'
          AND column_name = 'password'
      ) THEN
        EXECUTE 'UPDATE auth_users SET password_hash = COALESCE(NULLIF(password_hash, ''''), password::text) WHERE password IS NOT NULL';
        EXECUTE 'ALTER TABLE auth_users ALTER COLUMN password DROP NOT NULL';
      END IF;
    END $$;
  `);
  await db.query("UPDATE auth_users SET password_hash = '' WHERE password_hash IS NULL");
  await db.query("ALTER TABLE auth_users ALTER COLUMN password_hash SET DEFAULT ''");
  await db.query(`
    UPDATE auth_users
    SET created_at = COALESCE(created_at, NOW()),
        updated_at = COALESCE(updated_at, created_at, NOW())
    WHERE created_at IS NULL OR updated_at IS NULL
  `);
  await db.query("ALTER TABLE auth_users ALTER COLUMN created_at SET DEFAULT NOW()");
  await db.query("ALTER TABLE auth_users ALTER COLUMN updated_at SET DEFAULT NOW()");
  await db.query("ALTER TABLE auth_users ALTER COLUMN created_at SET NOT NULL");
  await db.query("ALTER TABLE auth_users ALTER COLUMN updated_at SET NOT NULL");
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users (email)",
  );
};

const ensureEventTables = async (db: PoolClient | typeof pool): Promise<void> => {
  await ensureAuthUsersTable(db);
  await db.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      event_date TIMESTAMPTZ NOT NULL,
      location VARCHAR(255),
      max_participants INTEGER,
      image_url VARCHAR(500),
      category VARCHAR(100) DEFAULT 'Conference',
      status VARCHAR(50) NOT NULL DEFAULT 'upcoming',
      created_by INTEGER REFERENCES auth_users(auth_user_id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Conference'",
  );
  await db.query(
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'upcoming'",
  );
  await db.query(
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  );
  await db.query(
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  );
  await db.query(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES auth_users(auth_user_id) ON DELETE CASCADE,
      registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    )
  `);
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id)",
  );
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id)",
  );
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date)",
  );
};

const ensureInMemorySeedUsers = (): void => {
  const defaults: InMemoryUser[] = [
    {
      auth_user_id: 1,
      email: "admin@eduhub.local",
      role: "admin",
      full_name: "Admin User",
    },
    {
      auth_user_id: 2,
      email: "faculty@eduhub.local",
      role: "faculty",
      full_name: "Faculty User",
    },
    {
      auth_user_id: 3,
      email: "student@eduhub.local",
      role: "student",
      full_name: "Student User",
    },
  ];

  for (const user of defaults) {
    if (!inMemoryUsers.some((existing) => existing.auth_user_id === user.auth_user_id)) {
      inMemoryUsers.push(user);
    }
  }
};

const getInMemoryUser = (userId: number): InMemoryUser | undefined => {
  ensureInMemorySeedUsers();
  return inMemoryUsers.find((user) => user.auth_user_id === userId);
};

const ensureSampleEventInMemory = (): void => {
  ensureInMemorySeedUsers();
  if (inMemoryEvents.length > 0) {
    return;
  }

  const timestamp = nowIso();
  inMemoryEvents.push({
    id: inMemoryEventId++,
    title: "EduHub Innovation Summit",
    description:
      "A campus-wide event for project demos, faculty talks, and student networking.",
    event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Main Auditorium",
    max_participants: 250,
    image_url: null,
    category: "Conference",
    status: "upcoming",
    created_by: 1,
    created_at: timestamp,
    updated_at: timestamp,
  });
};

const decorateInMemoryEvent = (event: EventRecord, userId: number): EventRecord => {
  const creator = getInMemoryUser(event.created_by);
  const registrations = inMemoryRegistrations.filter(
    (registration) => registration.event_id === event.id,
  );

  return {
    ...event,
    created_by_name: creator?.full_name ?? "Admin User",
    registered_count: registrations.length,
    is_registered: registrations.some(
      (registration) => registration.user_id === userId,
    ),
  };
};

const listInMemoryEvents = (
  userId: number,
  options?: { upcomingOnly?: boolean },
): EventRecord[] => {
  ensureSampleEventInMemory();
  const now = new Date();

  return inMemoryEvents
    .slice()
    .filter((event) => {
      if (!options?.upcomingOnly) {
        return true;
      }
      const eventDate = new Date(event.event_date);
      const status = String(event.status ?? "").toLowerCase();
      return (
        eventDate >= now &&
        (status === "upcoming" || status === "ongoing")
      );
    })
    .sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
    )
    .map((event) => decorateInMemoryEvent(event, userId));
};

const createInMemoryEvent = (
  payload: NormalizedEventPayload,
  userId: number,
): EventRecord => {
  const timestamp = nowIso();
  const event: EventRecord = {
    id: inMemoryEventId++,
    title: payload.title,
    description: payload.description,
    event_date: payload.eventDateIso,
    location: payload.location,
    max_participants: payload.maxParticipants,
    image_url: payload.imageUrl,
    category: payload.category,
    status: payload.status,
    created_by: userId,
    created_at: timestamp,
    updated_at: timestamp,
  };
  inMemoryEvents.push(event);
  return decorateInMemoryEvent(event, userId);
};

const updateInMemoryEvent = (
  eventId: number,
  payload: NormalizedEventPayload,
  userId: number,
): EventRecord | null => {
  const index = inMemoryEvents.findIndex((event) => event.id === eventId);
  if (index === -1) {
    return null;
  }

  const updated: EventRecord = {
    ...inMemoryEvents[index],
    title: payload.title,
    description: payload.description,
    event_date: payload.eventDateIso,
    location: payload.location,
    max_participants: payload.maxParticipants,
    image_url: payload.imageUrl,
    category: payload.category,
    status: payload.status,
    updated_at: nowIso(),
  };
  inMemoryEvents[index] = updated;
  return decorateInMemoryEvent(updated, userId);
};

const deleteInMemoryEvent = (eventId: number): boolean => {
  const index = inMemoryEvents.findIndex((event) => event.id === eventId);
  if (index === -1) {
    return false;
  }

  inMemoryEvents.splice(index, 1);
  for (let cursor = inMemoryRegistrations.length - 1; cursor >= 0; cursor -= 1) {
    if (inMemoryRegistrations[cursor].event_id === eventId) {
      inMemoryRegistrations.splice(cursor, 1);
    }
  }
  return true;
};

const registerInMemoryUserForEvent = (
  eventId: number,
  userId: number,
): { registration?: RegistrationRecord; error?: string; status: number } => {
  ensureSampleEventInMemory();
  const event = inMemoryEvents.find((item) => item.id === eventId);
  if (!event) {
    return { error: "Event not found", status: 404 };
  }

  const registrations = inMemoryRegistrations.filter(
    (registration) => registration.event_id === eventId,
  );
  if (registrations.some((registration) => registration.user_id === userId)) {
    return { error: "Already registered for this event", status: 400 };
  }
  if (
    event.max_participants !== null &&
    registrations.length >= event.max_participants
  ) {
    return { error: "Event is full", status: 400 };
  }

  const user = getInMemoryUser(userId);
  const registration: RegistrationRecord = {
    id: inMemoryRegistrationId++,
    event_id: eventId,
    user_id: userId,
    registered_at: nowIso(),
    full_name: user?.full_name ?? "User",
    email: user?.email ?? "",
    role: user?.role ?? "student",
  };
  inMemoryRegistrations.push(registration);
  return { registration, status: 201 };
};

const unregisterInMemoryUserFromEvent = (
  eventId: number,
  userId: number,
): boolean => {
  const index = inMemoryRegistrations.findIndex(
    (registration) =>
      registration.event_id === eventId && registration.user_id === userId,
  );
  if (index === -1) {
    return false;
  }
  inMemoryRegistrations.splice(index, 1);
  return true;
};

const getInMemoryRegistrationsForEvent = (
  eventId: number,
): RegistrationRecord[] =>
  inMemoryRegistrations
    .filter((registration) => registration.event_id === eventId)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.registered_at).getTime() -
        new Date(a.registered_at).getTime(),
    );

const loadEventsFromDatabase = async (
  userId: number,
  options?: { upcomingOnly?: boolean },
): Promise<EventRecord[]> => {
  await ensureEventTables(pool);
  const conditions: string[] = [];

  if (options?.upcomingOnly) {
    conditions.push(
      `(COALESCE(e.status, 'upcoming') IN ('upcoming','ongoing') AND e.event_date >= NOW())`,
    );
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query(`
    SELECT
      e.id,
      e.title,
      COALESCE(e.description, '') AS description,
      e.event_date,
      COALESCE(e.location, '') AS location,
      e.max_participants,
      e.image_url,
      COALESCE(e.category, 'Conference') AS category,
      COALESCE(e.status, 'upcoming') AS status,
      COALESCE(e.created_by, 0) AS created_by,
      e.created_at,
      e.updated_at,
      COALESCE(u.full_name, '') AS created_by_name,
      COUNT(DISTINCT er.id) AS registered_count,
      MAX(CASE WHEN er_user.id IS NOT NULL THEN 1 ELSE 0 END) AS is_registered
    FROM events e
    LEFT JOIN auth_users u ON e.created_by = u.auth_user_id
    LEFT JOIN event_registrations er ON e.id = er.event_id
    LEFT JOIN event_registrations er_user
      ON e.id = er_user.event_id AND er_user.user_id = $1
    ${whereClause}
    GROUP BY e.id, u.full_name
    ORDER BY e.event_date ASC
  `, [userId]);

  return result.rows.map((row) => mapEventRow(row as Record<string, unknown>));
};

const loadEventRegistrationsFromDatabase = async (
  eventId: number,
): Promise<RegistrationRecord[]> => {
  await ensureEventTables(pool);
  const result = await pool.query(
    `
      SELECT er.id, er.event_id, er.user_id, er.registered_at, u.full_name, u.email, u.role
      FROM event_registrations er
      JOIN auth_users u ON er.user_id = u.auth_user_id
      WHERE er.event_id = $1
      ORDER BY er.registered_at DESC
    `,
    [eventId],
  );

  return result.rows.map((row) =>
    mapRegistrationRow(row as Record<string, unknown>),
  );
};

export const getEvents = async (req: Request, res: Response) => {
  const requester = getAuthenticatedUser(req);
  const upcomingOnly = !requester;

  try {
    return res.json(
      await loadEventsFromDatabase(requester?.userId ?? 0, {
        upcomingOnly,
      }),
    );
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return res.json(listInMemoryEvents(requester?.userId ?? 0, {
        upcomingOnly,
      }));
    }

    console.error("Error fetching events:", error);
    return res.status(500).json({ error: "Failed to fetch events" });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  const requester = getAuthenticatedUser(req);
  if (!requester) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (requester.role !== "admin") {
    return res.status(403).json({ error: "Only admins can create events" });
  }

  const normalized = normalizeEventPayload(req.body);
  if (!normalized.payload) {
    return res.status(400).json({ error: normalized.error });
  }

  try {
    await ensureEventTables(pool);
    const result = await pool.query(
      `
        INSERT INTO events (
          title,
          description,
          event_date,
          location,
          max_participants,
          image_url,
          category,
          status,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        normalized.payload.title,
        normalized.payload.description,
        normalized.payload.eventDateIso,
        normalized.payload.location || null,
        normalized.payload.maxParticipants,
        normalized.payload.imageUrl,
        normalized.payload.category,
        normalized.payload.status,
        requester.userId,
      ],
    );

    return res.status(201).json(
      mapEventRow({
        ...(result.rows[0] as Record<string, unknown>),
        description: normalized.payload.description,
        location: normalized.payload.location,
        category: normalized.payload.category,
        status: normalized.payload.status,
        created_by_name: getInMemoryUser(requester.userId)?.full_name ?? "",
        registered_count: 0,
        is_registered: false,
      }),
    );
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return res
        .status(201)
        .json(createInMemoryEvent(normalized.payload, requester.userId));
    }

    console.error("Error creating event:", error);
    return res.status(500).json({ error: "Failed to create event" });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  const requester = getAuthenticatedUser(req);
  if (!requester) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (requester.role !== "admin") {
    return res.status(403).json({ error: "Only admins can update events" });
  }

  const eventId = parseEventIdParam(req, res);
  if (!eventId) {
    return;
  }

  const normalized = normalizeEventPayload(req.body);
  if (!normalized.payload) {
    return res.status(400).json({ error: normalized.error });
  }

  try {
    await ensureEventTables(pool);
    const result = await pool.query(
      `
        UPDATE events
        SET title = $1,
            description = $2,
            event_date = $3,
            location = $4,
            max_participants = $5,
            image_url = $6,
            category = $7,
            status = $8,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING *
      `,
      [
        normalized.payload.title,
        normalized.payload.description,
        normalized.payload.eventDateIso,
        normalized.payload.location || null,
        normalized.payload.maxParticipants,
        normalized.payload.imageUrl,
        normalized.payload.category,
        normalized.payload.status,
        eventId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    return res.json(
      mapEventRow({
        ...(result.rows[0] as Record<string, unknown>),
        description: normalized.payload.description,
        location: normalized.payload.location,
        category: normalized.payload.category,
        status: normalized.payload.status,
        created_by_name: getInMemoryUser(requester.userId)?.full_name ?? "",
        registered_count: 0,
        is_registered: false,
      }),
    );
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      const updated = updateInMemoryEvent(
        eventId,
        normalized.payload,
        requester.userId,
      );
      if (!updated) {
        return res.status(404).json({ error: "Event not found" });
      }
      return res.json(updated);
    }

    console.error("Error updating event:", error);
    return res.status(500).json({ error: "Failed to update event" });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  const requester = getAuthenticatedUser(req);
  if (!requester) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (requester.role !== "admin") {
    return res.status(403).json({ error: "Only admins can delete events" });
  }

  const eventId = parseEventIdParam(req, res);
  if (!eventId) {
    return;
  }

  try {
    await ensureEventTables(pool);
    await pool.query("DELETE FROM event_registrations WHERE event_id = $1", [eventId]);
    const deleted = await pool.query(
      "DELETE FROM events WHERE id = $1 RETURNING id",
      [eventId],
    );
    if ((deleted.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    return res.json({ message: "Event deleted successfully" });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      if (!deleteInMemoryEvent(eventId)) {
        return res.status(404).json({ error: "Event not found" });
      }
      return res.json({ message: "Event deleted successfully" });
    }

    console.error("Error deleting event:", error);
    return res.status(500).json({ error: "Failed to delete event" });
  }
};

export const registerForEvent = async (req: Request, res: Response) => {
  const requester = getAuthenticatedUser(req);
  if (!requester) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const eventId = parseEventIdParam(req, res);
  if (!eventId) {
    return;
  }

  try {
    await ensureEventTables(pool);
    const eventResult = await pool.query(
      `
        SELECT e.id, e.max_participants, COUNT(er.id) AS registered_count
        FROM events e
        LEFT JOIN event_registrations er ON e.id = er.event_id
        WHERE e.id = $1
        GROUP BY e.id
      `,
      [eventId],
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = eventResult.rows[0] as Record<string, unknown>;
    const registeredCount = Number(event.registered_count ?? 0);
    const maxParticipants =
      event.max_participants === null || event.max_participants === undefined
        ? null
        : Number(event.max_participants);

    if (maxParticipants !== null && registeredCount >= maxParticipants) {
      return res.status(400).json({ error: "Event is full" });
    }

    const result = await pool.query(
      `
        INSERT INTO event_registrations (event_id, user_id)
        VALUES ($1, $2)
        RETURNING *
      `,
      [eventId, requester.userId],
    );

    return res.status(201).json({
      message: "Successfully registered for event",
      registration: result.rows[0],
    });
  } catch (error: unknown) {
    const duplicateCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (duplicateCode === "23505") {
      return res.status(400).json({ error: "Already registered for this event" });
    }
    if (isDatabaseConnectionError(error)) {
      const fallback = registerInMemoryUserForEvent(eventId, requester.userId);
      if (!fallback.registration) {
        return res.status(fallback.status).json({ error: fallback.error });
      }
      return res.status(201).json({
        message: "Successfully registered for event",
        registration: fallback.registration,
      });
    }

    console.error("Error registering for event:", error);
    return res.status(500).json({ error: "Failed to register for event" });
  }
};

export const unregisterFromEvent = async (req: Request, res: Response) => {
  const requester = getAuthenticatedUser(req);
  if (!requester) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const eventId = parseEventIdParam(req, res);
  if (!eventId) {
    return;
  }

  try {
    await ensureEventTables(pool);
    const result = await pool.query(
      `
        DELETE FROM event_registrations
        WHERE event_id = $1 AND user_id = $2
        RETURNING *
      `,
      [eventId, requester.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    return res.json({ message: "Successfully unregistered from event" });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      if (!unregisterInMemoryUserFromEvent(eventId, requester.userId)) {
        return res.status(404).json({ error: "Registration not found" });
      }
      return res.json({ message: "Successfully unregistered from event" });
    }

    console.error("Error unregistering from event:", error);
    return res.status(500).json({ error: "Failed to unregister from event" });
  }
};

export const getEventRegistrations = async (req: Request, res: Response) => {
  const requester = getAuthenticatedUser(req);
  if (!requester) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (requester.role !== "admin") {
    return res.status(403).json({ error: "Only admins can view registrations" });
  }

  const eventId = parseEventIdParam(req, res);
  if (!eventId) {
    return;
  }

  try {
    return res.json(await loadEventRegistrationsFromDatabase(eventId));
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return res.json(getInMemoryRegistrationsForEvent(eventId));
    }

    console.error("Error fetching registrations:", error);
    return res.status(500).json({ error: "Failed to fetch registrations" });
  }
};
