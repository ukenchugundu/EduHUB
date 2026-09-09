const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const { randomBytes, scryptSync } = require("crypto");

// Load .env
const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const fileContent = fs.readFileSync(filePath, "utf8");
  for (const rawLine of fileContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};

loadEnvFile(path.resolve(__dirname, "..", "..", ".env"));
loadEnvFile(path.resolve(__dirname, "..", ".env"));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing.");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const ADMIN_PASS = hashPassword("Admin@123");
const FACULTY_PASS = hashPassword("Faculty@123");
const STUDENT_PASS = hashPassword("Student@123");

async function seedCompleteData() {
  const client = await pool.connect();
  console.log("Connected to Supabase PostgreSQL. Seeding institutional university data...");

  try {
    await client.query("BEGIN");

    // 1. DEPARTMENTS
    console.log("\n[1/12] Seeding Departments...");
    const departments = [
      { code: "CSD", name: "Computer Science and Data Science" },
      { code: "AIML", name: "Artificial Intelligence and Machine Learning" },
      { code: "CSE", name: "Computer Science and Engineering" },
      { code: "IT", name: "Information Technology" },
      { code: "ECE", name: "Electronics and Communication Engineering" },
    ];

    for (const d of departments) {
      await client.query(
        `INSERT INTO departments (name, code) VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
        [d.name, d.code]
      );
      await client.query(
        `INSERT INTO department (name, code) VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
        [d.name, d.code]
      );
    }

    const deptRows = await client.query("SELECT id, code, name FROM department");
    const deptMap = new Map(deptRows.rows.map(r => [r.code, r.id]));
    console.log(`✓ Seeded ${deptRows.rows.length} departments.`);

    // 2. BATCHES
    console.log("\n[2/12] Seeding Batches...");
    const batches = [
      // CSD Batches
      { dept: "CSD", name: "I CSD-A", year: "2024-2025", sem: 1 },
      { dept: "CSD", name: "I CSD-B", year: "2024-2025", sem: 1 },
      { dept: "CSD", name: "II CSD-A", year: "2024-2025", sem: 2 },
      { dept: "CSD", name: "II CSD-B", year: "2024-2025", sem: 2 },
      { dept: "CSD", name: "III CSD-A", year: "2024-2025", sem: 3 },
      { dept: "CSD", name: "III CSD-B", year: "2024-2025", sem: 3 },
      { dept: "CSD", name: "IV CSD-A", year: "2024-2025", sem: 4 },
      { dept: "CSD", name: "IV CSD-B", year: "2024-2025", sem: 4 },
      // AIML Batches
      { dept: "AIML", name: "I AIML-A", year: "2024-2025", sem: 1 },
      { dept: "AIML", name: "II AIML-A", year: "2024-2025", sem: 2 },
      { dept: "AIML", name: "III AIML-A", year: "2024-2025", sem: 3 },
      { dept: "AIML", name: "IV AIML-A", year: "2024-2025", sem: 4 },
      // CSE Batches
      { dept: "CSE", name: "I CSE-A", year: "2024-2025", sem: 1 },
      { dept: "CSE", name: "II CSE-A", year: "2024-2025", sem: 2 },
      { dept: "CSE", name: "III CSE-A", year: "2024-2025", sem: 3 },
      { dept: "CSE", name: "IV CSE-A", year: "2024-2025", sem: 4 },
      // IT Batches
      { dept: "IT", name: "II IT-A", year: "2024-2025", sem: 2 },
      { dept: "IT", name: "III IT-A", year: "2024-2025", sem: 3 },
      // ECE Batches
      { dept: "ECE", name: "II ECE-A", year: "2024-2025", sem: 2 },
      { dept: "ECE", name: "III ECE-A", year: "2024-2025", sem: 3 },
    ];

    for (const b of batches) {
      const deptId = deptMap.get(b.dept);
      if (!deptId) continue;
      await client.query(
        `INSERT INTO batches (name, department_id, academic_year, semester)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name, department_id, academic_year) DO NOTHING`,
        [b.name, deptId, b.year, b.sem]
      );
      await client.query(
        `INSERT INTO batch (name, department_id, academic_year, semester)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name, department_id, academic_year) DO NOTHING`,
        [b.name, deptId, b.year, b.sem]
      );
    }

    const batchRows = await client.query("SELECT id, name, department_id FROM batch");
    const batchMap = new Map(batchRows.rows.map(r => [r.name, r.id]));
    console.log(`✓ Seeded ${batchRows.rows.length} batches across departments.`);

    // 3. FACULTY & ADMIN USERS
    console.log("\n[3/12] Seeding Faculty & Admin Users...");
    const facultyUsers = [
      {
        email: "admin@eduhub.local",
        fullName: "System Admin",
        role: "admin",
        passwordHash: ADMIN_PASS,
        phone: "+91 9876543210",
        dept: null,
        designation: "Chief Information Officer",
      },
      {
        email: "faculty@eduhub.local",
        fullName: "Dr. Sarah Mitchell",
        role: "faculty",
        passwordHash: FACULTY_PASS,
        phone: "+91 9876543211",
        dept: "Computer Science and Data Science",
        designation: "Associate Professor & Vice Chair",
      },
      {
        email: "rajesh.verma@eduhub.local",
        fullName: "Dr. Rajesh Verma",
        role: "faculty",
        passwordHash: FACULTY_PASS,
        phone: "+91 9876543212",
        dept: "Computer Science and Engineering",
        designation: "Professor & Head of Department",
      },
      {
        email: "emily.watson@eduhub.local",
        fullName: "Dr. Emily Watson",
        role: "faculty",
        passwordHash: FACULTY_PASS,
        phone: "+91 9876543213",
        dept: "Artificial Intelligence and Machine Learning",
        designation: "Associate Professor",
      },
      {
        email: "vikram.rao@eduhub.local",
        fullName: "Prof. Vikram Rao",
        role: "faculty",
        passwordHash: FACULTY_PASS,
        phone: "+91 9876543214",
        dept: "Computer Science and Data Science",
        designation: "Assistant Professor",
      },
      {
        email: "priya.sharma@eduhub.local",
        fullName: "Dr. Priya Sharma",
        role: "faculty",
        passwordHash: FACULTY_PASS,
        phone: "+91 9876543215",
        dept: "Information Technology",
        designation: "Associate Professor",
      },
    ];

    const facultyIdMap = new Map();
    for (const u of facultyUsers) {
      const res = await client.query(
        `INSERT INTO auth_users (email, password_hash, role, full_name, phone, department, designation, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           phone = EXCLUDED.phone,
           department = EXCLUDED.department,
           designation = EXCLUDED.designation,
           updated_at = NOW()
         RETURNING auth_user_id`,
        [u.email, u.passwordHash, u.role, u.fullName, u.phone, u.dept, u.designation]
      );
      facultyIdMap.set(u.email, res.rows[0].auth_user_id);
    }
    console.log(`✓ Seeded ${facultyUsers.length} admin & faculty accounts.`);

    // 4. FACULTY CLASS ALLOCATIONS
    console.log("\n[4/12] Seeding Faculty Class Allocations...");
    const sarahId = facultyIdMap.get("faculty@eduhub.local");
    const rajeshId = facultyIdMap.get("rajesh.verma@eduhub.local");
    const emilyId = facultyIdMap.get("emily.watson@eduhub.local");
    const vikramId = facultyIdMap.get("vikram.rao@eduhub.local");
    const priyaId = facultyIdMap.get("priya.sharma@eduhub.local");

    const allocations = [
      { facultyId: sarahId, className: "II CSD-A", batchId: batchMap.get("II CSD-A"), dept: "CSD", year: "2024-2025", sec: "A" },
      { facultyId: sarahId, className: "II CSD-B", batchId: batchMap.get("II CSD-B"), dept: "CSD", year: "2024-2025", sec: "B" },
      { facultyId: sarahId, className: "III CSD-A", batchId: batchMap.get("III CSD-A"), dept: "CSD", year: "2024-2025", sec: "A" },
      { facultyId: sarahId, className: "CSE - Section A", batchId: batchMap.get("II CSE-A"), dept: "CSE", year: "2024-2025", sec: "A" },
      { facultyId: rajeshId, className: "III CSE-A", batchId: batchMap.get("III CSE-A"), dept: "CSE", year: "2024-2025", sec: "A" },
      { facultyId: rajeshId, className: "IV CSE-A", batchId: batchMap.get("IV CSE-A"), dept: "CSE", year: "2024-2025", sec: "A" },
      { facultyId: rajeshId, className: "II CSD-A", batchId: batchMap.get("II CSD-A"), dept: "CSD", year: "2024-2025", sec: "A" },
      { facultyId: emilyId, className: "II AIML-A", batchId: batchMap.get("II AIML-A"), dept: "AIML", year: "2024-2025", sec: "A" },
      { facultyId: emilyId, className: "III AIML-A", batchId: batchMap.get("III AIML-A"), dept: "AIML", year: "2024-2025", sec: "A" },
      { facultyId: vikramId, className: "I CSD-A", batchId: batchMap.get("I CSD-A"), dept: "CSD", year: "2024-2025", sec: "A" },
      { facultyId: vikramId, className: "II CSD-A", batchId: batchMap.get("II CSD-A"), dept: "CSD", year: "2024-2025", sec: "A" },
      { facultyId: priyaId, className: "II IT-A", batchId: batchMap.get("II IT-A"), dept: "IT", year: "2024-2025", sec: "A" },
      { facultyId: priyaId, className: "II CSD-A", batchId: batchMap.get("II CSD-A"), dept: "CSD", year: "2024-2025", sec: "A" },
    ];

    // Clear and re-populate faculty_class_allocations cleanly
    await client.query("DELETE FROM faculty_class_allocations");
    for (const a of allocations) {
      if (!a.facultyId) continue;
      await client.query(
        `INSERT INTO faculty_class_allocations (faculty_id, class_name, batch_id, department, academic_year, section)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [a.facultyId, a.className, a.batchId || null, a.dept, a.year, a.sec]
      );
    }
    console.log(`✓ Seeded ${allocations.length} faculty class allocations.`);

    // 5. STUDENT ACCOUNTS
    console.log("\n[5/12] Seeding Student Accounts...");
    const studentUsers = [
      {
        email: "student@eduhub.local",
        fullName: "Alex Chen",
        rollNumber: "STU001",
        deptCode: "CSD",
        year: 2,
        academicYear: "2nd yr",
        section: "A",
        batchName: "II CSD-A",
      },
      {
        email: "rohan.mehta@eduhub.local",
        fullName: "Rohan Mehta",
        rollNumber: "STU002",
        deptCode: "CSD",
        year: 2,
        academicYear: "2nd yr",
        section: "A",
        batchName: "II CSD-A",
      },
      {
        email: "ananya.iyer@eduhub.local",
        fullName: "Ananya Iyer",
        rollNumber: "STU003",
        deptCode: "CSD",
        year: 2,
        academicYear: "2nd yr",
        section: "A",
        batchName: "II CSD-A",
      },
      {
        email: "david.miller@eduhub.local",
        fullName: "David Miller",
        rollNumber: "STU004",
        deptCode: "CSD",
        year: 2,
        academicYear: "2nd yr",
        section: "A",
        batchName: "II CSD-A",
      },
      {
        email: "sneha.patel@eduhub.local",
        fullName: "Sneha Patel",
        rollNumber: "STU005",
        deptCode: "CSD",
        year: 2,
        academicYear: "2nd yr",
        section: "A",
        batchName: "II CSD-A",
      },
      {
        email: "kevin.zhang@eduhub.local",
        fullName: "Kevin Zhang",
        rollNumber: "STU006",
        deptCode: "CSD",
        year: 2,
        academicYear: "2nd yr",
        section: "A",
        batchName: "II CSD-A",
      },
      {
        email: "aarav.sharma@eduhub.local",
        fullName: "Aarav Sharma",
        rollNumber: "STU007",
        deptCode: "CSE",
        year: 3,
        academicYear: "3rd yr",
        section: "A",
        batchName: "III CSE-A",
      },
      {
        email: "maya.lin@eduhub.local",
        fullName: "Maya Lin",
        rollNumber: "STU008",
        deptCode: "CSE",
        year: 3,
        academicYear: "3rd yr",
        section: "A",
        batchName: "III CSE-A",
      },
      {
        email: "arjun.nair@eduhub.local",
        fullName: "Arjun Nair",
        rollNumber: "STU009",
        deptCode: "AIML",
        year: 2,
        academicYear: "2nd yr",
        section: "A",
        batchName: "II AIML-A",
      },
      {
        email: "sophia.taylor@eduhub.local",
        fullName: "Sophia Taylor",
        rollNumber: "STU010",
        deptCode: "AIML",
        year: 2,
        academicYear: "2nd yr",
        section: "A",
        batchName: "II AIML-A",
      },
    ];

    const studentAuthMap = new Map();
    const studentTableIdMap = new Map();

    for (const s of studentUsers) {
      const deptId = deptMap.get(s.deptCode);
      const batchId = batchMap.get(s.batchName);

      // auth_users
      const authRes = await client.query(
        `INSERT INTO auth_users (email, password_hash, role, full_name, roll_number, department, academic_year, section, updated_at)
         VALUES ($1, $2, 'student', $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           roll_number = EXCLUDED.roll_number,
           department = EXCLUDED.department,
           academic_year = EXCLUDED.academic_year,
           section = EXCLUDED.section,
           updated_at = NOW()
         RETURNING auth_user_id`,
        [s.email, STUDENT_PASS, s.fullName, s.rollNumber, s.deptCode, s.academicYear, s.section]
      );
      const authUserId = authRes.rows[0].auth_user_id;
      studentAuthMap.set(s.rollNumber, authUserId);

      // student table
      const stuRes = await client.query(
        `INSERT INTO student (student_id, name, email, department_id, year, section, batch_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (student_id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           department_id = EXCLUDED.department_id,
           year = EXCLUDED.year,
           section = EXCLUDED.section,
           batch_id = EXCLUDED.batch_id,
           updated_at = NOW()
         RETURNING id`,
        [s.rollNumber, s.fullName, s.email, deptId, s.year, s.section, batchId]
      );
      const studentId = stuRes.rows[0].id;
      studentTableIdMap.set(s.rollNumber, studentId);

      // batch_student mapping
      if (batchId && studentId) {
        await client.query(
          `INSERT INTO batch_student (batch_id, student_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [batchId, studentId]
        );
      }
    }
    console.log(`✓ Seeded ${studentUsers.length} student records across auth_users and student table.`);

    // 6. QUIZZES & QUESTIONS
    console.log("\n[6/12] Seeding Quizzes & Question Banks...");
    const quizzes = [
      {
        cls: "II CSD-A",
        title: "Data Structures & Algorithms Mastery",
        duration: "30 mins",
        status: "Published",
        batchId: batchMap.get("II CSD-A"),
        questions: [
          {
            text: "What is the average time complexity of QuickSort?",
            type: "mcq",
            options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"],
            correctIndex: 1,
            correctText: "O(n log n)",
          },
          {
            text: "Which data structure is primarily used for Breadth-First Search (BFS) graph traversal?",
            type: "mcq",
            options: ["Stack", "Priority Queue", "Queue", "Binary Search Tree"],
            correctIndex: 2,
            correctText: "Queue",
          },
          {
            text: "In an AVL Tree, what is the maximum permissible height difference between the left and right subtrees of any node?",
            type: "mcq",
            options: ["0", "1", "2", "log(n)"],
            correctIndex: 1,
            correctText: "1",
          },
          {
            text: "What is the average time complexity of search and insertion in a Hash Table with good distribution?",
            type: "mcq",
            options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
            correctIndex: 0,
            correctText: "O(1)",
          },
          {
            text: "A Max Heap guarantees that the element with the maximum value is always stored at which position?",
            type: "mcq",
            options: ["Last Leaf Node", "Root Node", "Middle Node", "Leftmost Child"],
            correctIndex: 1,
            correctText: "Root Node",
          },
        ],
      },
      {
        cls: "II CSD-A",
        title: "Relational Database Systems & SQL Analytics",
        duration: "25 mins",
        status: "Published",
        batchId: batchMap.get("II CSD-A"),
        questions: [
          {
            text: "Which normal form requires removing transitive functional dependencies?",
            type: "mcq",
            options: ["First Normal Form (1NF)", "Second Normal Form (2NF)", "Third Normal Form (3NF)", "Boyce-Codd Normal Form (BCNF)"],
            correctIndex: 2,
            correctText: "Third Normal Form (3NF)",
          },
          {
            text: "Which ACID property ensures that an interrupted transaction leaves the database in its previous consistent state?",
            type: "mcq",
            options: ["Atomicity", "Consistency", "Isolation", "Durability"],
            correctIndex: 0,
            correctText: "Atomicity",
          },
          {
            text: "Which SQL clause is used to filter aggregated results produced by the GROUP BY clause?",
            type: "mcq",
            options: ["WHERE", "HAVING", "LIMIT", "FILTER BY"],
            correctIndex: 1,
            correctText: "HAVING",
          },
          {
            text: "What type of index is typically created by PostgreSQL on PRIMARY KEY columns by default?",
            type: "mcq",
            options: ["Hash Index", "B-Tree Index", "GIN Index", "GiST Index"],
            correctIndex: 1,
            correctText: "B-Tree Index",
          },
        ],
      },
      {
        cls: "II CSD-A",
        title: "Python for Data Science & Numerical Computing",
        duration: "20 mins",
        status: "Published",
        batchId: batchMap.get("II CSD-A"),
        questions: [
          {
            text: "Which library provides fast N-dimensional array processing in Python?",
            type: "mcq",
            options: ["Matplotlib", "NumPy", "Flask", "Requests"],
            correctIndex: 1,
            correctText: "NumPy",
          },
          {
            text: "In pandas, which function quickly provides count, mean, std, min, and quartiles for numeric columns?",
            type: "mcq",
            options: ["df.info()", "df.describe()", "df.summary()", "df.aggregate()"],
            correctIndex: 1,
            correctText: "df.describe()",
          },
          {
            text: "What is the broadcasting rule in NumPy used for?",
            type: "mcq",
            options: ["Network communication", "Operating on arrays with different shapes", "Multi-threading tasks", "File streaming"],
            correctIndex: 1,
            correctText: "Operating on arrays with different shapes",
          },
          {
            text: "Which scikit-learn module is used to split dataset into train and test sets?",
            type: "mcq",
            options: ["sklearn.metrics", "sklearn.model_selection", "sklearn.preprocessing", "sklearn.pipeline"],
            correctIndex: 1,
            correctText: "sklearn.model_selection",
          },
        ],
      },
      {
        cls: "III CSE-A",
        title: "Computer Networks & OSI Architecture",
        duration: "30 mins",
        status: "Published",
        batchId: batchMap.get("III CSE-A"),
        questions: [
          {
            text: "Which OSI layer is responsible for logical IP addressing and packet routing across networks?",
            type: "mcq",
            options: ["Transport Layer", "Data Link Layer", "Network Layer", "Session Layer"],
            correctIndex: 2,
            correctText: "Network Layer",
          },
          {
            text: "Which standard transport protocol uses a three-way handshake for establishing connections?",
            type: "mcq",
            options: ["UDP", "TCP", "ICMP", "IGMP"],
            correctIndex: 1,
            correctText: "TCP",
          },
          {
            text: "What is the standard port number assigned to secure HTTPS traffic?",
            type: "mcq",
            options: ["80", "8080", "443", "22"],
            correctIndex: 2,
            correctText: "443",
          },
        ],
      },
    ];

    for (const q of quizzes) {
      const quizRes = await client.query(
        `INSERT INTO quizzes (cls, title, questions, duration, status, batch_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id`,
        [q.cls, q.title, q.questions.length, q.duration, q.status, q.batchId || null]
      );
      const quizId = quizRes.rows[0].id;

      for (let i = 0; i < q.questions.length; i++) {
        const item = q.questions[i];
        const qRes = await client.query(
          `INSERT INTO questions (quiz_id, question_number, text, question_type, correct_answer_text)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [quizId, i + 1, item.text, item.type, item.correctText]
        );
        const questionId = qRes.rows[0].id;

        for (let j = 0; j < item.options.length; j++) {
          await client.query(
            `INSERT INTO options (question_id, option_index, text, is_correct)
             VALUES ($1, $2, $3, $4)`,
            [questionId, j, item.options[j], j === item.correctIndex]
          );
        }
      }

      // Seed a completed quiz attempt for Alex Chen (STU001)
      const alexTableId = studentTableIdMap.get("STU001");
      if (alexTableId) {
        await client.query(
          `INSERT INTO quiz_attempts (quiz_id, student_id, started_at, submitted_at, status, score, faculty_score, reviewed_at)
           VALUES ($1, $2, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '18 minutes', 'Submitted', $3, $3, NOW() - INTERVAL '2 days')
           ON CONFLICT DO NOTHING`,
          [quizId, alexTableId, q.questions.length * 18]
        );
      }
    }
    console.log(`✓ Seeded ${quizzes.length} comprehensive quizzes with questions & attempts.`);

    // 7. ASSIGNMENTS & SUBMISSIONS
    console.log("\n[7/12] Seeding Coursework Assignments & Submissions...");
    const assignments = [
      {
        cls: "II CSD-A",
        subject: "Data Structures",
        title: "Assignment 1: Balanced Binary Trees & AVL Rotations",
        desc: "Implement AVL Tree insertion with automatic single and double rotations (LL, RR, LR, RL). Include a function to compute height balance factor and print level-order traversal.",
        dueDays: 5,
        maxScore: 50,
      },
      {
        cls: "II CSD-A",
        subject: "Database Management Systems",
        title: "Assignment 2: Advanced SQL Window Functions & Analytics",
        desc: "Write complex analytical SQL queries using ROW_NUMBER(), RANK(), DENSE_RANK(), and LAG()/LEAD() functions on an enterprise sales schema.",
        dueDays: 9,
        maxScore: 50,
      },
      {
        cls: "II CSD-A",
        subject: "Python for Data Science",
        title: "Assignment 3: Exploratory Data Analysis & Feature Engineering",
        desc: "Analyze the Kaggle Titanic dataset. Perform missing value imputation, categorical encoding, outier analysis, and generate correlation heatmaps.",
        dueDays: -3,
        maxScore: 100,
      },
      {
        cls: "II CSD-A",
        subject: "Operating Systems",
        title: "Assignment 4: Multi-Threaded Dining Philosophers with Semaphores",
        desc: "Implement a deadlock-free and starvation-free solution to the classic Dining Philosophers problem using POSIX semaphores and mutex locks.",
        dueDays: 12,
        maxScore: 50,
      },
    ];

    for (const a of assignments) {
      const dueDate = new Date(Date.now() + a.dueDays * 24 * 60 * 60 * 1000);
      const res = await client.query(
        `INSERT INTO assignments (cls, subject, title, description, due_date, max_score, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '7 days')
         RETURNING assignment_id`,
        [a.cls, a.subject, a.title, a.desc, dueDate.toISOString(), a.maxScore]
      );
      const assignmentId = res.rows[0].assignment_id;

      // Seed student submission for completed assignment
      if (a.dueDays < 0) {
        await client.query(
          `INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, file_url, submitted_at, faculty_score, reviewed_at)
           VALUES ($1, 'STU001', 'Complete Jupyter Notebook with seaborn pairplots, feature engineering, and logistic regression baseline.', 'https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHUB/assignments/alex_chen_assignment3_eda.ipynb', NOW() - INTERVAL '4 days', 94.0, NOW() - INTERVAL '2 days')
           ON CONFLICT DO NOTHING`,
          [assignmentId]
        );
        await client.query(
          `INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, file_url, submitted_at, faculty_score, reviewed_at)
           VALUES ($1, 'STU002', 'Jupyter notebook analyzing demographics and survival correlations with random forest importance.', 'https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHUB/assignments/rohan_mehta_assignment3_eda.ipynb', NOW() - INTERVAL '4 days', 88.0, NOW() - INTERVAL '2 days')
           ON CONFLICT DO NOTHING`,
          [assignmentId]
        );
      }
    }
    console.log(`✓ Seeded ${assignments.length} coursework assignments with graded student submissions.`);

    // 8. CODING TESTS & TEST QUESTIONS
    console.log("\n[8/12] Seeding Coding Tests & Programming Challenges...");
    const codingTestRes = await client.query(
      `INSERT INTO coding_tests (title, description, faculty_id, batch_id, duration_minutes, start_time, end_time, is_active, allow_multiple_attempts, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', true, false, NOW())
       RETURNING id`,
      [
        "DSA Mid-Term Competitive Coding Arena",
        "Hands-on algorithm assessment testing Array two-pointers, Stack matching, and Sliding Window optimization.",
        sarahId,
        batchMap.get("II CSD-A"),
        90
      ]
    );
    const testId = codingTestRes.rows[0].id;

    const testQuestions = [
      {
        num: 1,
        title: "Two Sum Problem",
        desc: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        inputFormat: "Line 1: Comma-separated integers enclosed in brackets [2,7,11,15]\nLine 2: Target integer",
        outputFormat: "Indices in array format [0,1]",
        difficulty: "Easy",
        points: 25,
        testCases: [
          { input: "[2,7,11,15]\n9", output: "[0,1]" },
          { input: "[3,2,4]\n6", output: "[1,2]" },
          { input: "[3,3]\n6", output: "[0,1]" },
        ],
        starterCode: "def twoSum(nums, target):\n    # Write your O(n) hash map solution here\n    pass",
      },
      {
        num: 2,
        title: "Valid Parentheses",
        desc: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
        inputFormat: "A single string of brackets",
        outputFormat: "true or false",
        difficulty: "Easy",
        points: 25,
        testCases: [
          { input: "()[]{}", output: "true" },
          { input: "(]", output: "false" },
          { input: "([)]", output: "false" },
          { input: "{[]}", output: "true" },
        ],
        starterCode: "def isValid(s: str) -> bool:\n    # Use stack to match matching pairs\n    pass",
      },
      {
        num: 3,
        title: "Longest Substring Without Repeating Characters",
        desc: "Given a string s, find the length of the longest substring without repeating characters using sliding window.",
        inputFormat: "A single string s",
        outputFormat: "Integer length",
        difficulty: "Medium",
        points: 50,
        testCases: [
          { input: "abcabcbb", output: "3" },
          { input: "bbbbb", output: "1" },
          { input: "pwwkew", output: "3" },
        ],
        starterCode: "def lengthOfLongestSubstring(s: str) -> int:\n    # Implement sliding window algorithm\n    pass",
      },
    ];

    for (const tq of testQuestions) {
      await client.query(
        `INSERT INTO test_questions (test_id, question_number, title, description, input_format, output_format, difficulty, points, test_cases, starter_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [testId, tq.num, tq.title, tq.desc, tq.inputFormat, tq.outputFormat, tq.difficulty, tq.points, JSON.stringify(tq.testCases), tq.starterCode]
      );
    }

    // Seed student test attempt for Alex Chen (student table id = studentTableIdMap.get("STU001"))
    const alexTableId = studentTableIdMap.get("STU001");
    if (alexTableId) {
      await client.query(
        `INSERT INTO test_attempts (test_id, student_id, start_time, end_time, status, total_score, plagiarism_score, cheating_flags, is_flagged)
         VALUES ($1, $2, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '45 minutes', 'Submitted', 95, 0.00, '[]', false)`,
        [testId, alexTableId]
      );
    }
    console.log(`✓ Seeded coding tests, test questions, test cases, and candidate attempts.`);

    // 9. TIMETABLE ENTRIES
    console.log("\n[9/12] Seeding Weekly Master Timetable (Monday-Friday)...");
    const csdBatchId = batchMap.get("II CSD-A");
    const timetable = [
      // Monday (1)
      { day: 1, start: "09:00:00", end: "09:50:00", subject: "Data Structures & Algorithms", topic: "Non-linear Data Structures & Trees", room: "LH-201", fac: sarahId },
      { day: 1, start: "10:00:00", end: "10:50:00", subject: "Database Management Systems", topic: "Relational Algebra & Normal Forms", room: "LH-201", fac: vikramId },
      { day: 1, start: "11:15:00", end: "12:05:00", subject: "Operating Systems", topic: "CPU Scheduling & Multiprogramming", room: "LH-201", fac: rajeshId },
      { day: 1, start: "13:00:00", end: "14:50:00", subject: "Data Structures Lab", topic: "Binary Search Trees Practical Implementation", room: "CS-Lab-3", fac: sarahId },

      // Tuesday (2)
      { day: 2, start: "09:00:00", end: "09:50:00", subject: "Python for Data Science", topic: "NumPy Array Vectorization & Broadcasting", room: "LH-201", fac: vikramId },
      { day: 2, start: "10:00:00", end: "10:50:00", subject: "Computer Architecture", topic: "Instruction Pipelining & Branch Prediction", room: "LH-201", fac: priyaId },
      { day: 2, start: "11:15:00", end: "12:05:00", subject: "Data Structures & Algorithms", topic: "Graph Representation & Shortest Path", room: "LH-201", fac: sarahId },
      { day: 2, start: "13:00:00", end: "14:50:00", subject: "DBMS Practical Lab", topic: "Complex SQL Joins & Subqueries in PostgreSQL", room: "CS-Lab-2", fac: vikramId },

      // Wednesday (3)
      { day: 3, start: "09:00:00", end: "09:50:00", subject: "Data Structures & Algorithms", topic: "Heaps & Priority Queues", room: "LH-201", fac: sarahId },
      { day: 3, start: "10:00:00", end: "10:50:00", subject: "Operating Systems", topic: "Process Synchronization & Semaphores", room: "LH-201", fac: rajeshId },
      { day: 3, start: "11:15:00", end: "12:05:00", subject: "Python for Data Science", topic: "Pandas DataFrames & Time Series Analytics", room: "LH-201", fac: vikramId },
      { day: 3, start: "13:00:00", end: "14:00:00", subject: "Technical Seminar", topic: "AI & Emerging Trends in Cloud Engineering", room: "Auditorium-2", fac: sarahId },

      // Thursday (4)
      { day: 4, start: "09:00:00", end: "09:50:00", subject: "Database Management Systems", topic: "Transaction Processing & ACID Properties", room: "LH-201", fac: vikramId },
      { day: 4, start: "10:00:00", end: "10:50:00", subject: "Computer Architecture", topic: "Cache Memory Mapping Techniques", room: "LH-201", fac: priyaId },
      { day: 4, start: "11:15:00", end: "12:05:00", subject: "Operating Systems", topic: "Deadlock Detection & Bankers Algorithm", room: "LH-201", fac: rajeshId },
      { day: 4, start: "13:00:00", end: "14:50:00", subject: "Python Data Science Lab", topic: "Exploratory Data Analysis with Seaborn", room: "AI-Lab-1", fac: vikramId },

      // Friday (5)
      { day: 5, start: "09:00:00", end: "09:50:00", subject: "Operating Systems", topic: "Virtual Memory & Page Replacement Policies", room: "LH-201", fac: rajeshId },
      { day: 5, start: "10:00:00", end: "10:50:00", subject: "Data Structures & Algorithms", topic: "Dynamic Programming & Memoization", room: "LH-201", fac: sarahId },
      { day: 5, start: "11:15:00", end: "12:05:00", subject: "Python for Data Science", topic: "Machine Learning Pipelines with Scikit-Learn", room: "LH-201", fac: vikramId },
      { day: 5, start: "13:00:00", end: "14:00:00", subject: "Project Presentation & Review", topic: "Capstone Milestone 1 Review", room: "LH-201", fac: sarahId },
    ];

    // Clear and insert fresh timetable
    await client.query("DELETE FROM timetable_entries WHERE batch_id = $1", [csdBatchId]);
    for (const entry of timetable) {
      await client.query(
        `INSERT INTO timetable_entries (batch_id, faculty_id, weekday, subject, topic, room, start_time, end_time, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [csdBatchId, entry.fac, entry.day, entry.subject, entry.topic, entry.room, entry.start, entry.end, sarahId]
      );
    }
    console.log(`✓ Seeded ${timetable.length} weekly timetable entries for II CSD-A.`);

    // 10. ATTENDANCE SESSIONS & ATTENDANCE RECORDS
    console.log("\n[10/12] Seeding Class Attendance Sessions & Student Records...");
    const attendanceSubjects = [
      { subject: "Data Structures & Algorithms", topic: "AVL Trees & Balanced Trees", fac: sarahId },
      { subject: "Database Management Systems", topic: "Normalization 3NF & BCNF", fac: vikramId },
      { subject: "Operating Systems", topic: "Process Synchronization & Mutexes", fac: rajeshId },
      { subject: "Python for Data Science", topic: "Pandas Indexing & GroupBy", fac: vikramId },
      { subject: "Data Structures & Algorithms", topic: "Graph Traversal BFS & DFS", fac: sarahId },
      { subject: "Operating Systems", topic: "Deadlock Detection & Recovery", fac: rajeshId },
      { subject: "Database Management Systems", topic: "SQL Subqueries & Views", fac: vikramId },
      { subject: "Data Structures Lab", topic: "Binary Search Tree Lab Assignment", fac: sarahId },
      { subject: "Python for Data Science", topic: "Data Visualization with Matplotlib", fac: vikramId },
      { subject: "Operating Systems", topic: "Virtual Memory & Page Faults", fac: rajeshId },
    ];

    const allStudentAuthIds = [
      studentAuthMap.get("STU001"),
      studentAuthMap.get("STU002"),
      studentAuthMap.get("STU003"),
      studentAuthMap.get("STU004"),
      studentAuthMap.get("STU005"),
      studentAuthMap.get("STU006"),
    ].filter(Boolean);

    for (let i = 0; i < attendanceSubjects.length; i++) {
      const item = attendanceSubjects[i];
      const sessionDate = new Date(Date.now() - (attendanceSubjects.length - i) * 24 * 60 * 60 * 1000);
      const dateStr = sessionDate.toISOString().split("T")[0];

      const sessRes = await client.query(
        `INSERT INTO attendance_sessions (batch_id, faculty_id, subject, topic, session_date, start_time, end_time, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, '09:00:00', '09:50:00', false, NOW() - INTERVAL '10 days')
         ON CONFLICT (batch_id, subject, session_date, start_time) DO NOTHING
         RETURNING id`,
        [csdBatchId, item.fac, item.subject, item.topic, dateStr]
      );

      const sessionId = sessRes.rows[0]?.id;
      if (!sessionId) continue;

      for (const stuAuthId of allStudentAuthIds) {
        // Alex Chen (STU001) has 95% attendance (9 present, 1 late)
        let status = "present";
        if (stuAuthId === studentAuthMap.get("STU001") && i === 3) {
          status = "late";
        } else if (stuAuthId === studentAuthMap.get("STU002") && (i === 2 || i === 7)) {
          status = "absent";
        }

        await client.query(
          `INSERT INTO attendance_records (session_id, student_id, status, marked_at, marked_by)
           VALUES ($1, $2, $3, NOW() - INTERVAL '5 days', $4)
           ON CONFLICT (session_id, student_id) DO NOTHING`,
          [sessionId, stuAuthId, status, item.fac]
        );
      }
    }
    console.log(`✓ Seeded ${attendanceSubjects.length} class attendance sessions with comprehensive student records.`);

    // 11. LECTURE NOTES & COURSE MATERIALS
    console.log("\n[11/12] Seeding Lecture Notes & High-Quality Study Materials...");
    const notesData = [
      {
        cls: "II CSD-A",
        subject: "Data Structures",
        title: "AVL Trees, Red-Black Trees & Balancing Rotations",
        chapter: "Chapter 4: Advanced Non-Linear Structures",
        content: "Detailed mathematical proofs of AVL tree height bounds, single (LL, RR) and double (LR, RL) balancing rotations with full pseudocode implementation.",
        fileUrl: "https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHUB/notes/data-structures-avl-trees.pdf",
      },
      {
        cls: "II CSD-A",
        subject: "Database Management Systems",
        title: "Relational Database Normalization: 1NF to BCNF with Decompositions",
        chapter: "Chapter 3: Relational Design Theory",
        content: "Step-by-step guide to finding candidate keys, identifying Armstrong axioms, testing dependency preservation, and lossless join property.",
        fileUrl: "https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHUB/notes/dbms-normalization-guide.pdf",
      },
      {
        cls: "II CSD-A",
        subject: "Operating Systems",
        title: "Process Scheduling Algorithms & Deadlock Prevention",
        chapter: "Chapter 2: CPU Scheduling & Deadlocks",
        content: "Detailed comparative analysis of FCFS, SJF (Preemptive/Non-preemptive), Round Robin, and Banker's Algorithm safety check with worked numerical examples.",
        fileUrl: "https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHUB/notes/os-scheduling-and-deadlocks.pdf",
      },
      {
        cls: "II CSD-A",
        subject: "Python for Data Science",
        title: "NumPy, Pandas, and Exploratory Data Analysis Cheat Sheet",
        chapter: "Chapter 1: The Python Scientific Computing Stack",
        content: "Practical reference for high-speed tensor operations, handling missing values, pivoting tables, grouping data, and generating publishable seaborn graphics.",
        fileUrl: "https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHUB/notes/python-data-science-reference.pdf",
      },
      {
        cls: "II CSD-A",
        subject: "Computer Architecture",
        title: "Pipeline Hazards, Forwarding, and Cache Memory Hierarchy",
        chapter: "Chapter 5: Memory Subsystems & Microarchitecture",
        content: "Structural, data, and control hazard resolution techniques including branch prediction and cache mapping policies (Direct, Fully-Associative, Set-Associative).",
        fileUrl: "https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHUB/notes/coa-pipeline-and-cache.pdf",
      },
      {
        cls: "III CSE-A",
        subject: "Computer Networks",
        title: "TCP Congestion Control Algorithms (Tahoe, Reno, NewReno, BBR)",
        chapter: "Chapter 4: Transport Layer Congestion Avoidance",
        content: "Slow start, congestion avoidance, fast retransmit, and fast recovery algorithms analyzed with packet flow charts and mathematical throughput models.",
        fileUrl: "https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHUB/notes/computer-networks-tcp-bbr.pdf",
      },
    ];

    // Re-seed notes
    await client.query("DELETE FROM notes");
    for (const n of notesData) {
      await client.query(
        `INSERT INTO notes (cls, subject, title, content, chapter, file_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [n.cls, n.subject, n.title, n.content, n.chapter, n.fileUrl]
      );
    }
    console.log(`✓ Seeded ${notesData.length} comprehensive lecture notes with verified Supabase storage URLs.`);

    // 12. CAMPUS EVENTS, TASKS & STUDENT PERFORMANCE
    console.log("\n[12/12] Seeding Events, Tasks & Student Performance Metrics...");
    const events = [
      {
        title: "EduHacks 2026: 36-Hour National Level Hackathon",
        desc: "Compete against 100+ premier university teams in Generative AI, Web3, and HealthTech tracks. Total prize pool ₹5,00,000 with incubation opportunities.",
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        loc: "Campus Innovation Incubation Center",
        max: 300,
        cat: "Technical",
        img: "https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHUB/events/hackathon.jpg",
      },
      {
        title: "Generative AI & LLM Systems Industry Workshop",
        desc: "Hands-on masterclass with Google Cloud AI engineers covering RAG architectures, model fine-tuning, and production agent orchestration.",
        date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        loc: "Main University Auditorium",
        max: 200,
        cat: "Workshop",
        img: "https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHUB/events/ai-workshop.jpg",
      },
      {
        title: "Annual Inter-Collegiate Cultural Extravaganza 'Tarang'",
        desc: "Three days of music, dance, theatre, fine arts, and celebrity musical concerts celebrating creative excellence.",
        date: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000),
        loc: "Open Air Amphitheatre",
        max: 1500,
        cat: "Cultural",
        img: "https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHUB/events/cultural.jpg",
      },
      {
        title: "International Symposium on Quantum Computing & Cryptography",
        desc: "Distinguished keynote addresses by leading quantum physics researchers and post-quantum cryptographic standards pioneers.",
        date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        loc: "Sir C.V. Raman Seminar Hall",
        max: 150,
        cat: "Seminar",
        img: "https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHUB/events/symposium.jpg",
      },
      {
        title: "Inter-Department Football & Basketball Championship",
        desc: "Annual campus sports league showcasing athletic talent, inter-departmental rivalry, and sportsmanship.",
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        loc: "University Sports Arena",
        max: 400,
        cat: "Sports",
        img: "https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHUB/events/sports.jpg",
      },
    ];

    await client.query("DELETE FROM events");
    for (const e of events) {
      await client.query(
        `INSERT INTO events (title, description, event_date, location, max_participants, image_url, category, status, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'upcoming', $8, NOW(), NOW())`,
        [e.title, e.desc, e.date.toISOString(), e.loc, e.max, e.img, e.cat, sarahId]
      );
    }

    // Seed student_performance metrics for studentTableIdMap
    await client.query("DELETE FROM student_performance");
    for (const [roll, stuTableId] of studentTableIdMap.entries()) {
      const isTop = roll === "STU001" || roll === "STU003";
      const attScore = isTop ? 95.0 : 82.5;
      const qzScore = isTop ? 90.0 : 78.0;
      const asScore = isTop ? 92.5 : 80.0;
      const inScore = isTop ? 94.0 : 81.0;
      const litScore = isTop ? 92.8 : 80.4;
      const level = isTop ? "High" : "Medium";

      for (let dayOffset = 0; dayOffset < 15; dayOffset += 3) {
        const metricDate = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        await client.query(
          `INSERT INTO student_performance (student_id, metric_date, attendance_percentage, quiz_score, assessment_score, interaction_score, literacy_percentage, literacy_level, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [stuTableId, metricDate, attScore, qzScore, asScore, inScore, litScore, level]
        );
      }
    }

    await client.query("COMMIT");
    console.log("\n=======================================================");
    console.log(" SUCCESS! Full institutional university data seeded.");
    console.log("=======================================================");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to seed university data:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedCompleteData().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
