# SkillTrace

Upload a resume, run an AI-led mock interview (voice + video in browser), and get a detailed performance report.

## Stack

- **Frontend:** React + Vite + Tailwind CSS (`client/`)
- **Backend:** Node.js + Express + Socket.IO (`server/`)
- **Database:** MongoDB + Mongoose
- **AI:** Google Gemini (behind an abstract `aiService`)
- **Voice:** Browser Web Speech API (speech-to-text + text-to-speech)

## Project structure

```
ai-interviewer/
├── client/     # React SPA — own package.json, own terminal
├── server/     # Express API + sockets — own package.json, own terminal
├── .gitignore
└── README.md
```

`client/` and `server/` are fully independent: own dependencies, own scripts, own `.env`. Nothing runs from the root.

## Setup

Each app gets its own terminal:

```bash
# terminal 1 — frontend
cd client
npm install
npm run dev            # http://localhost:5173

# terminal 2 — backend
cd server
npm install
npm run dev            # http://localhost:5000
```

Env files:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env   # then fill in real values
```

Lint (run inside `client/` or `server/`):

```bash
npm run lint
```

## Environment variables

| App    | File          | Purpose                                                        |
| ------ | ------------- | -------------------------------------------------------------- |
| client | `client/.env` | `VITE_API_URL`, `VITE_SOCKET_URL`                              |
| server | `server/.env` | `PORT`, `MONGODB_URI`, `JWT_*`, `GEMINI_API_KEY`, `CLIENT_URL` |

Never commit `.env` files — only `.env.example` is tracked.

## Roadmap (build phases)

1. **Phase 0** — scaffolding, lint, env, folder structure ✅
2. **Phase 1** — Mongoose schemas: `User`, `Resume`, `Interview`, `Report`
3. **Phase 2** — auth (register/login/me, JWT, validation)
4. **Phase 3** — Socket.IO foundation (auth handshake, interview rooms)
5. **Phase 4** — resume upload + PDF/DOCX parsing
6. **Phase 5** — interview engine (Gemini questions, session state machine)
7. **Phase 6** — voice (Web Speech STT/TTS) + timer UI
8. **Phase 7** — async report generation + dashboard/charts
9. **Phase 8** — tests, hardening, deployment
