FROM postgres:16

# Install build dependencies for pgvector
RUN apt-get update && apt-get install -y \
    postgresql-server-dev-16 \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone and install pgvector
RUN git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git \
    && cd pgvector \
    && make \
    && make install \
    && cd .. \
    && rm -rf pgvector

# Auto-enable the vector extension on first database initialisation.
# Docker runs all *.sql files in this directory before the DB accepts connections.
COPY init.sql /docker-entrypoint-initdb.d/01_enable_vector.sql