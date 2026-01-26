# AskPDF
AskPDF is a document-centric RAG (Retrieval-Augmented Generation) application that allows users to upload PDFs and interact with them through a conversational interface. Users can ask natural language questions about the content of their documents, and the system generates grounded answers by retrieving relevant sections from the uploaded PDFs and using a large language model to synthesize responses.

The system is designed to prioritize correctness, debuggability, and scalability over ad-hoc simplicity.
## Tech Stack:
**Frontend**:
- Next.js (App Router)
- Tailwind CSS 

**Backend**: 
- Next.js API Routes
- Node.js with TypeScript
- Python for async ingestion and embeddings

**Storage**
- Object Storage: AWS S3 or Firebase Storage (PDF files)
- Relational Database: PostgreSQL (users, documents, chunks, chats)

**Async Processing**
- Message Queues: AWS SQS / BullMQ (Redis)
- Separate workers for document processing and embedding generation

**LLM & Embeddings**:
- LLM Providers: OpenAI / Anthropic / Gemini
- Embedding Models: text-embedding-3-large or equivalent

**Vector Database**:
- pgvector (PostgreSQL)

**Auth**: 
- Clerk

# Technical Design 
## Ingestion: 
- User uploads a PDF, which is stored in object storage (S3 or Firebase Storage).
- A documents record is created in the database containing metadata such as file name, size, owner, and ingestion status.
- A message referencing the document is pushed to the **Document Processing Queue**.
- A document processing worker consumes the message, downloads the PDF, and performs parsing, cleaning, and semantic chunking. 
- Generated chunks are persisted in the **document_chunks** table.
- Once chunking is complete, a message is pushed to the **Embeddings Queue**.
- An embedding worker generates embeddings for each chunk and stores them in the vector database.
- After successful verification, the document status is updated to **READY**.

