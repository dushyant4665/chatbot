# AI Chat Platform

A full-stack chatbot application with real-time streaming responses. Built with React, Node.js, and PostgreSQL.

## Tech Stack

**Frontend**
- React 18 with Vite
- React Router for navigation
- Axios for HTTP requests
- Custom CSS (no frameworks)

**Backend**
- Node.js with Express
- Prisma ORM
- PostgreSQL database
- JWT authentication
- Zod for validation

**AI Integration**
- Groq API (or OpenAI compatible)
- Server-Sent Events for streaming
- Real-time response rendering

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

**How it works:**
1. User logs in and receives a JWT token
2. Token is sent with every API request
3. Backend validates token and processes request
4. Chat messages trigger AI API calls
5. AI responses stream back in real-time via SSE
6. Frontend renders markdown responses

## Features

- User authentication with JWT
- Create multiple projects/agents with custom system prompts
- Real-time chat with streaming responses
- Markdown rendering for formatted responses
- Separate chat history per project
- Mobile responsive interface
- Clean, maintainable codebase

## Installation

### Prerequisites
- Node.js v18 or higher
- PostgreSQL database
- Groq or OpenAI API key

### Clone and Install

```bash
git clone <repository-url>
cd bot

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
GROQ_API_KEY="your-groq-api-key"
NODE_ENV=development
```

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

# Create database tables
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
- Go to the register page
- Enter name, email, and password
- Click create account

### 2. Create a Project
- Click "New Project" in sidebar
- Give it a title
- Add a description (this becomes the AI system prompt)
- Example: "You are a Python expert. Help with code and debugging."

### 3. Start Chatting
- Click on a project to open it
- Type your message in the input box
- AI responds in real-time with streaming
- Messages are saved automatically

### 4. Manage Chats
- View all chats in the sidebar
- Click any chat to continue conversation
- Delete chats you don't need anymore

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

Response format (Server-Sent Events):
```
event: start
data: {"message": {...}}

event: chunk
data: {"text": "response"}

event: done
data: {"message": {...}}
```

**Delete Chat**
```http
DELETE /api/chat/:chatId
Authorization: Bearer <token>
```

## Project Structure

```
bot/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── projectController.js
│   │   │   └── chatController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── validate.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── projectRoutes.js
│   │   │   └── chatRoutes.js
│   │   ├── validator/
│   │   │   ├── authValidators.js
│   │   │   └── projectValidators.js
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── MarkdownMessage.jsx
│   │   │   ├── ProjectModal.jsx
│   │   │   └── Modal.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Chat.jsx
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   ├── session.js
│   │   │   └── error.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
│
└── README.md
```

## Database Schema

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  name         String
  passwordHash String
  projects     Project[]
  chats        Chat[]
  createdAt    DateTime  @default(now())
}

model Project {
  id          String   @id @default(uuid())
  title       String
  description String?
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  chats       Chat[]
  prompts     Prompt[]
  createdAt   DateTime @default(now())
}

model Chat {
  id        String        @id @default(uuid())
  title     String
  userId    String
  projectId String?
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  project   Project?      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  messages  ChatMessage[]
  createdAt DateTime      @default(now())
}

model ChatMessage {
  id        String   @id @default(uuid())
  role      String
  content   String   @db.Text
  chatId    String
  chat      Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

model Prompt {
  id        String   @id @default(uuid())
  title     String
  content   String   @db.Text
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}
```

## Deployment

### Backend on Render

1. Create new Web Service
2. Connect your GitHub repository
3. Configure build settings:
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npm start`
4. Add environment variables
5. Deploy

### Frontend on Vercel

1. Import project from GitHub
2. Framework preset: Vite
3. Build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables
5. Deploy

## Common Issues

**Database connection fails**
- Check if PostgreSQL is running
- Verify DATABASE_URL format
- Ensure database exists

**JWT token errors**
- Make sure JWT_SECRET is set
- Token expires after 7 days by default
- Login again to get new token

**AI not responding**
- Verify API key is correct
- Check API key has credits
- Look at backend logs for errors

**Build errors**
- Delete node_modules and package-lock.json
- Run npm install again
- Check Node.js version (needs v18+)

## Development Notes

This codebase prioritizes:
- Readable code over clever abstractions
- Simple patterns over complex architecture
- Clear naming over brevity
- Inline logic over scattered utilities

All code is written to be easily understood in interviews and by junior developers.

## License

MIT
