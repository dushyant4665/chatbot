# My Chatbot Project

Hey! This is a simple but powerful Chatbot platform I built. It works just like ChatGPT where you can create projects, chat with an AI, and even upload files!

## What it does
- **Accounts:** You can sign up and log in securely.
- **Projects:** Create different projects for different topics.
- **Chat:** Talk to the AI in real-time. The text types out smoothly without any lag!
- **File Uploads:** You can upload PDFs or Word documents. The app reads them directly in your browser and sends the text to the AI so it knows what you're talking about.

## How it works

Here is a simple flow of how the system talks to each other:

```mermaid
graph TD
    A[You / User] -->|Type message & upload file| B[Frontend React]
    B -->|Send data| C[Backend Node.js]
    C -->|Save to DB| D[(PostgreSQL)]
    C -->|Ask AI| E[Groq / OpenAI API]
    E -->|Stream response back| C
    C -->|Send words one by one| B
    B -->|Show smooth typing| A
```

## Tech Stack
- **Frontend:** React, Vite (Fast and clean UI)
- **Backend:** Node.js, Express (Simple and flat structure)
- **Database:** PostgreSQL with Prisma
- **AI:** Groq API (Super fast AI responses)

## How to run it on your computer

### 1. Database
Make sure you have PostgreSQL running. 
Go to the `backend` folder and run:
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

### 2. Backend Server
In the `backend` folder, create a file named `.env` and put this inside:
```
PORT=5000
DATABASE_URL="postgresql://username:password@localhost:5432/botdb?schema=public"
JWT_SECRET="my-secret-key"
GROQ_API_KEY="your-groq-api-key"
```
Then start the server:
```bash
npm run dev
```

### 3. Frontend App
Open a new terminal, go to the `frontend` folder and run:
```bash
npm install
npm run dev
```
Now just open `http://localhost:5173` in your browser and you're good to go!
