# AI Knowledge Assistant

An AI-powered conversational assistant built with Next.js, TypeScript,
Supabase, Google Gemini embeddings, and Experiential Labs.

The application allows users to have AI conversations and upload PDF
documents that can be searched semantically and used as context for
AI-generated answers.

## Live Demo

https://ai-chatbot-azure-omega-97.vercel.app

## GitHub Repository

https://github.com/shudhanshu6061/ai-chatbot

---

## Project Overview

AI Knowledge Assistant combines conversational AI with document-based
question answering.

Users can:

- Start AI conversations
- Send messages and receive streamed responses
- Create and switch between conversations
- Upload PDF documents
- Process documents for semantic search
- Ask questions about uploaded documents
- Retrieve relevant document context
- Continue conversations across page refreshes

The project was built to demonstrate a production-oriented AI application
rather than a simple chatbot interface.

---

## Problem

General-purpose AI assistants do not automatically have access to a user's
private documents.

Users often need to search through lengthy PDFs manually before asking an AI
system a question.

This application combines document retrieval with conversational AI so users
can ask questions using information contained in their uploaded documents.

---

## Target Users

The application is designed for:

- Students
- Developers
- Researchers
- Technical users
- Anyone who needs to query information stored in PDF documents

---

## Key Features

### AI Chat

Users can send natural-language prompts and receive AI-generated responses.

### Streaming Responses

AI responses are streamed to the interface instead of waiting for the entire
response to finish.

### PDF Upload

Users can upload PDF documents through the application.

### Document Processing

Uploaded PDFs are parsed and processed into searchable content.

### Semantic Search

Document content is converted into embeddings and searched semantically.

### Retrieval-Augmented Generation

Relevant document content can be retrieved and supplied as context to the AI
model before generating an answer.

### Conversation Persistence

Conversations and messages are stored so users can continue previous chats.

### Authentication

Supabase authentication is used to establish and verify user sessions.

### Error Handling

The application handles authentication failures, invalid requests, upload
errors, rate limits, document retrieval failures, and AI service failures.

---

# Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Application framework |
| React | User interface |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Supabase | Authentication and database |
| Google Gemini | Embeddings / semantic retrieval |
| Experiential Labs | AI response generation |
| PDF Parser | PDF text extraction |
| Vercel | Production deployment |
| Vitest | Automated testing |
| React Testing Library | Component testing |

---

# Architecture

```text
                         ┌──────────────┐
                         │     User     │
                         └───────┬──────┘
                                 │
                                 ▼
                     ┌────────────────────┐
                     │  Next.js Frontend  │
                     └─────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
        ┌─────────────────┐        ┌─────────────────┐
        │    Chat API     │        │   Upload API    │
        └────────┬────────┘        └────────┬────────┘
                 │                          │
                 ▼                          ▼
        ┌─────────────────┐        ┌─────────────────┐
        │ Experiential    │        │   PDF Parser    │
        │ Labs AI         │        └────────┬────────┘
        └────────┬────────┘                 │
                 │                          ▼
                 │                 ┌─────────────────┐
                 │                 │    Embeddings   │
                 │                 └────────┬────────┘
                 │                          │
                 │                          ▼
                 │                 ┌─────────────────┐
                 │                 │    Supabase     │
                 │                 │ Vector Search   │
                 │                 └────────┬────────┘
                 │                          │
                 └────────────┬─────────────┘
                              ▼
                     ┌──────────────────┐
                     │  AI Response     │
                     │    Streaming     │
                     └──────────────────┘
AI Integration

AI is a core part of the application rather than a decorative feature.

The application uses an AI model to generate conversational responses.

The AI request is handled server-side through the /api/chat route so API
credentials are not exposed directly to the browser.

The application also uses embeddings for document retrieval.

Retrieval-Augmented Generation

The document question-answering workflow follows this general pipeline:

PDF Upload
    │
    ▼
PDF Text Extraction
    │
    ▼
Document Processing
    │
    ▼
Text Chunks
    │
    ▼
Gemini Embeddings
    │
    ▼
Supabase Vector Search
    │
    ▼
Relevant Document Chunks
    │
    ▼
AI Model + Retrieved Context
    │
    ▼
Generated Answer
    │
    ▼
Streaming Chat Interface

This allows the application to retrieve information from uploaded documents
before generating an answer.

API Routes

The application uses Next.js server routes for backend operations.

Important routes include:

/api/chat
/api/conversations
/api/messages
/api/documents
/api/upload
/api/embed
/api/search
/api/chat

Handles AI conversations and streaming responses.

/api/upload

Validates and processes uploaded PDF documents.

/api/embed

Creates searchable embeddings for document content.

/api/search

Performs semantic document search.

/api/conversations

Creates and retrieves conversations.

/api/messages

Persists chat messages.

Error Handling

The application includes error handling for:

Invalid requests
Missing authentication
Expired sessions
Failed AI requests
AI provider failures
Document retrieval failures
PDF validation failures
Oversized PDF uploads
Rate limiting
Database failures
Streaming failures

Errors are handled on the server and meaningful states are communicated to
the frontend where appropriate.

Security

Sensitive credentials are stored using environment variables rather than
committed to source control.

The application verifies authenticated users before accessing protected
resources.

Document-related operations are associated with authenticated users.

API keys are used server-side rather than exposed directly in client-side
code.

Accessibility

The interface was reviewed with accessibility in mind.

The application includes:

Keyboard-accessible controls
Accessible names for interactive elements
Form labels
Focus states
Loading status communication
Error announcements
Responsive layouts

Accessibility was reviewed using browser accessibility tooling and manual
keyboard navigation.

Testing

The project includes automated component testing using Vitest and React
Testing Library.

Run the test suite with:

npm test

The project also includes testing for a critical application flow.

Before deployment, the following checks should be performed:

npm test
npm run lint
npm run build
Local Development
1. Clone the repository
git clone https://github.com/shudhanshu6061/ai-chatbot.git

Move into the project:

cd ai-chatbot
2. Install dependencies
npm install
3. Configure environment variables

Create:

.env.local

Add the required environment variables:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

EXPLABS_API_KEY=
EXPLABS_MODEL=

GEMINI_API_KEY=

Do not commit .env.local or any secret API credentials to GitHub.

4. Start the development server
npm run dev

Open:

http://localhost:3000
Production Build

Create a production build:

npm run build

Start the production server:

npm start
Deployment

The application is deployed using Vercel.

Production URL:

https://ai-chatbot-azure-omega-97.vercel.app

Production environment variables must be configured through the deployment
platform rather than committed to the repository.

See DEPLOYMENT.md for the deployment verification and rollback checklist.

Known Limitations
PDF is currently the primary supported document format.
Large documents may require additional processing time.
Retrieval quality depends on document structure and embedding quality.
AI responses depend on the availability of the configured AI provider.
The current application focuses primarily on individual user document
workflows.
Future Improvements

Potential improvements include:

DOCX and TXT document support
Better document chunking strategies
Source citations in AI responses
Conversation search
Improved automated test coverage
Background document processing
More advanced retrieval strategies
Usage analytics
Improved document management
Production Verification

Before a production release, verify:

[ ] Application loads
[ ] Authentication works
[ ] Chat works
[ ] AI responses work
[ ] Streaming works
[ ] Conversations persist
[ ] PDF upload works
[ ] Document retrieval works
[ ] Error states work
[ ] Mobile layout works
[ ] Automated tests pass
[ ] Lint passes
[ ] Production build passes
[ ] Lighthouse audit completed
[ ] No secrets are committed
Author

Sudhanshu Prajapati

B.Tech Computer Science Engineering

GitHub:
https://github.com/shudhanshu6061

License

This project is currently intended as a portfolio and educational project.


---

# 2. Create `DEPLOYMENT.md`

Add this file to the root of the repository:

```markdown
# Deployment Checklist

## Pre-Deployment

- [ ] `npm install` completes successfully
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] No API keys or secrets are committed
- [ ] Environment variables are configured in Vercel

## Application Verification

- [ ] Production URL loads
- [ ] Authentication works
- [ ] Chat interface works
- [ ] AI responses are generated
- [ ] Streaming responses work
- [ ] Conversations persist
- [ ] PDF upload works
- [ ] Document processing works
- [ ] Semantic search works
- [ ] RAG responses work
- [ ] Error states display correctly

## Accessibility

- [ ] Keyboard navigation tested
- [ ] Interactive controls have accessible names
- [ ] Form controls have labels
- [ ] Loading states are communicated
- [ ] Error messages are accessible
- [ ] Mobile layout verified

## Performance

- [ ] Lighthouse audit completed
- [ ] Mobile performance reviewed
- [ ] Accessibility score reviewed
- [ ] Best Practices score reviewed
- [ ] SEO score reviewed

## Security

- [ ] API keys stored as environment variables
- [ ] `.env.local` is ignored by Git
- [ ] Authentication is required for protected resources
- [ ] User document access is verified
- [ ] Rate limiting is enabled

## Rollback Procedure

If a production deployment introduces a regression:

1. Identify the problematic deployment in Vercel.
2. Open the previous known-good deployment.
3. Promote the previous deployment if necessary.
4. Verify the production URL.
5. Investigate and fix the issue locally.
6. Run tests and build checks.
7. Deploy the corrected version.
8. Repeat production verification.

## Production URL

https://ai-chatbot-azure-omega-97.vercel.app

## Verification

Date:

Reviewer:

Deployment:

Result:
3. Add a project screenshot section

For the final assignment, your README should eventually contain screenshots.

Use:

## Screenshots

### Chat Interface

![AI Chat Interface](./docs/screenshots/chat-interface.png)

### Document Upload

![PDF Upload](./docs/screenshots/pdf-upload.png)

### Document Question Answering

![RAG Response](./docs/screenshots/rag-response.png)

Create:

docs/
└── screenshots/
    ├── chat-interface.png
    ├── pdf-upload.png
    └── rag-response.png
