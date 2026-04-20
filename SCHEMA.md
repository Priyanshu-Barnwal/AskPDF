# User 
- id: uuid
- email: string
- name: string
- is_active: boolean
- plan: enum('free', 'pro', 'max')
- clerk_id: string
- stripe_customer_id: string
- created_at: timestamp
- updated_at: timestamp
- last_login_at: timestamp

# Document 
- id: uuid
- user_id: uuid
- file_name: text
- file_size: integer
- file_type: text
- page_count: integer
- status: enum('pending', 'uploading', 'queued', 'processing', 'ready', 'failed')
- s3_key: string
- last_trace_id
- error_message: text
- created_at: timestamp
- updated_at: timestamp

Status Enum: 
- PENDING: Record created in DB, but the file hasn't finished moving from Browser → S3 yet.
- UPLOADED: S3 upload confirmed. Ready to be pushed to RabbitMQ.
- QUEUED: Message successfully sent to RabbitMQ. Waiting for a Python worker to pick it up.
- PROCESSING: Worker has started parsing the PDF and generating chunks.
- COMPLETED: Vectors are in PostgreSQL, HNSW index updated, document is chat-ready.
- FAILED: A terminal error occurred at any stage.

s3_key instead of presigned URL as buckets are private and can be changed or a CDN or a proxy can be put in front of it.

# Document Chunk 
- id: uuid
- document_id: uuid
- chunk_text: text 
- chunk_index: integer
- page_label: string
- embedding: vector (since pgvector is used)
- created_at: timestamp
- updated_at: timestamp

Since we are using pgvectr, we will get ACID compliance on the vector data as well. This means we don't need to worry about the vector data being out of sync with the document data.  
page_label is the page number or the label of the page (e.g. "Page 1", "Page 2", "Page 3", etc.). It will help in implementing citations later on (not implemented currently, will do later).  

# RabbitMQ
{
    "document_id": "uuid",
    "user_id": "uuid",
    "s3_key": "string",
    "created_at": "timestamp",
    "retry_count": "integer"
}
