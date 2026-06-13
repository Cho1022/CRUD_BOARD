create table members (
  id bigserial primary key,
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  nickname varchar(10) not null unique,
  profile_image_url varchar(500) not null,
  role varchar(20) not null,
  created_at timestamp not null,
  updated_at timestamp not null,
  deleted_at timestamp
);

create table refresh_tokens (
  id bigserial primary key,
  member_id bigint not null unique references members(id),
  token_hash varchar(128) not null unique,
  expires_at timestamp not null,
  created_at timestamp not null,
  updated_at timestamp not null,
  deleted_at timestamp
);

create table posts (
  id bigserial primary key,
  member_id bigint not null references members(id),
  title varchar(26) not null,
  content text not null,
  post_type varchar(20) not null,
  image_url varchar(500),
  canonical_url varchar(500),
  is_public boolean not null,
  published_at timestamp,
  view_count bigint not null,
  accepted_comment_id bigint,
  created_at timestamp not null,
  updated_at timestamp not null,
  deleted_at timestamp
);

create table comments (
  id bigserial primary key,
  post_id bigint not null references posts(id),
  member_id bigint not null references members(id),
  content text not null,
  accepted boolean not null,
  created_at timestamp not null,
  updated_at timestamp not null,
  deleted_at timestamp
);

create table tags (
  id bigserial primary key,
  name varchar(30) not null unique,
  created_at timestamp not null,
  updated_at timestamp not null,
  deleted_at timestamp
);

create table post_tags (
  id bigserial primary key,
  post_id bigint not null references posts(id),
  tag_id bigint not null references tags(id),
  created_at timestamp not null,
  updated_at timestamp not null,
  deleted_at timestamp,
  unique(post_id, tag_id)
);

create table post_likes (
  id bigserial primary key,
  post_id bigint not null references posts(id),
  member_id bigint not null references members(id),
  created_at timestamp not null,
  updated_at timestamp not null,
  deleted_at timestamp,
  unique(post_id, member_id)
);
