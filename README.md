# AI Chatbot Platform

A complete, full-stack, and agentic AI chatbot platform similar to ChatGPT. Built with a clean, highly performant architecture, featuring complete user authentication, dynamic project/agent creation, and multiple independent chat sessions.

## Requirements

You are expected to have the following installed on your system to run this project locally:
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** (A local or cloud PostgreSQL database)

## Architecture

This project follows a decoupled client-server architecture:

1. **Frontend (Vite + React)**: 
   - A blazing fast single-page application (SPA).
   - Manages state efficiently without complex abstractions.
   - Securely stores JWT tokens.
   - Connects to the backend via REST APIs and Server-Sent Events (SSE) for real-time AI streaming.
   - Built to be easily deployable on **Vercel**.

2. **Backend (Express + Node.js)**:
   - A robust RESTful API built on Express.
   - Utilizes **Prisma ORM** for type-safe database interactions.
   - Streams AI responses directly to the frontend using the Groq/OpenAI compatible API.
   - Secures routes using custom JWT middleware.
   - Built to be easily deployable on **Render**.

3. **Database (PostgreSQL)**:
   - A relational database maintaining Users, Projects (Agents), Chats, Prompts, and Messages.
   - The schema is highly extensible and ensures data integrity via cascading deletes.

## Features

- **Authentication System**: Secure JWT-based registration and login.
- **Agent/Project Creation**: Create distinct "Agents" by giving them a system prompt/description.
- **Dual Chat Modes**: 
  - *Generic Chats*: Start a simple chat without any specific agent (uses a default helpful AI prompt).
  - *Agent Chats*: Click on an Agent in the sidebar to start a chat deeply integrated with that agent's specific instructions.
- **Real-time Streaming**: Watch the AI type out its response in real-time, exactly like ChatGPT.
- **Markdown Support**: The AI's responses render perfectly formatted Markdown (code blocks, lists, bold text).
- **Clean UI/UX**: Features a highly polished, responsive sidebar and chat interface with complete management (deletion) capabilities.
- **Zero AI Feel**: The codebase is written entirely with simple, human-readable React components and Express controllers. There is no confusing boilerplate.

## Installation

First, clone the repository to your local machine.

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Environment Variables

You need to configure the environment variables before running the application. 

### Backend `.env`
Create a `.env` file in the `backend/` directory:

```env
# Server Port
PORT=5000

# Database Connection (Replace with your PostgreSQL string)
DATABASE_URL="postgresql://user:password@localhost:5432/botdb"

# JWT Secret (Used for signing authentication tokens)
JWT_SECRET="your_super_secret_key_here"

# AI API Key (Groq / OpenAI compatible)
GROQ_API_KEY="your_ai_api_key_here"
```

### Frontend `.env`
Create a `.env` file in the `frontend/` directory (if running the backend on a different port/host):

```env
VITE_API_URL="http://localhost:5000"
```

## Running the Application

### 1. Database Migration
Ensure your PostgreSQL database is running, then run the Prisma migration to create all tables:
```bash
cd backend
npx prisma db push
npx prisma generate
```

### 2. Start the Backend
```bash
cd backend
npm run dev
```
*The backend will start on `http://localhost:5000`.*

### 3. Start the Frontend
In a new terminal window:
```bash
cd frontend
npm run dev
```
*The frontend will start on `http://localhost:5173`.*

---

**That's it!** You can now open your browser, register a new account, create some agents, and start chatting.
