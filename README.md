# 🤖 AI Knowledge Assistant

An AI-powered knowledge assistant built with **Next.js, TypeScript, Supabase, Google Gemini, and Experiential Labs**.

The application allows users to have intelligent conversations with an AI assistant, upload PDF documents, and ask questions based on their uploaded documents using **Retrieval-Augmented Generation (RAG)**.

---

## 🚀 Live Demo

**Live Application:**  
https://ai-chatbot-azure-omega-97.vercel.app

**GitHub Repository:**  
https://github.com/shudhanshu6061/ai-chatbot

---

## 📌 Overview

The **AI Knowledge Assistant** is a full-stack AI chatbot designed to provide contextual and document-aware conversations.

Unlike a basic chatbot that only responds using general model knowledge, this application allows users to upload PDF documents and ask questions about their content.

The application processes uploaded documents, generates embeddings, stores them in a vector database, retrieves relevant information, and provides the retrieved context to the AI model before generating a response.

### Core Flow

```text
User
  ↓
Chat Interface
  ↓
Next.js API
  ↓
AI Model
  ↓
Streaming Response
  ↓
User
```

### Document-Based Question Answering

```text
PDF Upload
    ↓
Text Extraction
    ↓
Text Chunking
    ↓
Embeddings Generation
    ↓
Supabase Vector Database
    ↓
Semantic Search
    ↓
Relevant Context
    ↓
AI Model
    ↓
Generated Answer
```

---

# ✨ Features

## 💬 AI Chat

- Interactive AI chat interface
- Real-time/streaming AI responses
- Multiple messages within conversations
- Markdown rendering
- GitHub-Flavored Markdown support
- Context-aware conversations

## 📄 PDF Knowledge Base

- Upload PDF documents
- PDF validation
- File size validation
- Text extraction
- Document processing
- Automatic text chunking
- Embedding generation
- Vector storage

## 🧠 Retrieval-Augmented Generation

The application implements a RAG pipeline to answer questions using information from uploaded documents.

```text
Document
   ↓
Extract Text
   ↓
Create Chunks
   ↓
Generate Embeddings
   ↓
Store in Supabase
   ↓
User Question
   ↓
Generate Query Embedding
   ↓
Semantic Similarity Search
   ↓
Retrieve Relevant Chunks
   ↓
AI Context
   ↓
Generate Answer
```

This allows the assistant to provide responses grounded in the user's uploaded knowledge base.

## 🔐 Authentication

- Supabase authentication
- Protected API routes
- User-specific conversations
- User-specific messages
- User-specific document access

## 💾 Conversation Persistence

Users can:

- Create conversations
- Continue existing conversations
- Store messages
- Retrieve previous conversations
- Maintain separate conversation histories

## ⚡ Streaming Responses

AI responses are streamed to the client to provide a faster and more interactive user experience.

## 🛡️ Error Handling

The application handles:

- Invalid requests
- Unauthorized requests
- Missing authentication
- Invalid PDF files
- Empty uploads
- File size limits
- API failures
- AI model errors
- Database errors
- Rate limiting

---

# 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js** | Full-stack React framework |
| **React** | User interface |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Styling |
| **Supabase** | Authentication, database and vector search |
| **Google Gemini** | Embeddings and AI capabilities |
| **Experiential Labs** | AI model inference |
| **PDF Parse** | PDF text extraction |
| **React Markdown** | Markdown response rendering |
| **Remark GFM** | GitHub-Flavored Markdown |
| **Vercel** | Production deployment |
| **Vitest** | Testing |
| **React Testing Library** | Component testing |

---

# 🏗️ Project Architecture

```text
                    ┌──────────────────┐
                    │      User        │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Next.js Client  │
                    │   Chat Interface │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   Next.js API    │
                    │      Routes      │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │ Supabase │   │  Gemini  │   │ Experiential │
        │ Database │   │Embedding │   │     Labs     │
        └──────────┘   └──────────┘   └──────────────┘
              │
              ▼
        ┌──────────────┐
        │ Vector Search│
        │     / RAG    │
        └──────────────┘
```

---

# 📁 Project Structure

```text
ai-chatbot/
│
├── app/
│   ├── api/
│   │   ├── chat/
│   │   ├── conversations/
│   │   ├── documents/
│   │   ├── embed/
│   │   ├── messages/
│   │   ├── search/
│   │   └── upload/
│   │
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── public/
│
├── supabase/
│   └── performance_indexes.sql
│
├── docs/
│   └── screenshots/
│
├── tests/
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
├── vitest.setup.ts
├── DEPLOYMENT.md
└── README.md
```

---

# 🔌 API Routes

| Endpoint | Purpose |
|---|---|
| `/api/chat` | AI chat and response generation |
| `/api/conversations` | Create and manage conversations |
| `/api/messages` | Store and retrieve messages |
| `/api/documents` | Manage uploaded documents |
| `/api/upload` | Upload and process PDF documents |
| `/api/embed` | Generate/process embeddings |
| `/api/search` | Semantic document search |

Protected operations use authentication and server-side validation.

---

# 🧠 AI Integration

The application uses an AI pipeline combining **Experiential Labs** and **Google Gemini**.

### AI Chat Flow

```text
User Message
     ↓
API Validation
     ↓
Authentication
     ↓
Conversation Context
     ↓
AI Model
     ↓
Streaming Response
     ↓
Client
```

### Document Question Answering

```text
User Question
      ↓
Generate Embedding
      ↓
Vector Similarity Search
      ↓
Retrieve Relevant Chunks
      ↓
Build AI Context
      ↓
AI Model
      ↓
Grounded Response
```

---

# 📄 Document Processing

When a user uploads a PDF:

1. The file is validated.
2. Authentication is checked.
3. File type is verified.
4. File size is validated.
5. Text is extracted from the PDF.
6. Extracted text is divided into manageable chunks.
7. Embeddings are generated.
8. Embeddings are stored in Supabase.
9. The document becomes searchable through semantic search.

---

# 🔐 Security

The application follows several security practices:

- Server-side API validation
- Supabase authentication
- User-specific data access
- Protected document access
- File type validation
- File size validation
- Rate limiting
- Environment variables for secrets
- No API keys committed to the repository
- Authorization checks for protected resources

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

EXPLABS_API_KEY=
EXPLABS_MODEL=

GEMINI_API_KEY=
```

> ⚠️ Never commit `.env.local` or API keys to GitHub.

---

# 🖥️ Local Development

## 1. Clone the Repository

```bash
git clone https://github.com/shudhanshu6061/ai-chatbot.git
```

## 2. Navigate to the Project

```bash
cd ai-chatbot
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Configure Environment Variables

Create:

```text
.env.local
```

Add the required Supabase and AI provider credentials.

## 5. Start the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🧪 Testing

The project uses **Vitest** and **React Testing Library** for automated testing.

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

The testing strategy focuses on critical application behavior and UI components.

---

# 🔍 Code Quality

Run ESLint:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

Recommended verification before deployment:

```bash
npm test
npm run lint
npm run build
```

---

# 🚀 Deployment

The application is deployed using **Vercel**.

### Production URL

https://ai-chatbot-azure-omega-97.vercel.app

### Deployment Process

```text
GitHub Repository
       ↓
     Vercel
       ↓
Build Application
       ↓
Configure Environment Variables
       ↓
Production Deployment
       ↓
Live Application
```

Detailed deployment instructions are available in:

```text
DEPLOYMENT.md
```

---

# 📱 Responsive Design

The application is designed to work across:

- Desktop
- Laptop
- Tablet
- Mobile devices

The interface adapts to different viewport sizes while maintaining usability and readability.

---

# ♿ Accessibility

Accessibility considerations include:

- Semantic HTML
- Keyboard navigation
- Form labels
- Focus states
- Accessible interactive controls
- Readable typography
- Responsive layouts
- Appropriate loading and error states

---

# ⚡ Performance

Performance considerations include:

- Next.js App Router
- Streaming AI responses
- Server-side API processing
- Vector similarity search
- Optimized client-side rendering
- Production builds through Next.js
- Vercel deployment infrastructure

---

# 📸 Screenshots

Add project screenshots inside:

```text
docs/screenshots/
```

Recommended screenshots:

```text
docs/screenshots/chat-interface.png
docs/screenshots/pdf-upload.png
docs/screenshots/rag-response.png
```

### Chat Interface

![AI Chat Interface](docs/screenshots/chat-interface.png)

### PDF Upload

![PDF Upload](docs/screenshots/pdf-upload.png)

### RAG Response

![RAG Response](docs/screenshots/rag-response.png)

---

# 🎯 Use Cases

The application can be used for:

- Personal knowledge management
- Document question answering
- Research assistance
- Study material analysis
- Technical documentation search
- PDF-based AI assistants
- Internal knowledge bases
- Educational applications

---

# 🔮 Future Improvements

Potential future improvements include:

- Multiple document collections
- Advanced conversation memory
- Improved citation and source references
- Document preview
- DOCX and TXT support
- Improved document chunking strategies
- Advanced retrieval ranking
- Hybrid keyword + vector search
- Voice input
- Voice responses
- Multi-language support
- AI-generated document summaries
- Usage analytics
- Improved rate limiting
- More comprehensive automated test coverage

---

# 🧩 Known Limitations

Current limitations may include:

- PDF-focused document ingestion
- AI responses depend on configured model availability
- Retrieval quality depends on document structure and chunking
- Large documents may require additional processing optimization
- AI-generated responses can still contain inaccuracies

Users should verify important information against the original source documents.

---

# 📚 Learning Outcomes

Through this project, the following concepts were implemented and practiced:

- Full-stack Next.js development
- TypeScript
- React component development
- REST API design
- Authentication
- Database integration
- Vector databases
- Embeddings
- Semantic search
- Retrieval-Augmented Generation
- AI model integration
- Streaming responses
- PDF processing
- Error handling
- Rate limiting
- Automated testing
- Production deployment
- Environment configuration
- Responsive UI development

---

# ✅ Production Verification Checklist

Before submitting or demonstrating the project:

- [ ] Production URL loads successfully
- [ ] Chat interface works
- [ ] AI response is generated
- [ ] Streaming response works
- [ ] Multiple messages work
- [ ] New conversation works
- [ ] Conversation persistence works
- [ ] PDF upload works
- [ ] PDF processing works
- [ ] RAG question answering works
- [ ] Invalid input is handled
- [ ] Authentication works
- [ ] Mobile layout works
- [ ] Keyboard navigation works
- [ ] Tests pass
- [ ] ESLint passes
- [ ] Production build passes
- [ ] Environment variables are configured
- [ ] No secrets are committed
- [ ] README is complete
- [ ] Screenshots are added

---

# 👨‍💻 Author

## Shudhanshu Prajapati

B.Tech Computer Science Engineering

**GitHub:**  
https://github.com/shudhanshu6061

**LinkedIn:**  
https://www.linkedin.com/in/shudhanshu-prajapati-b3701b250

---

# ⭐ Project

If you find this project useful, consider giving the repository a ⭐ on GitHub.

**Built with Next.js, TypeScript, Supabase, Gemini, Experiential Labs, and AI.**
