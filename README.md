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
- Object Storage: AWS S3 (PDF files)
- Relational Database: PostgreSQL (users, documents, chunks, chats)

**Async Processing**
- Message Queues: RabbitMQ
- Separate workers for document processing and embedding generation

**LLM & Embeddings**:
- LLM Providers: OpenAI / Anthropic / Gemini
- Embedding Models: text-embedding-3-large 

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
- Once chunking is complete, a message referencing *document_id* is pushed to the **Embeddings Queue**.

## Embeddings Pipeline
- An embedding worker consumes messages from the **Embeddings Queue**.
- Worker retrieve all the chunks associated with the **document_id** and each chunk's texts are converted into an embedding using OpenAI's *text-embedding-3-large* embedding model.
- These embeddings are stored in a vector database with metadata (*document_id, chunk_index, user_id*) and after verification, the document status is updated to **READY**.

## Retrieval and Answer Generation
- User query is converted into an embedding using the same embedding model.
- Vector DB is queried with the query embedding and retrieval is scoped to the uploaded document_id.
- Relevant chunks are returned and these chunks are injected into a prompt template to send to an LLM to geerate an answer based on the retrieved context.
- The response is streamed to user using SSEs (Server Sent Events).
- The user query and model response are stored in chat history.

# Miscellaneous 
- What if no relevant chunks are retrieved for the user query? (Respond idk? suggest refining query? ask clarifying questions??)
- What if document is completely irrelevant to the prompt? (do something similar to previous one)
- Can cache embeddings for repeated queries? Will figure out caching later.
- Or cache retrieval results for every query? Let's see. 

# Self Notes
- User Logs in via Clerk -> Clerk sends a HTTP POST request to the webhook endpoint ->  