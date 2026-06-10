const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const cookieParser = require('cookie-parser');
const connectDB    = require('./config/db');
const helmet       = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit    = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Enable trust proxy for rate limiter and HTTPS detection behind reverse proxies
app.set('trust proxy', 1);

// ── Connect Database ───────────────────────────────────────────────
connectDB();

// ── Security Headers & Middlewares ─────────────────────────────────

// HTTPS Redirection in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// Helmet with customized Content Security Policy (CSP) for external CDNs (Leaflet, Nominatim, Google Fonts, Cloudinary)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'", 
          "unpkg.com", 
          "'unsafe-inline'", 
          "'unsafe-eval'"
        ],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "unpkg.com", 
          "fonts.googleapis.com"
        ],
        imgSrc: [
          "'self'", 
          "data:", 
          "unpkg.com", 
          "*.tile.openstreetmap.org", 
          "res.cloudinary.com"
        ],
        connectSrc: [
          "'self'", 
          "nominatim.openstreetmap.org", 
          "res.cloudinary.com"
        ],
        fontSrc: [
          "'self'", 
          "fonts.gstatic.com"
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

// NoSQL Query Injection Prevention
app.use(mongoSanitize());

// Rate Limiter for API calls
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api/', apiLimiter);

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
app.use('/api/qr',      require('./routes/qr'));

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
