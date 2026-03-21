const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '..', 'test-create-quiz.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

(async () => {
  const res = await fetch('http://localhost:3000/api/quizzes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  console.log('status', res.status);
  const body = await res.text();
  console.log('body', body);
})();
