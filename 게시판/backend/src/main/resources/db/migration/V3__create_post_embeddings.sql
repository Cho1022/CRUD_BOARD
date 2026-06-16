create extension if not exists vector;

create table post_embeddings (
  id bigserial primary key,
  post_id bigint not null,
  post_type varchar(30) not null,
  title varchar(255) not null,
  chunk_content text not null,
  source_url varchar(255) not null,
  canonical_url varchar(255),
  chunk_index integer not null,
  embedding vector(1536) not null,
  content_hash varchar(64) not null,
  post_created_at timestamp not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  unique (post_id, chunk_index)
);

create index idx_post_embeddings_post_type_created_at
on post_embeddings (post_type, post_created_at desc);

create index idx_post_embeddings_embedding
on post_embeddings using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
