import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(process.cwd(), 'data.json');

app.use(express.json());

// Serve static frontend in production
app.use(express.static(path.join(process.cwd(), 'dist')));

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ sets: [], submissions: [] }, null, 2));
}

// GET /api/data
app.get('/api/data', (_req, res) => {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  res.json(JSON.parse(raw));
});

// PUT /api/data
app.put('/api/data', (req, res) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

// SPA fallback
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
