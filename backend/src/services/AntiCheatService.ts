import { Pool } from "pg";
import { getAcademicTableNames } from "../utils/studentPortalAccess";
import { levenshteinDistance } from "../utils/stringUtils";

interface CheatingEvent {
  type:
    | "tab_switch"
    | "window_blur"
    | "copy_paste"
    | "right_click"
    | "dev_tools"
    | "fullscreen_exit";
  data?: any;
  timestamp: Date;
}

interface PlagiarismResult {
  submissionId: number;
  similarSubmissions: {
    id: number;
    studentId: number;
    studentName?: string;
    similarity: number;
    matchingLines: string[];
  }[];
  overallScore: number;
}

export class AntiCheatService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  private async getStudentTableName(): Promise<string | null> {
    const { studentTableName } = await getAcademicTableNames(this.db);
    return studentTableName;
  }

  // Log cheating events
  async logCheatingEvent(
    attemptId: number,
    event: CheatingEvent,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO cheating_logs (attempt_id, event_type, event_data, timestamp) 
       VALUES ($1, $2, $3, $4)`,
      [attemptId, event.type, JSON.stringify(event.data), event.timestamp],
    );

    // Check if attempt should be flagged
    await this.checkCheatingThreshold(attemptId);
  }

  // Check if cheating threshold exceeded
  private async checkCheatingThreshold(attemptId: number): Promise<void> {
    const result = await this.db.query(
      `SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type IN ('tab_switch', 'window_blur', 'fullscreen_exit') THEN 1 END) as suspicious_events
       FROM cheating_logs 
       WHERE attempt_id = $1 AND timestamp > NOW() - INTERVAL '10 minutes'`,
      [attemptId],
    );

    const { total_events, suspicious_events } = result.rows[0];

    // Flag if more than 5 suspicious events in 10 minutes
    if (suspicious_events > 5) {
      await this.db.query(
        `UPDATE test_attempts 
         SET is_flagged = true, 
             cheating_flags = cheating_flags || $2
         WHERE id = $1`,
        [
          attemptId,
          JSON.stringify([
            { type: "excessive_tab_switching", count: suspicious_events },
          ]),
        ],
      );
    }
  }

  // Terminate test for cheating
  async terminateTest(attemptId: number, reason: string): Promise<void> {
    await this.db.query(
      `UPDATE test_attempts 
       SET status = 'Terminated', 
           end_time = CURRENT_TIMESTAMP,
           cheating_flags = cheating_flags || $2
       WHERE id = $1`,
      [attemptId, JSON.stringify([{ type: "terminated", reason }])],
    );
  }

  // Plagiarism detection using Levenshtein distance
  async detectPlagiarism(submissionId: number): Promise<PlagiarismResult> {
    // Get current submission
    const currentSubmission = await this.db.query(
      `SELECT qs.*, ta.test_id, ta.student_id 
       FROM question_submissions qs
       JOIN test_attempts ta ON qs.attempt_id = ta.id
       WHERE qs.id = $1`,
      [submissionId],
    );

    if (currentSubmission.rows.length === 0) {
      throw new Error("Submission not found");
    }

    const current = currentSubmission.rows[0];
    const studentTableName = await this.getStudentTableName();

    // Get all other submissions for the same question (excluding same student)
    const otherSubmissions = studentTableName
      ? await this.db.query(
          `SELECT qs.id, qs.code, ta.student_id, COALESCE(s.name, 'Student') as student_name
           FROM question_submissions qs
           JOIN test_attempts ta ON qs.attempt_id = ta.id
           LEFT JOIN ${studentTableName} s ON ta.student_id = s.id
           WHERE qs.question_id = $1 
             AND ta.student_id != $2 
             AND qs.status = 'Accepted'
             AND qs.id != $3`,
          [current.question_id, current.student_id, submissionId],
        )
      : await this.db.query(
          `SELECT qs.id, qs.code, ta.student_id, 'Student' as student_name
           FROM question_submissions qs
           JOIN test_attempts ta ON qs.attempt_id = ta.id
           WHERE qs.question_id = $1 
             AND ta.student_id != $2 
             AND qs.status = 'Accepted'
             AND qs.id != $3`,
          [current.question_id, current.student_id, submissionId],
        );

    const similarSubmissions = [];

    for (const other of otherSubmissions.rows) {
      const similarity = this.calculateCodeSimilarity(current.code, other.code);

      if (similarity > 0.7) {
        // 70% similarity threshold
        const matchingLines = this.findMatchingLines(current.code, other.code);

        similarSubmissions.push({
          id: other.id,
          studentId: other.student_id,
          studentName: other.student_name,
          similarity: similarity,
          matchingLines,
        });

        // Store plagiarism result
        await this.db.query(
          `INSERT INTO plagiarism_results (submission_id, similar_submission_id, similarity_score, matching_lines)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (submission_id, similar_submission_id) 
           DO UPDATE SET similarity_score = EXCLUDED.similarity_score`,
          [submissionId, other.id, similarity, JSON.stringify(matchingLines)],
        );
      }
    }

    const overallScore =
      similarSubmissions.length > 0
        ? Math.max(...similarSubmissions.map((s) => s.similarity))
        : 0;

    // Update submission plagiarism score
    await this.db.query(
      `UPDATE test_attempts 
       SET plagiarism_score = $2 
       WHERE id = (SELECT attempt_id FROM question_submissions WHERE id = $1)`,
      [submissionId, overallScore],
    );

    return {
      submissionId,
      similarSubmissions,
      overallScore,
    };
  }

  // Calculate code similarity using normalized Levenshtein distance
  private calculateCodeSimilarity(code1: string, code2: string): number {
    // Normalize code (remove whitespace, comments, etc.)
    const normalize = (code: string) => {
      return code
        .replace(/\/\*[\s\S]*?\*\//g, "") // Remove block comments
        .replace(/\/\/.*$/gm, "") // Remove line comments
        .replace(/\s+/g, " ") // Normalize whitespace
        .replace(/[{}();]/g, "") // Remove common syntax
        .toLowerCase()
        .trim();
    };

    const norm1 = normalize(code1);
    const norm2 = normalize(code2);

    if (norm1.length === 0 || norm2.length === 0) return 0;

    const distance = levenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);

    return 1 - distance / maxLength;
  }

  // Find matching lines between two code submissions
  private findMatchingLines(code1: string, code2: string): string[] {
    const lines1 = code1
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const lines2 = code2
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const matchingLines = [];

    for (const line1 of lines1) {
      for (const line2 of lines2) {
        if (line1 === line2 && line1.length > 10) {
          // Only consider substantial lines
          matchingLines.push(line1);
        }
      }
    }

    return [...new Set(matchingLines)]; // Remove duplicates
  }

  // Get cheating report for faculty
  async getCheatingReport(testId: number): Promise<any> {
    const studentTableName = await this.getStudentTableName();
    const result = studentTableName
      ? await this.db.query(
          `SELECT 
            ta.id as attempt_id,
            COALESCE(s.student_id, ta.student_id::text) as student_id,
            COALESCE(s.name, 'Student') as student_name,
            ta.status,
            ta.plagiarism_score,
            ta.cheating_flags,
            ta.is_flagged,
            COUNT(cl.id) as total_events,
            COUNT(CASE WHEN cl.event_type IN ('tab_switch', 'window_blur', 'fullscreen_exit') THEN 1 END) as suspicious_events
           FROM test_attempts ta
           LEFT JOIN ${studentTableName} s ON ta.student_id = s.id
           LEFT JOIN cheating_logs cl ON ta.id = cl.attempt_id
           WHERE ta.test_id = $1
           GROUP BY ta.id, s.student_id, s.name, ta.status, ta.plagiarism_score, ta.cheating_flags, ta.is_flagged
           ORDER BY ta.plagiarism_score DESC, suspicious_events DESC`,
          [testId],
        )
      : await this.db.query(
          `SELECT 
            ta.id as attempt_id,
            ta.student_id::text as student_id,
            'Student' as student_name,
            ta.status,
            ta.plagiarism_score,
            ta.cheating_flags,
            ta.is_flagged,
            COUNT(cl.id) as total_events,
            COUNT(CASE WHEN cl.event_type IN ('tab_switch', 'window_blur', 'fullscreen_exit') THEN 1 END) as suspicious_events
           FROM test_attempts ta
           LEFT JOIN cheating_logs cl ON ta.id = cl.attempt_id
           WHERE ta.test_id = $1
           GROUP BY ta.id, ta.student_id, ta.status, ta.plagiarism_score, ta.cheating_flags, ta.is_flagged
           ORDER BY ta.plagiarism_score DESC, suspicious_events DESC`,
          [testId],
        );

    return result.rows;
  }
}
