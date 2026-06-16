---
type: concept
topic: Spring 게시판 Post 도메인
status: draft
created: 2026-06-16
tags:
  - spring
  - board
  - post
  - jpa
  - rest-api
---

# Post 도메인 처음부터 구현하기

## 1. 이 도메인에서 만들고자 한 것

`Post` 도메인에서 만들고자 한 것은 **게시글 기능**이다.

이 프로젝트의 게시글은 단순히 제목과 본문만 저장하는 기능이 아니다.

게시글 하나에는 아래 정보가 들어간다.

- 작성자
- 제목
- 본문
- 말머리
- 이미지
- 관련 경로
- 공개 여부
- 발행 시간
- 조회수
- 채택 댓글 ID
- 태그
- 댓글 수
- 추천 수

그래서 `Post` 도메인을 만들 때는 아래 기능을 전부 생각해야 한다.

- 게시글 작성
- 게시글 목록 조회
- 게시글 상세 조회
- 게시글 수정
- 게시글 삭제
- 조회수 증가
- 태그 저장
- 이미지 업로드
- 공지/FAQ 작성 권한 제한
- 댓글 수와 추천 수 함께 보여주기

## 2. 구현을 시작하기 전에 먼저 정해야 하는 것

코드부터 쓰기 전에 먼저 정해야 하는 것은 **게시글 데이터의 모양**이다.

즉, DB에 어떤 컬럼이 있어야 하는지 먼저 생각한다.

이 프로젝트에서는 게시글을 저장하기 위해 `posts` 테이블을 사용한다.

```sql
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
```

이 테이블을 보고 Java 코드의 `Post.java`를 만든다.

DB 컬럼과 Java 필드는 거의 1:1로 대응된다.

```text
posts.id                 -> Post.id
posts.member_id          -> Post.author
posts.title              -> Post.title
posts.content            -> Post.content
posts.post_type          -> Post.postType
posts.image_url          -> Post.imageUrl
posts.canonical_url      -> Post.canonicalUrl
posts.is_public          -> Post.isPublic
posts.published_at       -> Post.publishedAt
posts.view_count         -> Post.viewCount
posts.accepted_comment_id -> Post.acceptedCommentId
```

## 3. 전체 구현 순서

처음부터 만든다고 생각하면 순서는 아래가 좋다.

1. DB 테이블 구조를 정한다.
2. 게시글 타입 `PostType`을 만든다.
3. 게시글 Entity `Post`를 만든다.
4. 게시글과 태그 연결 Entity `PostTag`를 만든다.
5. Repository를 만든다.
6. 요청 DTO와 응답 DTO를 만든다.
7. Service에서 실제 비즈니스 로직을 만든다.
8. Controller에서 HTTP API를 연다.
9. Front에서 API 요청을 연결한다.
10. 브라우저 Network, 서버 로그, DB row로 확인한다.

## 4. `PostType` 먼저 만들기

파일:

`backend/src/main/java/com/example/board/post/PostType.java`

```java
package com.example.board.post;

public enum PostType {
    GENERAL, NOTICE, FAQ, QUESTION
}
```

`enum`은 정해진 값 중 하나만 쓰게 하고 싶을 때 사용한다.

게시글 말머리는 아무 문자열이나 들어오면 안 된다.

예를 들어 아래 값만 허용해야 한다.

- `GENERAL`
- `NOTICE`
- `FAQ`
- `QUESTION`

그래서 `String postType`이 아니라 `PostType postType`으로 만든다.

이렇게 하면 `Post`에는 정해진 게시글 타입만 들어갈 수 있다.

연결할 개념:

- [[Enum]]
- [[Type Safety]]

## 5. `Post.java` 만들기

파일:

`backend/src/main/java/com/example/board/post/Post.java`

현재 완성된 코드는 아래와 같다.

```java
package com.example.board.post;

import com.example.board.common.BaseEntity;
import com.example.board.member.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "posts")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member author;
    @Column(nullable = false, length = 26)
    private String title;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostType postType;
    private String imageUrl;
    private String canonicalUrl;
    @Column(nullable = false)
    private boolean isPublic;
    private LocalDateTime publishedAt;
    @Column(nullable = false)
    private long viewCount;
    private Long acceptedCommentId;

    public Post(Member author, String title, String content, PostType postType, String imageUrl, String canonicalUrl, boolean isPublic) {
        this.author = author;
        this.title = title;
        this.content = content;
        this.postType = postType;
        this.imageUrl = imageUrl;
        this.canonicalUrl = canonicalUrl;
        this.isPublic = isPublic;
        this.publishedAt = LocalDateTime.now();
    }

    public void update(String title, String content, PostType postType, String imageUrl, String canonicalUrl, boolean isPublic) {
        this.title = title;
        this.content = content;
        this.postType = postType;
        this.imageUrl = imageUrl;
        this.canonicalUrl = canonicalUrl;
        this.isPublic = isPublic;
    }

    public void increaseView() {
        viewCount++;
    }

    public void acceptComment(Long commentId) {
        this.acceptedCommentId = commentId;
    }
}
```

## 6. `Post.java`를 줄 단위로 이해하기

### 6.1 `package`

```java
package com.example.board.post;
```

이 파일이 `post` 도메인에 속한다는 뜻이다.

현재 프로젝트는 도메인별로 패키지를 나눈다.

```text
auth
member
post
comment
likes
tag
file
security
common
```

게시글과 직접 관련된 코드는 `post` 패키지 안에 둔다.

### 6.2 `import`

```java
import com.example.board.common.BaseEntity;
import com.example.board.member.Member;
```

`Post`는 공통 시간 필드가 필요해서 `BaseEntity`를 상속한다.

`Post`는 작성자 정보가 필요해서 `Member`를 참조한다.

```java
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
```

이 import들은 JPA Entity를 만들 때 필요한 어노테이션이다.

필드를 DB 테이블과 연결하려면 이런 JPA 문법이 필요하다.

```java
import java.time.LocalDateTime;
```

게시글 발행 시간 `publishedAt`을 저장하기 위해 사용한다.

```java
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
```

반복 코드를 줄이기 위해 Lombok을 사용한다.

### 6.3 `@Getter`

```java
@Getter
```

모든 필드의 getter 메서드를 자동으로 만들어준다.

원래라면 아래처럼 직접 써야 한다.

```java
public Long getId() {
    return id;
}

public String getTitle() {
    return title;
}
```

하지만 `@Getter`를 붙이면 Lombok이 대신 만들어준다.

이 프로젝트에서는 응답 DTO를 만들 때 아래처럼 getter를 사용한다.

```java
post.getId()
post.getPostType()
post.getTitle()
post.getContent()
```

그래서 `Post`에는 `@Getter`가 필요하다.

연결할 개념:

- [[Lombok]]
- [[Getter]]

### 6.4 `@Entity`

```java
@Entity
```

이 클래스가 JPA Entity라는 뜻이다.

쉽게 말하면 `Post` 객체를 DB 테이블 row와 연결하겠다는 뜻이다.

`@Entity`가 있어야 JPA가 이 클래스를 관리한다.

`@Entity`가 없으면 `PostRepository extends JpaRepository<Post, Long>`로 DB 저장과 조회를 할 수 없다.

연결 관계:

```text
Post 객체
-> JPA Entity
-> posts 테이블 row
```

연결할 개념:

- [[Entity]]
- [[JPA]]

### 6.5 `@Table(name = "posts")`

```java
@Table(name = "posts")
```

이 Entity가 DB의 `posts` 테이블과 연결된다는 뜻이다.

클래스 이름은 `Post`인데 테이블 이름은 `posts`다.

이처럼 클래스명과 테이블명이 다르거나, 테이블명을 명확하게 지정하고 싶을 때 `@Table`을 쓴다.

연결 관계:

```text
Post.java
-> @Table(name = "posts")
-> DB posts 테이블
```

### 6.6 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`

```java
@NoArgsConstructor(access = AccessLevel.PROTECTED)
```

JPA는 Entity 객체를 만들 때 기본 생성자가 필요하다.

기본 생성자는 인자가 없는 생성자다.

```java
protected Post() {
}
```

이 코드를 Lombok이 대신 만들어준다.

그런데 아무 곳에서나 `new Post()`를 막고 싶기 때문에 접근 범위를 `PROTECTED`로 둔다.

즉, JPA는 사용할 수 있지만 일반 코드에서는 의미 없는 빈 게시글 생성을 막는 구조다.

연결할 개념:

- [[JPA 기본 생성자]]
- [[Lombok]]

### 6.7 `extends BaseEntity`

```java
public class Post extends BaseEntity {
```

`Post`는 `BaseEntity`를 상속한다.

`BaseEntity`에는 보통 공통 필드가 들어간다.

이 프로젝트에서는 `createdAt`, `updatedAt`, `deletedAt`이 공통으로 사용된다.

그래서 `Post`에 매번 아래 필드를 직접 쓰지 않고 `BaseEntity`에서 물려받는다.

```text
createdAt
updatedAt
deletedAt
```

`deletedAt`은 소프트 삭제에 사용된다.

삭제된 게시글은 실제 DB row를 바로 지우는 것이 아니라 `deletedAt` 값을 채워서 삭제된 것처럼 처리한다.

### 6.8 `@Id`

```java
@Id
private Long id;
```

`id`가 이 Entity의 기본키라는 뜻이다.

DB에서는 `posts.id`가 primary key다.

Java에서는 `Post.id`가 Entity 식별자다.

연결 관계:

```text
posts.id
-> Post.id
```

### 6.9 `@GeneratedValue(strategy = GenerationType.IDENTITY)`

```java
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;
```

`id` 값을 DB가 자동으로 생성하게 한다.

그래서 게시글을 만들 때 아래처럼 `id`를 직접 넣지 않는다.

```java
new Post(member, title, content, postType, image, canonicalUrl, isPublic)
```

저장 흐름:

```text
postRepository.save(new Post(...))
-> insert into posts (...)
-> DB가 id 생성
-> Post.id에 생성된 id 반영
```

연결할 개념:

- [[Primary Key]]
- [[GeneratedValue]]

### 6.10 작성자 관계: `@ManyToOne`

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "member_id", nullable = false)
private Member author;
```

게시글 여러 개는 한 명의 회원에게 속할 수 있다.

그래서 관계는 다대일이다.

```text
Member 1명
-> Post 여러 개
```

이럴 때 `@ManyToOne`을 사용한다.

`@JoinColumn(name = "member_id")`는 `posts.member_id` 컬럼으로 회원과 연결한다는 뜻이다.

값 전달 흐름:

```text
로그인 사용자 email
-> memberRepository.findByEmail(email)
-> Member member
-> new Post(member, ...)
-> posts.member_id에 member.id 저장
```

`fetch = FetchType.LAZY`는 작성자 정보를 필요할 때 가져오도록 하는 설정이다.

연결할 개념:

- [[ManyToOne]]
- [[Lazy Loading]]
- [[Foreign Key]]

### 6.11 제목 필드

```java
@Column(nullable = false, length = 26)
private String title;
```

`title`은 게시글 제목이다.

`nullable = false`는 DB에 null로 저장될 수 없다는 뜻이다.

`length = 26`은 제목 길이를 26자로 제한한다.

DB와 연결하면 아래와 같다.

```text
Post.title
-> posts.title varchar(26) not null
```

### 6.12 본문 필드

```java
@Column(nullable = false, columnDefinition = "TEXT")
private String content;
```

`content`는 게시글 본문이다.

본문은 제목보다 길 수 있으므로 `TEXT` 타입으로 저장한다.

DB와 연결하면 아래와 같다.

```text
Post.content
-> posts.content text not null
```

### 6.13 말머리 필드

```java
@Enumerated(EnumType.STRING)
@Column(nullable = false)
private PostType postType;
```

`postType`은 게시글 말머리다.

Java에서는 `PostType` enum으로 다룬다.

DB에는 문자열로 저장한다.

`@Enumerated(EnumType.STRING)`을 붙이면 DB에 아래처럼 저장된다.

```text
GENERAL
NOTICE
FAQ
QUESTION
```

주의할 점:

`EnumType.STRING`을 쓰면 enum 이름이 DB에 저장된다.

그래서 `PostType` 이름을 바꾸면 기존 DB 값과 맞지 않을 수 있다.

연결할 개념:

- [[Enum]]
- [[Enumerated]]

### 6.14 이미지와 관련 경로

```java
private String imageUrl;
private String canonicalUrl;
```

`imageUrl`은 업로드한 이미지 경로다.

`canonicalUrl`은 게시글과 연결할 관련 경로다.

이 두 값은 필수가 아니기 때문에 `@Column(nullable = false)`가 붙어 있지 않다.

즉 null이 가능하다.

### 6.15 공개 여부

```java
@Column(nullable = false)
private boolean isPublic;
```

게시글 공개 여부다.

`boolean`은 `true` 또는 `false` 값을 가진다.

DB에서는 `posts.is_public`에 저장된다.

### 6.16 발행 시간

```java
private LocalDateTime publishedAt;
```

게시글이 발행된 시간이다.

생성자에서 아래처럼 값을 넣는다.

```java
this.publishedAt = LocalDateTime.now();
```

즉 게시글 객체를 새로 만들 때 현재 시간이 들어간다.

### 6.17 조회수

```java
@Column(nullable = false)
private long viewCount;
```

조회수다.

처음 생성할 때 직접 값을 넣지 않기 때문에 Java 기본값인 `0`으로 시작한다.

상세 조회할 때 아래 메서드로 증가한다.

```java
public void increaseView() {
    viewCount++;
}
```

### 6.18 채택 댓글 ID

```java
private Long acceptedCommentId;
```

질문 게시글에서 어떤 댓글이 채택되었는지 저장하기 위한 값이다.

댓글 채택 시 아래 메서드로 값이 들어간다.

```java
public void acceptComment(Long commentId) {
    this.acceptedCommentId = commentId;
}
```

## 7. Entity에는 setter를 만들지 않는다

현재 `Post`에는 `setTitle()`, `setContent()` 같은 setter가 없다.

대신 아래 메서드가 있다.

```java
public void update(String title, String content, PostType postType, String imageUrl, String canonicalUrl, boolean isPublic)
```

이유:

필드를 아무 곳에서나 바꾸는 것이 아니라, 게시글 수정이라는 의미 있는 동작으로 바꾸기 위해서다.

나쁜 방식:

```java
post.setTitle(title);
post.setContent(content);
post.setPostType(postType);
```

현재 방식:

```java
post.update(title, content, postType, imageUrl, canonicalUrl, isPublic);
```

이렇게 하면 코드만 봐도 “게시글을 수정하는구나”라고 이해하기 쉽다.

연결할 개념:

- [[Entity]]
- [[Encapsulation]]

## 8. `PostTag` 만들기

게시글은 여러 태그를 가질 수 있고, 태그 하나도 여러 게시글에 붙을 수 있다.

그래서 게시글과 태그는 다대다 관계다.

하지만 이 프로젝트에서는 `@ManyToMany`를 직접 쓰지 않고, 중간 Entity인 `PostTag`를 만든다.

파일:

`backend/src/main/java/com/example/board/post/PostTag.java`

```java
@Entity
@Table(name = "post_tags")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostTag extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", nullable = false)
    private Tag tag;

    public PostTag(Post post, Tag tag) {
        this.post = post;
        this.tag = tag;
    }
}
```

DB 구조:

```sql
create table post_tags (
  id bigserial primary key,
  post_id bigint not null references posts(id),
  tag_id bigint not null references tags(id),
  created_at timestamp not null,
  updated_at timestamp not null,
  deleted_at timestamp,
  unique(post_id, tag_id)
);
```

값 전달 흐름:

```text
게시글 id
-> post_tags.post_id

태그 id
-> post_tags.tag_id
```

`unique(post_id, tag_id)`는 같은 게시글에 같은 태그가 중복 저장되지 않게 한다.

## 9. Repository 만들기

Entity를 만들었으면 DB에 저장하고 조회할 Repository가 필요하다.

파일:

`backend/src/main/java/com/example/board/post/PostRepository.java`

```java
public interface PostRepository extends JpaRepository<Post, Long> {
```

`JpaRepository<Post, Long>`의 의미:

```text
Post Entity를 대상으로
id 타입은 Long이고
기본 CRUD 기능을 제공받는다
```

기본으로 사용할 수 있는 메서드:

- `save(post)`
- `findById(id)`
- `findAll()`
- `delete(post)`

현재 프로젝트에서는 삭제된 게시글을 제외해야 하므로 아래 메서드를 따로 만들었다.

```java
Optional<Post> findByIdAndDeletedAtIsNull(Long id);
```

이 메서드는 Spring Data JPA가 이름을 보고 쿼리를 만들어준다.

의미:

```text
id가 일치하고
deletedAt이 null인
Post를 찾는다
```

연결되는 SQL 의미:

```sql
select *
from posts
where id = ?
and deleted_at is null;
```

## 10. 목록 검색 쿼리 만들기

목록 검색은 조건이 많아서 `@Query`를 사용한다.

```java
@Query("""
        select distinct p from Post p
        left join p.author a
        left join PostTag pt on pt.post = p
        left join pt.tag t
        where p.deletedAt is null
        and (:type is null or p.postType = :type)
        and (:tag = '' or lower(t.name) = lower(:tag))
        and (:keyword = ''
          or lower(p.title) like lower(concat('%', :keyword, '%'))
          or lower(p.content) like lower(concat('%', :keyword, '%'))
          or lower(a.nickname) like lower(concat('%', :keyword, '%'))
          or lower(t.name) like lower(concat('%', :keyword, '%')))
        """)
Page<Post> search(@Param("keyword") String keyword, @Param("type") PostType type, @Param("tag") String tag, Pageable pageable);
```

여기서 사용하는 문법은 SQL이 아니라 JPQL이다.

JPQL은 테이블 이름이 아니라 Entity 이름과 필드 이름을 기준으로 쓴다.

```text
DB 테이블 기준 SQL:
posts.title

Entity 기준 JPQL:
p.title
```

검색 조건:

- 삭제되지 않은 게시글만 조회
- 타입이 있으면 타입 필터
- 태그가 있으면 태그 필터
- 키워드가 있으면 제목, 본문, 작성자 닉네임, 태그 이름에서 검색

`Page<Post>`는 페이징 결과를 의미한다.

`Pageable`은 몇 페이지를 몇 개씩 가져올지 나타내는 값이다.

연결할 개념:

- [[Repository]]
- [[JpaRepository]]
- [[JPQL]]
- [[Pageable]]
- [[Page]]

## 11. DTO 개념

DTO(Data Transfer Object)는 계층 사이에서 데이터를 주고받기 위한 객체다.

이 프로젝트에서는 Entity를 그대로 프론트에 주지 않는다.

대신 요청용 DTO와 응답용 DTO를 따로 만든다.

이유:

- Entity는 DB 구조와 연결되어 있음
- 프론트 요청 데이터와 DB Entity 구조가 항상 같지는 않음
- 응답에 필요한 값만 골라서 줄 수 있음
- 댓글 수, 추천 수처럼 Entity에 직접 없는 값도 응답에 포함할 수 있음

## 12. 요청 DTO 만들기

파일:

`backend/src/main/java/com/example/board/post/dto/PostCreateRequest.java`

```java
public record PostCreateRequest(
        @NotBlank(message = "제목을 입력해주세요.")
        @Size(max = 26, message = "제목은 최대 26자까지 작성 가능합니다.")
        String title,
        @NotBlank(message = "본문을 입력해주세요.")
        String content,
        PostType postType,
        String tags,
        String canonicalUrl,
        Boolean isPublic,
        MultipartFile image
) {
}
```

`record`는 데이터를 담는 객체를 짧게 만들 때 사용한다.

일반 class로 쓰면 생성자, getter 등을 직접 만들어야 한다.

`record`를 쓰면 `title()`, `content()` 같은 메서드가 자동으로 생긴다.

검증 어노테이션:

```java
@NotBlank
```

빈 문자열이면 안 된다는 뜻이다.

```java
@Size(max = 26)
```

최대 26자까지만 허용한다는 뜻이다.

파일 업로드:

```java
MultipartFile image
```

프론트에서 이미지를 `FormData`로 보내면 Spring이 `MultipartFile`로 받는다.

그래서 Controller에서는 `@RequestBody`가 아니라 `@ModelAttribute`를 사용한다.

## 13. 응답 DTO 만들기

파일:

`PostDetailResponse.java`

```java
public record PostDetailResponse(
        Long id,
        PostType postType,
        String title,
        String content,
        String authorNickname,
        String imageUrl,
        String canonicalUrl,
        boolean isPublic,
        List<String> tags,
        long commentCount,
        long likeCount,
        long viewCount,
        Long acceptedCommentId,
        LocalDateTime createdAt
) {
    public static PostDetailResponse of(Post post, List<String> tags, long commentCount, long likeCount) {
        return new PostDetailResponse(
                post.getId(), post.getPostType(), post.getTitle(), post.getContent(),
                post.getAuthor().getNickname(), post.getImageUrl(), post.getCanonicalUrl(),
                post.isPublic(), tags, commentCount, likeCount, post.getViewCount(),
                post.getAcceptedCommentId(), post.getCreatedAt()
        );
    }
}
```

`PostDetailResponse`는 상세 화면에 필요한 값을 담는다.

여기에는 `content`가 포함된다.

반면 `PostListResponse`는 목록 화면용이다.

목록에서는 본문 전체가 필요하지 않기 때문에 `content`가 없다.

## 14. Service 만들기

Controller가 요청을 받는 입구라면, Service는 실제 규칙을 처리하는 곳이다.

파일:

`backend/src/main/java/com/example/board/post/PostService.java`

```java
@Service
@RequiredArgsConstructor
public class PostService {
```

`@Service`는 이 클래스가 서비스 계층이라는 뜻이다.

Spring이 이 객체를 Bean으로 등록한다.

`@RequiredArgsConstructor`는 `final` 필드를 받는 생성자를 자동으로 만든다.

현재 `PostService`는 아래 의존성을 가진다.

```java
private final PostRepository postRepository;
private final PostTagRepository postTagRepository;
private final TagRepository tagRepository;
private final MemberRepository memberRepository;
private final CommentRepository commentRepository;
private final PostLikeRepository postLikeRepository;
private final FileStorage fileStorage;
private final FileValidator fileValidator;
```

각 역할:

| 의존성 | 역할 |
| --- | --- |
| `PostRepository` | 게시글 저장/조회 |
| `PostTagRepository` | 게시글-태그 연결 저장/조회 |
| `TagRepository` | 태그 조회/생성 |
| `MemberRepository` | 작성자 조회 |
| `CommentRepository` | 댓글 수 조회 |
| `PostLikeRepository` | 추천 수 조회 |
| `FileStorage` | 이미지 저장 |
| `FileValidator` | 이미지 검증 |

## 15. 게시글 작성 흐름

```java
@Transactional
public PostDetailResponse create(String email, PostCreateRequest request) {
    val member = member(email);
    validateTitle(request.title());
    validatePostType(member, type(request.postType()));
    fileValidator.optionalImage(request.image());
    val image = request.image() == null || request.image().isEmpty() ? null : fileStorage.store(request.image(), "posts").url();
    val post = postRepository.save(new Post(member, request.title(), request.content(), type(request.postType()), image, request.canonicalUrl(), visible(request.isPublic())));
    saveTags(post, request.tags());
    return detail(post);
}
```

### 15.1 `@Transactional`

게시글 작성은 여러 DB 작업이 한 번에 일어난다.

- 작성자 조회
- 게시글 저장
- 태그 조회 또는 생성
- 게시글-태그 연결 저장

중간에 실패하면 전체가 같이 실패해야 한다.

그래서 `@Transactional`을 붙인다.

연결할 개념:

- [[Transaction]]

### 15.2 로그인 사용자 찾기

```java
val member = member(email);
```

Controller에서 `auth.getName()`으로 email을 넘긴다.

그 email로 회원을 찾는다.

흐름:

```text
Authentication auth
-> auth.getName()
-> email
-> memberRepository.findByEmail(email)
-> Member member
```

### 15.3 제목 검증

```java
validateTitle(request.title());
```

제목이 비어 있거나 26자를 넘으면 예외를 던진다.

```java
private void validateTitle(String title) {
    if (title == null || title.isBlank() || title.length() > 26) {
        throw new BusinessException(ErrorCode.INVALID_INPUT);
    }
}
```

### 15.4 공지/FAQ 권한 검증

```java
validatePostType(member, type(request.postType()));
```

공지와 FAQ는 관리자만 작성할 수 있다.

```java
private void validatePostType(Member member, PostType type) {
    if ((type == PostType.NOTICE || type == PostType.FAQ) && !member.isAdmin()) {
        throw new BusinessException(ErrorCode.FORBIDDEN);
    }
}
```

흐름:

```text
request.postType()
-> NOTICE 또는 FAQ인지 확인
-> member.isAdmin() 확인
-> 관리자가 아니면 FORBIDDEN
```

### 15.5 이미지 검증과 저장

```java
fileValidator.optionalImage(request.image());
```

이미지가 있으면 이미지가 허용 가능한 파일인지 검사한다.

```java
val image = request.image() == null || request.image().isEmpty()
    ? null
    : fileStorage.store(request.image(), "posts").url();
```

이미지가 없으면 `null`.

이미지가 있으면 `posts` 폴더에 저장하고 URL을 얻는다.

### 15.6 게시글 저장

```java
val post = postRepository.save(
    new Post(member, request.title(), request.content(), type(request.postType()), image, request.canonicalUrl(), visible(request.isPublic()))
);
```

흐름:

```text
request.title()
-> Post.title
-> posts.title

request.content()
-> Post.content
-> posts.content

request.postType()
-> Post.postType
-> posts.post_type

image
-> Post.imageUrl
-> posts.image_url
```

### 15.7 태그 저장

```java
saveTags(post, request.tags());
```

태그 문자열은 쉼표로 들어온다.

예:

```text
spring, react, jpa
```

처리 흐름:

```text
"spring, react, jpa"
-> split(",")
-> trim()
-> 빈 값 제거
-> 중복 제거
-> 최대 10개 제한
-> Tag 조회 또는 생성
-> PostTag 저장
```

### 15.8 응답 만들기

```java
return detail(post);
```

`detail(post)`는 게시글 Entity를 상세 응답 DTO로 바꾼다.

## 16. 게시글 수정 흐름

```java
@Transactional
public PostDetailResponse update(String email, Long id, PostUpdateRequest request) {
    val post = post(id);
    val member = member(email);
    validateTitle(request.title());
    validateOwnerOrAdmin(member, post);
    validatePostType(member, type(request.postType()));
    fileValidator.optionalImage(request.image());
    val image = request.image() == null || request.image().isEmpty() ? post.getImageUrl() : fileStorage.store(request.image(), "posts").url();
    post.update(request.title(), request.content(), type(request.postType()), image, request.canonicalUrl(), visible(request.isPublic()));
    postTagRepository.deleteByPost(post);
    postTagRepository.flush();
    saveTags(post, request.tags());
    return detail(post);
}
```

수정은 작성보다 확인할 것이 더 많다.

1. 수정할 게시글이 존재하는지 확인
2. 로그인 사용자를 찾음
3. 제목 검증
4. 작성자 본인 또는 관리자인지 확인
5. 공지/FAQ 권한 확인
6. 이미지 검증
7. 새 이미지가 있으면 저장
8. 게시글 필드 수정
9. 기존 태그 삭제
10. 삭제 쿼리 먼저 반영
11. 새 태그 저장
12. 상세 응답 반환

`post.update(...)`만 호출해도 DB에 수정이 반영되는 이유는 `@Transactional` 안에서 JPA가 Entity 변경을 감지하기 때문이다.

연결할 개념:

- [[Dirty Checking]]
- [[Persistence Context]]
- [[Transaction]]

## 17. `flush()`가 필요한 이유

수정할 때 태그를 바꾸는 코드는 아래 순서다.

```java
postTagRepository.deleteByPost(post);
postTagRepository.flush();
saveTags(post, request.tags());
```

`post_tags` 테이블에는 아래 제약이 있다.

```sql
unique(post_id, tag_id)
```

같은 게시글에 같은 태그를 두 번 넣을 수 없다는 뜻이다.

문제 상황:

```text
기존 태그: spring
수정 후 태그: spring
```

코드에서는 기존 태그를 삭제하고 새 태그를 저장한다.

하지만 JPA가 삭제 SQL을 DB에 바로 보내지 않고 있다가, insert를 먼저 처리하면 DB 입장에서는 아직 기존 row가 남아 있다고 볼 수 있다.

그러면 같은 `(post_id, tag_id)`를 다시 insert하려고 해서 unique 제약 조건 오류가 난다.

그래서 `flush()`로 삭제를 먼저 DB에 반영한다.

```text
deleteByPost(post)
-> flush()
-> DB에서 기존 post_tags 삭제 반영
-> saveTags(...)
-> 새 post_tags insert
```

## 18. 게시글 삭제 흐름

```java
@Transactional
public void delete(String email, Long id) {
    val post = post(id);
    validateOwnerOrAdmin(member(email), post);
    post.softDelete();
}
```

이 프로젝트는 게시글을 실제로 DB에서 바로 지우지 않는다.

`softDelete()`를 호출해서 `deletedAt` 값을 채운다.

그래서 조회할 때는 항상 삭제되지 않은 글만 가져와야 한다.

```java
findByIdAndDeletedAtIsNull(id)
```

연결할 개념:

- [[Soft Delete]]

## 19. 게시글 상세 조회 흐름

```java
@Transactional
public PostDetailResponse find(Long id) {
    val post = post(id);
    post.increaseView();
    return detail(post);
}
```

상세 조회를 하면 조회수가 1 증가한다.

흐름:

```text
GET /api/posts/1
-> post(1)
-> postRepository.findByIdAndDeletedAtIsNull(1)
-> post.increaseView()
-> PostDetailResponse 반환
```

`increaseView()`는 Entity 메서드다.

```java
public void increaseView() {
    viewCount++;
}
```

## 20. 게시글 목록 조회 흐름

```java
@Transactional(readOnly = true)
public PageResponse<PostListResponse> list(String keyword, PostType type, String tag, int page, int size) {
    val result = postRepository.search(text(keyword), type, text(tag), PageRequestFactory.create(page, size));
    return PageResponse.from(result.map(this::summary));
}
```

목록 조회는 DB 값을 바꾸지 않는다.

그래서 `@Transactional(readOnly = true)`를 사용한다.

흐름:

```text
GET /api/posts?keyword=spring&type=GENERAL&page=1&size=10
-> PostController.list(...)
-> PostService.list(...)
-> postRepository.search(...)
-> Page<Post>
-> PageResponse<PostListResponse>
```

## 21. Controller 만들기

파일:

`backend/src/main/java/com/example/board/post/PostController.java`

```java
@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {
    private final PostService postService;
}
```

### 21.1 `@RestController`

이 클래스가 REST API Controller라는 뜻이다.

메서드가 반환하는 객체는 JSON 응답으로 변환된다.

### 21.2 `@RequestMapping("/api/posts")`

이 Controller의 기본 주소를 지정한다.

아래 메서드들은 모두 `/api/posts`로 시작한다.

```text
POST   /api/posts
GET    /api/posts
GET    /api/posts/{id}
PUT    /api/posts/{id}
DELETE /api/posts/{id}
```

### 21.3 `@RequiredArgsConstructor`

`private final PostService postService;`를 생성자로 주입받기 위해 사용한다.

Spring이 `PostService` Bean을 찾아서 Controller에 넣어준다.

연결할 개념:

- [[DI]]
- [[Bean]]

## 22. 어떤 기능에 어떤 Mapping을 쓰는가

### 22.1 새로 만들기: `@PostMapping`

게시글을 새로 만들 때는 `POST`를 사용한다.

```java
@PostMapping
public ApiResponse<PostDetailResponse> create(Authentication auth, @Valid @ModelAttribute PostCreateRequest request) {
    return ApiResponse.success(postService.create(auth.getName(), request));
}
```

주소:

```text
POST /api/posts
```

사용 상황:

```text
새 게시글 등록
```

### 22.2 하나 보여주기: `@GetMapping("/{id}")`

게시글 상세를 보여줄 때는 `GET`을 사용한다.

```java
@GetMapping("/{id}")
public ApiResponse<PostDetailResponse> detail(@PathVariable Long id) {
    return ApiResponse.success(postService.find(id));
}
```

주소:

```text
GET /api/posts/1
```

값 전달 흐름:

```text
/api/posts/1
-> @PathVariable Long id
-> postService.find(id)
-> postRepository.findByIdAndDeletedAtIsNull(id)
```

### 22.3 목록 보여주기: `@GetMapping`

게시글 목록을 보여줄 때도 `GET`을 사용한다.

```java
@GetMapping
public ApiResponse<PageResponse<PostListResponse>> list(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) PostType type,
        @RequestParam(required = false) String tag,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "10") int size
) {
    return ApiResponse.success(postService.list(keyword, type, tag, page, size));
}
```

주소 예:

```text
GET /api/posts?keyword=spring&type=GENERAL&page=1&size=10
```

`@RequestParam`은 query string 값을 받을 때 사용한다.

값 전달 흐름:

```text
?keyword=spring
-> @RequestParam String keyword
-> postService.list(keyword, ...)
-> postRepository.search(keyword, ...)
```

### 22.4 수정하기: `@PutMapping("/{id}")`

게시글을 수정할 때는 `PUT`을 사용한다.

```java
@PutMapping("/{id}")
public ApiResponse<PostDetailResponse> update(Authentication auth, @PathVariable Long id, @Valid @ModelAttribute PostUpdateRequest request) {
    return ApiResponse.success(postService.update(auth.getName(), id, request));
}
```

주소:

```text
PUT /api/posts/1
```

값 전달 흐름:

```text
/api/posts/1
-> @PathVariable Long id

FormData.title
-> @ModelAttribute PostUpdateRequest request

auth.getName()
-> 로그인 사용자 email

id + email + request
-> postService.update(email, id, request)
```

### 22.5 삭제하기: `@DeleteMapping("/{id}")`

게시글을 삭제할 때는 `DELETE`를 사용한다.

```java
@DeleteMapping("/{id}")
public ApiResponse<Void> delete(Authentication auth, @PathVariable Long id) {
    postService.delete(auth.getName(), id);
    return ApiResponse.success(null);
}
```

주소:

```text
DELETE /api/posts/1
```

## 23. Controller에서 자주 쓰는 어노테이션

| 어노테이션 | 사용 위치 | 의미 |
| --- | --- | --- |
| `@RestController` | 클래스 | JSON API Controller |
| `@RequestMapping` | 클래스 | 공통 URL 지정 |
| `@PostMapping` | 메서드 | 생성 요청 |
| `@GetMapping` | 메서드 | 조회 요청 |
| `@PutMapping` | 메서드 | 수정 요청 |
| `@DeleteMapping` | 메서드 | 삭제 요청 |
| `@PathVariable` | 파라미터 | URL 경로 값 받기 |
| `@RequestParam` | 파라미터 | query string 값 받기 |
| `@ModelAttribute` | 파라미터 | form 데이터 받기 |
| `@Valid` | 파라미터 | DTO 검증 실행 |

## 24. 프론트와 연결되는 이름

프론트의 `FormData` 이름과 백엔드 DTO 필드 이름은 맞아야 한다.

프론트:

```ts
const form = new FormData();
form.set("title", title);
form.set("content", body);
form.set("postType", postType);
form.set("tags", tags);
form.set("isPublic", String(isPublic));
if (canonicalUrl) form.set("canonicalUrl", canonicalUrl);
if (image) form.set("image", image);
```

백엔드:

```java
public record PostCreateRequest(
        String title,
        String content,
        PostType postType,
        String tags,
        String canonicalUrl,
        Boolean isPublic,
        MultipartFile image
) {
}
```

연결 관계:

```text
FormData "title"
-> PostCreateRequest.title()

FormData "content"
-> PostCreateRequest.content()

FormData "postType"
-> PostCreateRequest.postType()

FormData "tags"
-> PostCreateRequest.tags()

FormData "image"
-> PostCreateRequest.image()
```

이 이름이 다르면 백엔드 DTO에 값이 제대로 들어오지 않는다.

## 25. Post 도메인 요청 전체 흐름

### 25.1 게시글 작성

```text
사용자가 글쓰기 화면에서 입력
-> PostFormPage.tsx
-> FormData 생성
-> api.createPost(form)
-> POST /api/posts
-> PostController.create()
-> PostService.create()
-> memberRepository.findByEmail(email)
-> fileValidator.optionalImage()
-> fileStorage.store()
-> postRepository.save(new Post(...))
-> saveTags()
-> PostDetailResponse
-> 프론트 상세 페이지로 이동
```

### 25.2 게시글 상세 조회

```text
사용자가 게시글 클릭
-> GET /api/posts/{id}
-> PostController.detail()
-> PostService.find()
-> postRepository.findByIdAndDeletedAtIsNull(id)
-> post.increaseView()
-> PostDetailResponse
-> PostDetailPage.tsx 렌더링
```

### 25.3 게시글 수정

```text
사용자가 수정 화면에서 저장
-> PUT /api/posts/{id}
-> PostController.update()
-> PostService.update()
-> post(id)
-> member(email)
-> validateOwnerOrAdmin()
-> validatePostType()
-> post.update()
-> postTagRepository.deleteByPost()
-> postTagRepository.flush()
-> saveTags()
-> PostDetailResponse
```

### 25.4 게시글 삭제

```text
사용자가 삭제 버튼 클릭
-> DELETE /api/posts/{id}
-> PostController.delete()
-> PostService.delete()
-> post(id)
-> validateOwnerOrAdmin()
-> post.softDelete()
-> deleted_at 값 저장
```

## 26. 처음 직접 만들 때 체크리스트

### 26.1 Entity 체크

- `@Entity`를 붙였는가
- `@Table(name = "posts")`를 붙였는가
- `@Id`가 있는가
- `@GeneratedValue`가 있는가
- `Member author` 관계를 만들었는가
- `@ManyToOne`을 붙였는가
- `@JoinColumn(name = "member_id")`가 있는가
- enum 필드에 `@Enumerated(EnumType.STRING)`을 붙였는가
- JPA용 기본 생성자가 있는가
- 필드를 직접 바꾸는 setter 대신 의미 있는 메서드를 만들었는가

### 26.2 Repository 체크

- `JpaRepository<Post, Long>`을 상속했는가
- 삭제되지 않은 게시글 조회 메서드가 있는가
- 목록 검색이 필요하면 `@Query`를 만들었는가
- 페이징이 필요하면 `Page<Post>`와 `Pageable`을 사용했는가

### 26.3 DTO 체크

- 작성 요청 DTO를 만들었는가
- 수정 요청 DTO를 만들었는가
- 목록 응답 DTO를 만들었는가
- 상세 응답 DTO를 만들었는가
- Entity를 그대로 응답하지 않는가
- `@NotBlank`, `@Size` 같은 검증을 붙였는가

### 26.4 Service 체크

- `@Service`를 붙였는가
- DB 변경 메서드에 `@Transactional`을 붙였는가
- 조회 전용 목록 메서드에 `@Transactional(readOnly = true)`를 붙였는가
- 작성자 조회를 했는가
- 제목 검증을 했는가
- 공지/FAQ 권한 검증을 했는가
- 작성자 또는 관리자만 수정/삭제 가능하게 했는가
- 태그 저장 흐름을 만들었는가
- 태그 수정 시 기존 태그 삭제 후 저장하는가

### 26.5 Controller 체크

- `@RestController`를 붙였는가
- 공통 경로 `@RequestMapping("/api/posts")`를 붙였는가
- 생성은 `@PostMapping`인가
- 상세 조회는 `@GetMapping("/{id}")`인가
- 목록 조회는 `@GetMapping`인가
- 수정은 `@PutMapping("/{id}")`인가
- 삭제는 `@DeleteMapping("/{id}")`인가
- URL의 id는 `@PathVariable`로 받는가
- 검색 조건은 `@RequestParam`으로 받는가
- 파일 포함 form 요청은 `@ModelAttribute`로 받는가
- DTO 검증을 위해 `@Valid`를 붙였는가

## 27. 디버깅할 때 확인 순서

게시글 작성이 안 된다면 아래 순서로 좁힌다.

1. 브라우저 Network에서 `POST /api/posts` 요청이 나갔는지 확인
2. 요청 payload에 `title`, `content`, `postType`, `tags`가 있는지 확인
3. 응답 status가 200, 400, 401, 403, 500 중 무엇인지 확인
4. 401이면 로그인 토큰 문제 확인
5. 403이면 관리자 권한 또는 작성자 권한 확인
6. 400이면 DTO 검증 실패 가능성 확인
7. 500이면 서버 로그 확인
8. 서버 로그에서 SQL 오류 확인
9. DB에서 `posts`, `tags`, `post_tags` row 확인

수정이 안 된다면 추가로 확인한다.

1. `PUT /api/posts/{id}` 요청인지 확인
2. `{id}`가 실제 게시글 id인지 확인
3. 로그인 사용자가 작성자 또는 관리자인지 확인
4. 공지/FAQ 수정이면 관리자 role인지 확인
5. 태그 수정이면 `post_tags` unique 제약 오류가 있는지 확인

## 28. 면접/프로젝트 설명 키워드

- 게시글 도메인은 `Controller -> Service -> Repository -> DB` 흐름으로 구현
- Entity와 DTO를 분리
- 게시글 작성/수정은 `FormData`와 `@ModelAttribute` 사용
- 이미지 업로드는 `MultipartFile` 사용
- 게시글 타입은 `enum`으로 제한
- 공지/FAQ는 관리자 권한 검증
- 삭제는 soft delete 방식
- 목록 조회는 JPQL과 Pageable 사용
- 태그는 `PostTag` 중간 Entity로 연결
- 태그 수정 시 unique 제약 때문에 삭제 후 `flush()` 필요

## 29. 직접 다시 구현할 때 연습 순서

1. `PostType` enum만 다시 작성한다.
2. `Post` Entity 필드만 먼저 작성한다.
3. `@Entity`, `@Table`, `@Id`, `@GeneratedValue`를 붙인다.
4. `Member author` 관계를 추가한다.
5. 생성자, `update()`, `increaseView()`를 추가한다.
6. `PostRepository`를 만든다.
7. `PostCreateRequest`, `PostUpdateRequest`를 만든다.
8. `PostDetailResponse`, `PostListResponse`를 만든다.
9. `PostService.create()`만 먼저 만든다.
10. `PostController.create()`만 먼저 연다.
11. 브라우저나 API 도구로 작성 요청을 확인한다.
12. 그 다음 상세 조회, 목록 조회, 수정, 삭제 순서로 확장한다.

## 30. 질문 / 확인 필요

- 기존 Obsidian 개념 파일 목록 확인 필요: `Entity`, `DTO`, `Repository`, `Service`, `Controller`, `Transaction`, `JPA` 문서가 이미 있는지 확인 필요
- `Post` 도메인 다음 학습 순서 확인 필요: `Auth/Member`를 먼저 볼지, `Comment`를 먼저 볼지 결정 필요
