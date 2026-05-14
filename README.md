# FoundIt — Campus Lost & Found Portal

A full-stack web app for college campuses to report lost items, post found items, match them together, block stolen devices by IMEI, and file FIR reports.

## Tech Stack

| Layer      | Technology                     |
|------------|-------------------------------|
| Backend    | Node.js + Express.js          |
| Database   | MongoDB + Mongoose            |
| Auth       | JWT (stored in httpOnly cookie)|
| Frontend   | Vanilla HTML, CSS, JavaScript |
| File Upload| Multer                        |

---

## Project Structure

```
campus-lost-found/
├── server.js              ← Entry point
├── .env.example           ← Copy to .env and fill in values
├── config/
│   └── db.js              ← MongoDB connection
├── models/
│   ├── User.js
│   ├── LostItem.js
│   ├── FoundItem.js
│   ├── Match.js
│   ├── FirReport.js
│   └── BlockedDevice.js
├── routes/
│   ├── auth.js            ← /api/auth/*
│   ├── lost.js            ← /api/lost/*
│   ├── found.js           ← /api/found/*
│   ├── matches.js         ← /api/matches/*
│   ├── fir.js             ← /api/fir/*
│   └── devices.js         ← /api/devices/*
├── middleware/
│   └── auth.js            ← JWT verification middleware
├── public/
│   ├── index.html         ← Homepage
│   ├── login.html
│   ├── register.html
│   ├── post-lost.html
│   ├── post-found.html
│   ├── dashboard.html
│   ├── devices.html
│   ├── fir.html
│   ├── css/style.css
│   └── js/
│       ├── api.js         ← fetch wrapper
│       ├── auth.js        ← auth state across pages
│       └── index.js       ← homepage logic
└── uploads/               ← uploaded images (auto-created)
```

---

## Setup Instructions

### 1. Prerequisites
- Node.js v18+
- MongoDB (local install OR free Atlas cluster at mongodb.com/atlas)

### 2. Clone and install
```bash
git clone <your-repo>
cd campus-lost-found
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env and set:
#   MONGO_URI — your MongoDB connection string
#   JWT_SECRET — any long random string
```

### 4. Run
```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

Visit → http://localhost:3000

---

## API Reference

### Auth
| Method | Route              | Auth | Description        |
|--------|--------------------|------|--------------------|
| POST   | /api/auth/register | —    | Register new user  |
| POST   | /api/auth/login    | —    | Login              |
| POST   | /api/auth/logout   | —    | Logout             |
| GET    | /api/auth/me       | ✅   | Get current user   |

### Lost Items
| Method | Route                   | Auth | Description           |
|--------|-------------------------|------|-----------------------|
| GET    | /api/lost               | —    | List (filter, search) |
| GET    | /api/lost/my            | ✅   | My posts              |
| GET    | /api/lost/:id           | —    | Single item           |
| POST   | /api/lost               | ✅   | Create                |
| PATCH  | /api/lost/:id/status    | ✅   | Update status         |
| DELETE | /api/lost/:id           | ✅   | Delete                |

### Found Items
Same routes as Lost under `/api/found`

### Matches
| Method | Route                        | Auth | Description              |
|--------|------------------------------|------|--------------------------|
| POST   | /api/matches                 | ✅   | Send match request       |
| GET    | /api/matches/lost/:lostId    | ✅   | Matches for a lost item  |
| GET    | /api/matches/my              | ✅   | My match requests        |
| PATCH  | /api/matches/:id             | ✅   | Confirm / reject         |

### FIR Reports
| Method | Route         | Auth | Description       |
|--------|---------------|------|-------------------|
| POST   | /api/fir      | ✅   | File a report     |
| GET    | /api/fir/my   | ✅   | My reports        |
| PATCH  | /api/fir/:id  | ✅   | Update FIR number |

### Devices (IMEI)
| Method | Route                      | Auth | Description       |
|--------|----------------------------|------|-------------------|
| POST   | /api/devices               | ✅   | Block device      |
| GET    | /api/devices               | —    | All blocked       |
| GET    | /api/devices/check/:imei   | —    | Check IMEI        |
| GET    | /api/devices/my            | ✅   | My blocked list   |
| PATCH  | /api/devices/:id/recover   | ✅   | Mark recovered    |

---

## MongoDB Schema (Mongoose Models)

```
User         — name, email, password(hashed), phone, rollNumber, department, year
LostItem     — postedBy(ref), title, category, locationLost, dateLost, imageUrl, status
FoundItem    — postedBy(ref), title, category, locationFound, dateFound, imageUrl, currentlyAt, status
Match        — lostItem(ref), foundItem(ref), requestedBy(ref), message, status
FirReport    — reportedBy(ref), lostItem(ref), description, policeStation, firNumber, status
BlockedDevice— reportedBy(ref), deviceType, brand, model, imeiNumber, serialNumber, status
```

---

## Features

- ✅ Register / Login with JWT auth
- ✅ Post lost items with photo upload
- ✅ Post found items with location
- ✅ Browse & search all items
- ✅ Send match requests (connect lost ↔ found)
- ✅ Owner confirms/rejects match
- ✅ Dashboard to manage all your posts
- ✅ Block phone/laptop by IMEI number
- ✅ Public IMEI checker (no login needed)
- ✅ File and track FIR reports
- ✅ Fully responsive UI

---

## Interview Talking Points

**Why MongoDB over SQL?**
Lost/found posts have flexible schemas (a gadget needs IMEI, a document needs ID number, a bag just needs colour). MongoDB's flexible documents handle this naturally without lots of nullable columns.

**Why JWT in httpOnly cookie?**
More secure than localStorage — JavaScript cannot access httpOnly cookies, protecting against XSS attacks.

**How does IMEI blocking work?**
We store the IMEI with a unique index in MongoDB. Anyone can hit `/api/devices/check/:imei` without logging in. When a match is found, we return the device status and reporter's info.

**How do matches work?**
A Match document references both a LostItem and a FoundItem. When confirmed by the lost item owner, both items' statuses update atomically using `Promise.all`.

**Scalability plan?**
- Add Redis for session caching
- Add socket.io for real-time match notifications  
- Add Elasticsearch for better full-text search
- Deploy on Railway/Render (MongoDB Atlas for DB)
- Add admin panel for campus security staff
