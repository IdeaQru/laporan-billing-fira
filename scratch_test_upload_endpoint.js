import { readFileSync } from 'fs';

async function testUpload() {
  // Login
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Fira', password: 'admin' }),
  });
  const { token } = await loginRes.json();
  console.log('Login OK, token:', token.slice(0, 15) + '...');

  // Read file bytes
  const bytes = readFileSync('data/raw/data laporan fixxx.xls');
  console.log(`Read ${bytes.length} bytes from file. Uploading...`);

  // Upload
  const uploadRes = await fetch('http://localhost:3001/api/upload-excel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Authorization': `Bearer ${token}`,
    },
    body: bytes,
  });

  const json = await uploadRes.json();
  console.log('Upload Response:', json);
}

testUpload().catch(console.error);
