# 🦀 Mud Crab Farming Quiz Competition

A real-time, QR-based, multi-participant quiz competition platform built for mud crab aquaculture events, agricultural fairs, and university championships. Features a cyber-aquatic gaming HUD aesthetic, instantaneous WebSocket communication, server-validated answer locking, and automated tie-breaking.

---

## 🚀 Live Demo & Interfaces

- **🖥️ Main Display Screen (`/display`)**: Designed for 16:9 TV/Projectors. Large scannable QR code, real-time joined competitor roster, 3-2-1 countdown, live standings, and Olympic podium ceremony.
- **📱 Participant Mobile Screen (`/join`)**: Mobile game HUD for smartphones. Instant check-in, waiting room, sequential 20 MCQ questions, touch answer locking, and official results.
- **⚡ Admin Command Center (`/admin`)**: Organizer dashboard with live telemetry, participant kick controls, quiz start modal, real-time leaderboard, question bank editor, and session reset.

---

## 🌐 Deploy to Vercel (1-Click)

This repository is structured for zero-config deployment to **Vercel**:

1. Push this repository to your GitHub account:
   ```bash
   git push -u origin main
   ```
2. In the [Vercel Dashboard](https://vercel.com/new), click **Import** for the `mcq` repository.
3. Add your Environment Variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://wvufalstpgdxnhjpqajv.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `[YOUR_SUPABASE_ANON_KEY]`
   - `NEXT_PUBLIC_API_URL`: `[YOUR_BACKEND_URL_OR_EMPTY]`
4. Click **Deploy**!

---

## ⚡ Supabase Setup

1. Open your [Supabase Dashboard](https://app.supabase.com) and go to the **SQL Editor**.
2. Copy and paste the contents of `supabase_schema.sql` and click **Run**.
3. In **Project Settings → Database → Connection string (URI)**, copy your PostgreSQL connection string into `backend/.env`.

---

## 💻 Local Development

### 1. Frontend (Next.js 16 + React 19 + Tailwind CSS)
```bash
npm install
npm run dev -- -p 3001
```
Open [http://localhost:3001](http://localhost:3001) (Mobile HUD), [http://localhost:3001/display](http://localhost:3001/display) (TV Display), or [http://localhost:3001/admin](http://localhost:3001/admin) (Admin).

### 2. Backend (FastAPI + Python 3.12 + WebSockets)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🧪 Testing

Run the end-to-end automated competition test suite:
```bash
cd backend
./venv/bin/python test_flow.py
```
Validates registration, phone duplicate resolution, late-join lockout, security answer masking, live scoring, and tie-breaking algorithms.
