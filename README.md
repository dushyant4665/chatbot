# AI Chat Platform

A full-stack chatbot application with real-time streaming AI responses. Built with React, Node.js, and PostgreSQL.

## Tech Stack

**Frontend**
- React 18 with Vite
- React Router for navigation
- Tailwind CSS for styling
- Axios for HTTP requests
- Headless UI components
- Heroicons for icons
- PDF.js and Mammoth for document parsing

**Backend**
- Node.js with Express
- Prisma ORM with PostgreSQL adapter
- PostgreSQL database
- JWT authentication
- bcrypt for password hashing
- Zod for validation
- CORS enabled

**AI Integration**
- Groq SDK
- Server-Sent Events (SSE) for streaming
- Real-time response rendering with 20ms typing delay

## Architecture

```mermaid
graph TB
    User[User Browser] --> Frontend[React Frontend]
    Frontend --> API[Express API]
    API --> Auth{JWT Auth}
    Auth -->|Valid| Controllers[Controllers]
    Auth -->|Invalid| Reject[401 Unauthorized]
    Controllers --> DB[(PostgreSQL)]
    Controllers --> AI[Groq/OpenAI API]
    AI --> Stream[SSE Stream]
    Stream --> Frontend
```

**Flow:**
1. User authenticates and receives JWT token
2. Token is stored in localStorage and sent with every request via axios interceptor
3. Backend verifies token using protect middleware
4. Chat messages trigger AI API calls
5. AI responses stream back via SSE
6. Frontend renders chunks with 20ms delay for typing effect

## Features

- User authentication with JWT (7-day expiry)
- Create multiple projects with custom system prompts
- Real-time chat with streaming AI responses
- Markdown rendering for formatted responses
- Separate chat history per project
- Auto-generated project prompts
- Mobile responsive dark theme
- Clean, maintainable codebase

## Installation

### Prerequisites
- Node.js v18 or higher
- PostgreSQL database
- Groq API key or OpenAI compatible API key

### Clone and Install

```bash
git clone https://github.com/dushyant4665/chatbot.git
cd chatbot

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Environment Setup

### Backend Environment Variables

Create `backend/.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
PORT=5000
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="7d"
GROQ_API_KEY="your-groq-api-key"
COMET_API_KEY="your-openai-compatible-key"
FRONTEND_URL="http://localhost:5173"
NODE_ENV=development
```

**Note:** System automatically detects API provider based on key format:
- If key starts with `gsk_` → Uses Groq API
- Otherwise → Uses CometAPI (or any OpenAI compatible endpoint)

### Frontend Environment Variables

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

## Database Setup

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

## Running the Application

### Start Backend

```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:5000`

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`

## Usage

### 1. Register an Account
- Navigate to register page
- Enter name, email, and password
- Click create account

### 2. Create a Project
- Click "New Project" in sidebar
- Enter project title
- Add description (becomes the AI system prompt)
- System automatically creates a prompt for the project
- Example: "You are a Python expert. Help with code and debugging."

### 3. Start Chatting
- Click on a project to open chat
- Type your message in the input box
- AI responds in real-time with streaming
- Last 15 messages are used as conversation context
- Messages are saved automatically to database

### 4. System Prompts
- **Every chat gets a default system message** with markdown formatting instructions
- **If chat belongs to a project**, the most recent project prompt replaces the default
- This allows custom AI behavior per project

### 5. Manage Chats
- View all chats in sidebar
- Click any chat to continue conversation
- Delete chats you don't need
- Chat titles auto-update from first message

## API Endpoints

### Authentication

**Register**
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response: { "token": "jwt-token", "user": {...} }
```

**Get Current User**
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Projects

**Get All Projects**
```http
GET /api/projects
Authorization: Bearer <token>
```

**Create Project**
```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Python Helper",
  "description": "Expert Python assistant"
}
```

**Delete Project**
```http
DELETE /api/projects/:projectId
Authorization: Bearer <token>
```

### Chats

**Get All Chats**
```http
GET /api/chat
Authorization: Bearer <token>
```

**Create Chat**
```http
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "optional-project-id",
  "title": "New Chat"
}
```

**Get Chat Messages**
```http
GET /api/chat/:chatId/messages
Authorization: Bearer <token>
```

**Send Message (Streaming)**
```http
POST /api/chat/stream
Authorization: Bearer <token>
Content-Type: application/json

{
  "chatId": "chat-id",
  "message": "Your question here"
}
```

**SSE Response Format:**
```
event: start
data: {"message": {...}}

event: chunk
data: {"text": "response chunk"}

event: done
data: {"message": {...}}

event: error
data: {"message": "error description"}
```

**Delete Chat**
```http
DELETE /api/chat/:chatId
Authorization: Bearer <token>
```

## Project Structure

```
chatbot/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   └── migrations/             # Migration history
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js         # Prisma client with PrismaPg adapter
│   │   ├── controllers/
│   │   │   ├── authController.js   # Register, login, me
│   │   │   ├── projectController.js # CRUD projects
│   │   │   └── chatController.js   # Chat + streaming logic
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT verification (protect)
│   │   │   ├── validate.js         # Zod validation middleware
│   │   │   └── errorHandler.js     # Global error handler
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── projectRoutes.js
│   │   │   └── chatRoutes.js
│   │   ├── validator/
│   │   │   ├── authValidators.js   # Zod schemas for auth
│   │   │   └── projectValidators.js # Zod schemas for projects
│   │   ├── app.js                  # Express app setup
│   │   └── server.js               # HTTP server
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx         # Chat list + projects
│   │   │   ├── MarkdownMessage.jsx # Custom markdown renderer
│   │   │   ├── ProjectModal.jsx    # Create project form
│   │   │   └── Modal.jsx           # Reusable modal wrapper
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Login page
│   │   │   ├── Register.jsx        # Register page
│   │   │   └── Chat.jsx            # Main chat interface
│   │   ├── lib/
│   │   │   ├── api.js              # Axios instance with interceptor
│   │   │   ├── session.js          # localStorage token management
│   │   │   └── error.js            # Error handling utilities
│   │   ├── App.jsx                 # Router with PrivateRoute/PublicRoute
│   │   ├── main.jsx                # React entry point
│   │   └── index.css               # Custom CSS + Tailwind base
│   ├── tailwind.config.js          # Tailwind config with custom colors
│   └── package.json
│
└── README.md
```

## Database Schema

```
User (1) ──< (N) Projects
User (1) ──< (N) Chats
Project (1) ──< (N) Prompts
Project (1) ──< (N) Chats
Chat (1) ──< (N) ChatMessages
```

**Relationships:**
- Each user owns multiple projects and chats
- Each project can have multiple prompts (versioned system prompts)
- Each chat contains multiple messages
- Chats can optionally belong to a project (for custom AI behavior)
- All relationships have cascading deletes

**Full schema:** `backend/prisma/schema.prisma`

## Security Features

- **Password Hashing:** bcrypt with salt rounds
- **JWT Authentication:** 7-day token expiry
- **Protected Routes:** Middleware verifies token on every request
- **Ownership Checks:** Users can only access their own data
- **Input Validation:** Zod schemas validate all user inputs
- **CORS:** Restricted to frontend URL only
- **Error Handling:** Global handler prevents info leakage

## Deployment

### Backend on Render

1. Create new Web Service
2. Connect GitHub repository
3. Build settings:
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npm start`
4. Add environment variables (see .env.example)
5. Deploy

**Important:** Make sure to use `@prisma/adapter-pg` for PostgreSQL connections on Render.

### Frontend on Vercel

1. Import project from GitHub
2. Framework preset: **Vite**
3. Build settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Root Directory:** `frontend`
4. Add environment variable: `VITE_API_URL`
5. Deploy

## Common Issues

**Database connection fails**
- Check if PostgreSQL is running
- Verify DATABASE_URL format is correct
- Ensure database exists

**JWT token errors**
- Verify JWT_SECRET is set in backend .env
- Token expires after 7 days (check JWT_EXPIRES_IN)
- Clear localStorage and login again

**AI not responding**
- Verify API key is correct (GROQ_API_KEY or COMET_API_KEY)
- Check API key has sufficient credits
- Look at backend console for error logs

**CORS errors**
- Make sure FRONTEND_URL in backend .env matches your frontend URL
- Check if backend is running

## Health Check

Backend provides a health endpoint:

```http
GET /health

Response: {
  "status": "ok",
  "message": "server is running",
  "timestamp": "2026-07-25T..."
}
```
