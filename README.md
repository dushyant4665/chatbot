# Chatbot Platform

A full-stack AI chatbot platform where users can create projects, manage conversations, and chat with an AI in real-time.

**Live Demo:** [chatbot-roan-three-16.vercel.app](https://chatbot-roan-three-16.vercel.app)

---

## What it does

- Sign up and log in with JWT authentication
- Create multiple projects (like workspaces)
- Start chats inside each project
- Talk to the AI with real-time streaming responses
- Attach files (PDF, DOCX, TXT) as context for the AI

---

## Architecture

```mermaid
graph TD
    User([User]) -->|Opens app| Frontend

    subgraph Frontend [Frontend - React + Vite]
        UI[Pages & Components]
        Auth[JWT stored in localStorage]
    end

    Frontend -->|REST API calls| Backend

    subgraph Backend [Backend - Node.js + Express]
        Routes[Routes]
        Controllers[Controllers]
        Middleware[Auth Middleware - JWT verify]
    end

    Controllers -->|Prisma ORM| DB[(PostgreSQL - Render)]
    Controllers -->|Stream request| Groq[Groq AI API]
    Groq -.->|SSE chunks| Controllers
    Controllers -.->|Stream response| Frontend
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL + Prisma ORM |
| AI | Groq API (Llama 3) |
| Auth | JWT + bcrypt |
| Hosting | Vercel (frontend), Render (backend + DB) |

---

## Running Locally

### 1. Clone the repo

```bash
git clone https://github.com/dushyant4665/chatbot.git
cd chatbot
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000
DATABASE_URL="postgresql://user:pass@localhost:5432/botdb"
JWT_SECRET="your-secret-key"
GROQ_API_KEY="your-groq-api-key"
```

Run database migrations and start:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Database Schema

```
User
 └── Project (many)
      ├── Chat (many)
      │    └── ChatMessage (many)
      └── Prompt (many)
```

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/chat/project/:id/chats` | List chats |
| POST | `/api/chat/project/:id/chats` | Create chat |
| POST | `/api/chat/stream` | Stream AI response |
| DELETE | `/api/chat/:id` | Delete chat |
