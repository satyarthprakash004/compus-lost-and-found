const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const cookieParser = require('cookie-parser');
const connectDB    = require('./config/db');
require('dotenv').config();

const app = express();

// ── Connect Database ───────────────────────────────────────────────
connectDB();

// ── Middleware ─────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded images statically
app.use('/uploads', express.static(uploadDir));

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ─────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/lost',    require('./routes/lost'));
app.use('/api/found',   require('./routes/found'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/fir',     require('./routes/fir'));
app.use('/api/devices', require('./routes/devices'));

// ── Stats endpoint (for homepage) ─────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const LostItem  = require('./models/LostItem');
    const FoundItem = require('./models/FoundItem');
    const Match     = require('./models/Match');
    const [lost, found, matched] = await Promise.all([
      LostItem.countDocuments(),
      FoundItem.countDocuments(),
      Match.countDocuments({ status: 'confirmed' }),
    ]);
    res.json({ success: true, lost, found, matched });
  } catch {
    res.json({ success: true, lost: 0, found: 0, matched: 0 });
  }
});

// ── Catch-all → serve index.html ──────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── Start ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀  FoundIt running → http://localhost:${PORT}`));
