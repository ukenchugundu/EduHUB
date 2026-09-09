const http = require("http");
const https = require("https");

const BACKEND_URL = "https://eduhub-backend-pf6o.onrender.com";

function makeRequest(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function testAll() {
  console.log("1. Testing Render Backend Root /...");
  const rootRes = await makeRequest(`${BACKEND_URL}/`);
  console.log("Root status:", rootRes.status, "body:", rootRes.body);

  console.log("\n2. Testing Login for student@eduhub.local...");
  const loginRes = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }, {
    role: "student",
    email: "student@eduhub.local",
    password: "Student@123",
  });
  console.log("Login status:", loginRes.status, "User:", loginRes.body?.user);
  const token = loginRes.body?.token;

  if (!token) {
    console.error("Login failed!", loginRes.body);
    return;
  }

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "x-student-id": "STU001",
  };

  console.log("\n3. Testing /api/auth/me...");
  const meRes = await makeRequest(`${BACKEND_URL}/api/auth/me`, { headers: authHeaders });
  console.log("Me status:", meRes.status, "data:", meRes.body);

  console.log("\n4. Testing /api/quizzes...");
  const quizRes = await makeRequest(`${BACKEND_URL}/api/quizzes`, { headers: authHeaders });
  console.log("Quizzes status:", quizRes.status, "count:", Array.isArray(quizRes.body) ? quizRes.body.length : quizRes.body);

  console.log("\n5. Testing /api/assignments...");
  const assignRes = await makeRequest(`${BACKEND_URL}/api/assignments`, { headers: authHeaders });
  console.log("Assignments status:", assignRes.status, "count:", Array.isArray(assignRes.body) ? assignRes.body.length : assignRes.body);

  console.log("\n6. Testing /api/notes...");
  const notesRes = await makeRequest(`${BACKEND_URL}/api/notes`, { headers: authHeaders });
  console.log("Notes status:", notesRes.status, "count:", Array.isArray(notesRes.body) ? notesRes.body.length : notesRes.body);

  console.log("\n7. Testing /api/events...");
  const eventsRes = await makeRequest(`${BACKEND_URL}/api/events`, { headers: authHeaders });
  console.log("Events status:", eventsRes.status, "count:", Array.isArray(eventsRes.body) ? eventsRes.body.length : eventsRes.body);

  console.log("\n8. Testing /api/timetable/student/schedule...");
  const schedRes = await makeRequest(`${BACKEND_URL}/api/timetable/student/schedule`, { headers: authHeaders });
  console.log("Schedule status:", schedRes.status, "today count:", schedRes.body?.today?.length, "upcoming count:", schedRes.body?.upcoming?.length);
}

testAll().catch(console.error);
