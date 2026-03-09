import { Pool } from "pg";
import Redis from "ioredis";

interface PerformanceMetrics {
  student_id: string;
  attendance_percentage: number;
  quiz_score: number;
  assessment_score: number;
  interaction_score: number;
  literacy_percentage: number;
  literacy_level: "Low" | "Medium" | "High";
}

interface StudentPerformanceQuery {
  department?: string;
  year?: number;
  section?: string;
  limit?: number;
  offset?: number;
  sortBy?: "literacy_percentage" | "attendance_percentage" | "name";
  sortOrder?: "ASC" | "DESC";
}

export class PerformanceService {
  private db: Pool;
  private redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(db: Pool, redis: Redis) {
    this.db = db;
    this.redis = redis;
  }

  // Batch update performance metrics (for daily processing)
  async batchUpdatePerformance(metrics: PerformanceMetrics[]): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      const query = `
        INSERT INTO student_performance (student_id, metric_date, attendance_percentage, 
          quiz_score, assessment_score, interaction_score, literacy_percentage, literacy_level)
        SELECT s.id, CURRENT_DATE, $2, $3, $4, $5, $6, $7
        FROM students s WHERE s.student_id = $1
        ON CONFLICT (student_id, metric_date) 
        DO UPDATE SET 
          attendance_percentage = EXCLUDED.attendance_percentage,
          quiz_score = EXCLUDED.quiz_score,
          assessment_score = EXCLUDED.assessment_score,
          interaction_score = EXCLUDED.interaction_score,
          literacy_percentage = EXCLUDED.literacy_percentage,
          literacy_level = EXCLUDED.literacy_level,
          updated_at = CURRENT_TIMESTAMP
      `;

      for (const metric of metrics) {
        await client.query(query, [
          metric.student_id,
          metric.attendance_percentage,
          metric.quiz_score,
          metric.assessment_score,
          metric.interaction_score,
          metric.literacy_percentage,
          metric.literacy_level,
        ]);
      }

      await client.query("COMMIT");

      // Refresh materialized view
      await client.query(
        "REFRESH MATERIALIZED VIEW CONCURRENTLY student_performance_summary",
      );

      // Clear related cache
      await this.redis.del("performance:*");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Get paginated student performance with caching
  async getStudentPerformance(query: StudentPerformanceQuery): Promise<{
    students: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const cacheKey = `performance:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const sortBy = query.sortBy || "literacy_percentage";
    const sortOrder = query.sortOrder || "DESC";

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramCount = 0;

    if (query.department) {
      whereClause += ` AND d.code = $${++paramCount}`;
      params.push(query.department);
    }
    if (query.year) {
      whereClause += ` AND sps.year = $${++paramCount}`;
      params.push(query.year);
    }
    if (query.section) {
      whereClause += ` AND sps.section = $${++paramCount}`;
      params.push(query.section);
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM student_performance_summary sps
      JOIN departments d ON sps.department_id = d.id
      ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        sps.student_id,
        sps.name,
        d.name as department,
        sps.year,
        sps.section,
        ROUND(sps.avg_attendance, 2) as attendance,
        ROUND(sps.avg_quiz_score, 2) as quiz_score,
        ROUND(sps.avg_assessment_score, 2) as assessment_score,
        ROUND(sps.avg_interaction_score, 2) as interaction_score,
        ROUND(sps.avg_literacy_percentage, 2) as literacy_percentage,
        sps.current_literacy_level as literacy_level
      FROM student_performance_summary sps
      JOIN departments d ON sps.department_id = d.id
      ${whereClause}
      ORDER BY sps.${sortBy} ${sortOrder}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      this.db.query(countQuery, params.slice(0, -2)),
      this.db.query(dataQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    const page = Math.floor(offset / limit) + 1;

    const result = {
      students: dataResult.rows,
      total,
      page,
      totalPages,
    };

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  // Get department analytics with caching
  async getDepartmentAnalytics(): Promise<any> {
    const cacheKey = "analytics:departments";
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const query = `
      SELECT 
        d.name as department,
        d.code,
        COUNT(sps.id) as total_students,
        ROUND(AVG(sps.avg_literacy_percentage), 2) as avg_literacy,
        ROUND(AVG(sps.avg_attendance), 2) as avg_attendance,
        COUNT(CASE WHEN sps.current_literacy_level = 'High' THEN 1 END) as high_performers,
        COUNT(CASE WHEN sps.current_literacy_level = 'Medium' THEN 1 END) as medium_performers,
        COUNT(CASE WHEN sps.current_literacy_level = 'Low' THEN 1 END) as low_performers
      FROM student_performance_summary sps
      JOIN departments d ON sps.department_id = d.id
      GROUP BY d.id, d.name, d.code
      ORDER BY avg_literacy DESC
    `;

    const result = await this.db.query(query);

    // Cache for 10 minutes
    await this.redis.setex(cacheKey, 600, JSON.stringify(result.rows));

    return result.rows;
  }

  // Real-time attendance update
  async markAttendance(
    attendanceRecords: {
      student_id: string;
      subject_id: number;
      faculty_id: number;
      status: "Present" | "Absent" | "Late";
    }[],
  ): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      const query = `
        INSERT INTO attendance_records (student_id, subject_id, faculty_id, date, status)
        SELECT s.id, $2, $3, CURRENT_DATE, $4
        FROM students s WHERE s.student_id = $1
        ON CONFLICT (student_id, subject_id, date) 
        DO UPDATE SET status = EXCLUDED.status, marked_at = CURRENT_TIMESTAMP
      `;

      for (const record of attendanceRecords) {
        await client.query(query, [
          record.student_id,
          record.subject_id,
          record.faculty_id,
          record.status,
        ]);
      }

      await client.query("COMMIT");

      // Clear attendance cache
      await this.redis.del("attendance:*");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
