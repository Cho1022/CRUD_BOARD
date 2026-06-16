---
type: concept
topic: Spring 게시판 Comment 도메인
status: draft
created: 2026-06-16
tags:
  - spring
  - board
  - comment
  - jpa
  - rest-api
---

# Comment 도메인 처음부터 구현하기

## 1. 다른 도메인에도 적용할 공통 구현 패턴

Spring 게시판에서 하나의 도메인을 만들 때는 아래 순서로 생각하면 된다.

```text
DB 테이블 구조 확인
-> Entity 작성
-> Repository 작성
-> Request DTO 작성
-> Response DTO 작성
-> Service 비즈니스 로직 작성
-> Controller API 작성
-> Front/API 요청 연결
-> Network / 서버 로그 / DB row 확인
```

`Comment` 도메인에 적용하면 아래와 같다.

```text
comments 테이블 확인
-> Comment Entity 작성
-> CommentRepository 작성
-> CommentCreateRequest 작성
-> CommentResponse 작성
-> CommentService 작성
-> CommentController 작성
-> api.comments(), api.createComment() 연결
-> 브라우저 Network / 서버 로그 / comments row 확인
```

이 순서는 `Post`, `Comment`, `Like`, `Tag`, `Member` 같은 다른 도메인에도 반복해서 적용할 수 있다.

## 2. Comment 도메인에서 만들고자 한 것

`Comment` 도메인에서 만들고자 한 것은 **게시글에 달리는 댓글 기능**이다.

이 프로젝트의 댓글 기능은 아래 역할을 가진다.

- 게시글에 댓글 작성
- 게시글의 댓글 목록 조회
- 댓글 삭제
- 댓글 채택
- 게시글 목록/상세에서 댓글 수 제공

댓글은 혼자 존재하지 않는다.

댓글은 항상 아래 두 대상과 연결된다.

- 어떤 게시글에 달린 댓글인가: `Post`
- 누가 작성한 댓글인가: `Member`

그래서 `Comment` Entity에는 `Post`와 `Member` 관계가 모두 들어간다.

## 3. DB 테이블 구조 확인

댓글 테이블은 `comments`다.

```sql
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
```

각 컬럼의 의미는 아래와 같다.

| 컬럼 | 의미 |
| --- | --- |
| `id` | 댓글 PK |
| `post_id` | 댓글이 달린 게시글 ID |
| `member_id` | 댓글 작성자 회원 ID |
| `content` | 댓글 내용 |
| `accepted` | 채택 여부 |
| `created_at` | 생성 시간 |
| `updated_at` | 수정 시간 |
| `deleted_at` | 소프트 삭제 시간 |

DB 컬럼과 Java 필드의 연결은 아래와 같다.

```text
comments.id
-> Comment.id

comments.post_id
-> Comment.post

comments.member_id
-> Comment.author

comments.content
-> Comment.content

comments.accepted
-> Comment.accepted

comments.created_at / updated_at / deleted_at
-> BaseEntity
```

## 4. 전체 구현 순서

처음부터 만든다고 생각하면 순서는 아래가 좋다.

1. `comments` 테이블 구조를 확인한다.
2. `Comment` Entity를 만든다.
3. `CommentRepository`를 만든다.
4. 댓글 작성 요청 DTO `CommentCreateRequest`를 만든다.
5. 댓글 응답 DTO `CommentResponse`를 만든다.
6. `CommentService`에서 작성, 목록 조회, 삭제, 채택 로직을 만든다.
7. `CommentController`에서 HTTP API를 연다.
8. 프론트 `api.ts`에서 댓글 API 함수를 만든다.
9. `PostDetailPage.tsx`에서 댓글 목록과 댓글 작성 UI를 연결한다.
10. Network, 서버 로그, DB row로 동작을 확인한다.

## 5. `Comment.java` 만들기

파일:

`backend/src/main/java/com/example/board/comment/Comment.java`

현재 완성된 코드는 아래와 같다.

```java
package com.example.board.comment;

import com.example.board.common.BaseEntity;
import com.example.board.member.Member;
import com.example.board.post.Post;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "comments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Comment extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member author;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    @Column(nullable = false)
    private boolean accepted;

    public Comment(Post post, Member author, String content) {
        this.post = post;
        this.author = author;
        this.content = content;
    }

    public void accept() {
        accepted = true;
    }
}
```

## 6. `Comment.java`를 줄 단위로 이해하기

### 6.1 `package`

```java
package com.example.board.comment;
```

이 파일이 `comment` 도메인에 속한다는 뜻이다.

댓글과 직접 관련된 코드는 `comment` 패키지에 둔다.

### 6.2 `import`

```java
import com.example.board.common.BaseEntity;
import com.example.board.member.Member;
import com.example.board.post.Post;
```

`Comment`는 공통 시간 필드가 필요해서 `BaseEntity`를 상속한다.

댓글은 작성자가 필요하므로 `Member`를 참조한다.

댓글은 게시글에 달리므로 `Post`를 참조한다.

```java
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
```

이 import들은 JPA Entity를 DB 테이블과 연결하기 위해 사용한다.

```java
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
```

반복 코드를 줄이기 위해 Lombok을 사용한다.

## 7. Entity 어노테이션 이해하기

### 7.1 `@Getter`

```java
@Getter
```

모든 필드의 getter를 자동으로 만든다.

`CommentResponse`에서 아래처럼 getter를 사용한다.

```java
comment.getId()
comment.getContent()
comment.getAuthor().getNickname()
comment.isAccepted()
comment.getCreatedAt()
```

그래서 `Comment`에는 `@Getter`가 필요하다.

### 7.2 `@Entity`

```java
@Entity
```

`Comment` 클래스가 JPA Entity라는 뜻이다.

즉 Java 객체인 `Comment`를 DB의 `comments` 테이블 row와 연결한다.

연결 관계:

```text
Comment 객체
-> JPA Entity
-> comments 테이블 row
```

### 7.3 `@Table(name = "comments")`

```java
@Table(name = "comments")
```

이 Entity가 DB의 `comments` 테이블과 연결된다는 뜻이다.

```text
Comment.java
-> @Table(name = "comments")
-> comments 테이블
```

### 7.4 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`

```java
@NoArgsConstructor(access = AccessLevel.PROTECTED)
```

JPA는 Entity를 만들 때 기본 생성자가 필요하다.

하지만 아무 곳에서나 `new Comment()`로 빈 댓글을 만들면 좋지 않다.

그래서 JPA가 사용할 수 있도록 `protected` 기본 생성자를 만든다.

Lombok이 아래 코드를 대신 만들어주는 것과 같다.

```java
protected Comment() {
}
```

## 8. 필드와 DB 컬럼 연결

### 8.1 댓글 ID

```java
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;
```

`id`는 댓글의 기본키다.

DB의 `comments.id`와 연결된다.

`@GeneratedValue(strategy = GenerationType.IDENTITY)`는 DB가 id를 자동 생성한다는 뜻이다.

저장 흐름:

```text
commentRepository.save(new Comment(...))
-> insert into comments (...)
-> DB가 id 생성
-> Comment.id에 반영
```

### 8.2 게시글 관계

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "post_id", nullable = false)
private Post post;
```

댓글 여러 개는 게시글 하나에 달릴 수 있다.

그래서 댓글과 게시글은 다대일 관계다.

```text
Post 1개
-> Comment 여러 개
```

이럴 때 `@ManyToOne`을 쓴다.

`@JoinColumn(name = "post_id")`는 `comments.post_id`로 `posts.id`와 연결한다는 뜻이다.

값 전달 흐름:

```text
URL의 /posts/{postId}/comments
-> @PathVariable Long postId
-> postRepository.findByIdAndDeletedAtIsNull(postId)
-> Post post
-> new Comment(post, ...)
-> comments.post_id에 post.id 저장
```

### 8.3 작성자 관계

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "member_id", nullable = false)
private Member author;
```

댓글 여러 개는 회원 한 명이 작성할 수 있다.

그래서 댓글과 회원도 다대일 관계다.

```text
Member 1명
-> Comment 여러 개
```

`@JoinColumn(name = "member_id")`는 `comments.member_id`로 `members.id`와 연결한다는 뜻이다.

값 전달 흐름:

```text
로그인 사용자 email
-> Authentication auth
-> auth.getName()
-> memberRepository.findByEmail(email)
-> Member member
-> new Comment(..., member, ...)
-> comments.member_id에 member.id 저장
```

### 8.4 댓글 내용

```java
@Column(nullable = false, columnDefinition = "TEXT")
private String content;
```

댓글 내용이다.

`nullable = false`는 null을 허용하지 않는다는 뜻이다.

`columnDefinition = "TEXT"`는 DB에서 긴 텍스트 타입으로 저장한다는 뜻이다.

DB와 연결하면 아래와 같다.

```text
Comment.content
-> comments.content text not null
```

### 8.5 채택 여부

```java
@Column(nullable = false)
private boolean accepted;
```

댓글이 채택되었는지 나타낸다.

기본값은 Java boolean 기본값인 `false`다.

채택되면 아래 메서드를 통해 `true`가 된다.

```java
public void accept() {
    accepted = true;
}
```

## 9. 생성자와 도메인 메서드

### 9.1 댓글 생성자

```java
public Comment(Post post, Member author, String content) {
    this.post = post;
    this.author = author;
    this.content = content;
}
```

댓글을 만들 때 필요한 값은 세 가지다.

- 어떤 게시글에 달리는지: `Post post`
- 누가 작성하는지: `Member author`
- 댓글 내용: `String content`

댓글을 처음 만들 때 `accepted`는 넣지 않는다.

처음 댓글은 채택되지 않은 상태이므로 기본값 `false`로 둔다.

### 9.2 댓글 채택 메서드

```java
public void accept() {
    accepted = true;
}
```

댓글 채택은 단순히 필드를 바꾸는 작업이지만, `setAccepted(true)` 같은 setter를 만들지 않았다.

대신 `accept()`라는 의미 있는 메서드로 표현했다.

이렇게 하면 코드를 읽을 때 “이 댓글을 채택하는구나”라고 이해하기 쉽다.

## 10. Repository 만들기

파일:

`backend/src/main/java/com/example/board/comment/CommentRepository.java`

```java
package com.example.board.comment;

import com.example.board.post.Post;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    long countByPostAndDeletedAtIsNull(Post post);

    List<Comment> findByPostAndDeletedAtIsNullOrderByIdAsc(Post post);
}
```

`JpaRepository<Comment, Long>`의 의미는 아래와 같다.

```text
Comment Entity를 대상으로
id 타입은 Long이고
기본 CRUD 기능을 제공받는다
```

기본으로 사용할 수 있는 메서드:

- `save(comment)`
- `findById(id)`
- `findAll()`
- `delete(comment)`

현재 프로젝트에서는 댓글 삭제를 소프트 삭제로 처리하므로, 삭제되지 않은 댓글만 세거나 조회하는 메서드가 필요하다.

## 11. Repository 메서드 이해하기

### 11.1 댓글 수 세기

```java
long countByPostAndDeletedAtIsNull(Post post);
```

의미:

```text
특정 게시글에 달린 댓글 중
deletedAt이 null인 댓글 개수를 센다
```

SQL 의미:

```sql
select count(*)
from comments
where post_id = ?
and deleted_at is null;
```

이 메서드는 `PostService`에서도 사용된다.

게시글 목록이나 상세 응답에 댓글 수를 넣기 위해서다.

```java
commentRepository.countByPostAndDeletedAtIsNull(post)
```

즉 `Comment` 도메인은 `Post` 도메인의 응답에도 영향을 준다.

### 11.2 댓글 목록 조회

```java
List<Comment> findByPostAndDeletedAtIsNullOrderByIdAsc(Post post);
```

의미:

```text
특정 게시글에 달린 댓글 중
deletedAt이 null인 댓글을
id 오름차순으로 조회한다
```

SQL 의미:

```sql
select *
from comments
where post_id = ?
and deleted_at is null
order by id asc;
```

메서드 이름을 길게 쓰는 이유는 Spring Data JPA가 메서드 이름을 분석해서 쿼리를 만들기 때문이다.

## 12. Request DTO 만들기

파일:

`backend/src/main/java/com/example/board/comment/dto/CommentCreateRequest.java`

```java
package com.example.board.comment.dto;

import jakarta.validation.constraints.NotBlank;

public record CommentCreateRequest(@NotBlank(message = "댓글을 입력해주세요.") String content) {
}
```

댓글 작성 요청에서 필요한 값은 댓글 내용 하나다.

그래서 DTO도 단순하다.

```text
프론트 댓글 입력값
-> JSON body { "content": "댓글 내용" }
-> CommentCreateRequest.content()
```

`@NotBlank`는 빈 댓글을 막기 위해 사용한다.

댓글은 이미지 파일을 받지 않기 때문에 `MultipartFile`이 필요 없다.

그래서 `PostCreateRequest`와 다르게 Controller에서 `@RequestBody`를 사용한다.

## 13. Response DTO 만들기

파일:

`backend/src/main/java/com/example/board/comment/dto/CommentResponse.java`

```java
package com.example.board.comment.dto;

import com.example.board.comment.Comment;
import java.time.LocalDateTime;

public record CommentResponse(Long id, String content, String authorNickname, boolean accepted, LocalDateTime createdAt) {
    public static CommentResponse from(Comment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getContent(),
                comment.getAuthor().getNickname(),
                comment.isAccepted(),
                comment.getCreatedAt()
        );
    }
}
```

응답에 포함되는 값:

| 필드 | 의미 |
| --- | --- |
| `id` | 댓글 ID |
| `content` | 댓글 내용 |
| `authorNickname` | 작성자 닉네임 |
| `accepted` | 채택 여부 |
| `createdAt` | 작성 시간 |

`from(Comment comment)`는 Entity를 응답 DTO로 바꾸는 정적 메서드다.

흐름:

```text
Comment Entity
-> CommentResponse.from(comment)
-> CommentResponse
-> JSON 응답
```

Entity를 그대로 응답하지 않고 DTO로 바꾸는 이유:

- 프론트에 필요한 값만 보낼 수 있음
- `Member` 전체를 보내지 않고 `authorNickname`만 보낼 수 있음
- Entity 내부 구조를 API 응답과 분리할 수 있음

## 14. Service 만들기

파일:

`backend/src/main/java/com/example/board/comment/CommentService.java`

```java
@Service
@RequiredArgsConstructor
public class CommentService {
    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final MemberRepository memberRepository;
}
```

`CommentService`는 댓글 관련 비즈니스 로직을 처리한다.

필요한 의존성은 세 개다.

| 의존성 | 역할 |
| --- | --- |
| `CommentRepository` | 댓글 저장, 조회 |
| `PostRepository` | 댓글이 달릴 게시글 조회 |
| `MemberRepository` | 댓글 작성자 조회 |

`@Service`는 이 클래스가 서비스 계층이라는 뜻이다.

`@RequiredArgsConstructor`는 `final` 필드를 받는 생성자를 Lombok이 만들어준다는 뜻이다.

Spring은 이 생성자를 통해 Repository들을 주입한다.

## 15. 댓글 작성 흐름

```java
@Transactional
public CommentResponse create(String email, Long postId, CommentCreateRequest request) {
    val comment = new Comment(post(postId), member(email), request.content());
    return CommentResponse.from(commentRepository.save(comment));
}
```

댓글 작성은 DB에 새 row를 추가하므로 `@Transactional`을 사용한다.

값 전달 흐름:

```text
프론트 댓글 입력값
-> api.createComment(post.id, comment)
-> POST /api/posts/{postId}/comments
-> CommentController.create()
-> CommentService.create(email, postId, request)
-> post(postId)
-> member(email)
-> new Comment(post, member, request.content())
-> commentRepository.save(comment)
-> comments row 생성
-> CommentResponse 반환
```

작성에서 중요한 값은 세 개다.

```text
postId
-> 어떤 게시글에 댓글을 달지 결정

email
-> 누가 댓글을 작성하는지 결정

request.content()
-> 댓글 내용
```

## 16. 댓글 목록 조회 흐름

```java
@Transactional(readOnly = true)
public List<CommentResponse> list(Long postId) {
    return commentRepository.findByPostAndDeletedAtIsNullOrderByIdAsc(post(postId))
            .stream()
            .map(CommentResponse::from)
            .toList();
}
```

댓글 목록 조회는 DB 값을 변경하지 않는다.

그래서 `@Transactional(readOnly = true)`를 사용한다.

값 전달 흐름:

```text
GET /api/posts/{postId}/comments
-> CommentController.list(postId)
-> CommentService.list(postId)
-> post(postId)
-> commentRepository.findByPostAndDeletedAtIsNullOrderByIdAsc(post)
-> List<Comment>
-> CommentResponse::from
-> List<CommentResponse>
```

## 17. 댓글 삭제 흐름

```java
@Transactional
public void delete(String email, Long id) {
    val comment = commentRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    validateOwnerOrAdmin(member(email), comment);
    comment.softDelete();
}
```

댓글 삭제는 실제 DB row를 바로 삭제하지 않는다.

`softDelete()`를 호출해서 `deletedAt` 값을 채운다.

삭제 권한은 댓글 작성자 또는 관리자에게 있다.

흐름:

```text
DELETE /api/comments/{id}
-> CommentController.delete()
-> CommentService.delete(email, id)
-> commentRepository.findById(id)
-> memberRepository.findByEmail(email)
-> validateOwnerOrAdmin(member, comment)
-> comment.softDelete()
-> deleted_at 값 저장
```

주의할 점:

현재 `delete()`에서는 `commentRepository.findById(id)`를 사용한다.

삭제된 댓글까지 조회될 수 있으므로, 이미 삭제된 댓글을 다시 삭제하는 상황은 추가 확인이 필요하다.

확인 필요: 현재 코드에서 이미 삭제된 댓글 재삭제 요청을 어떻게 처리할지 정책 확인 필요.

## 18. 댓글 채택 흐름

```java
@Transactional
public CommentResponse accept(String email, Long id) {
    val comment = commentRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    validatePostOwnerOrAdmin(member(email), comment.getPost());
    comment.accept();
    comment.getPost().acceptComment(comment.getId());
    return CommentResponse.from(comment);
}
```

댓글 채택은 댓글 작성자가 아니라 게시글 작성자 또는 관리자만 할 수 있다.

검증 기준:

```java
validatePostOwnerOrAdmin(member(email), comment.getPost());
```

즉 댓글의 작성자가 아니라, 댓글이 달린 게시글의 작성자를 기준으로 권한을 확인한다.

채택 시 두 가지 값이 바뀐다.

```text
comment.accept()
-> comments.accepted = true

comment.getPost().acceptComment(comment.getId())
-> posts.accepted_comment_id = comment.id
```

흐름:

```text
PATCH /api/comments/{id}/accept
-> CommentController.accept()
-> CommentService.accept(email, id)
-> commentRepository.findById(id)
-> memberRepository.findByEmail(email)
-> validatePostOwnerOrAdmin(member, comment.getPost())
-> comment.accept()
-> comment.getPost().acceptComment(comment.getId())
-> CommentResponse 반환
```

연결할 개념:

- [[Dirty Checking]]
- [[Transaction]]
- [[Persistence Context]]

## 19. Service 내부 검증 메서드

### 19.1 댓글 작성자 또는 관리자 검증

```java
private void validateOwnerOrAdmin(Member member, Comment comment) {
    if (!member.isAdmin() && !comment.getAuthor().getId().equals(member.getId())) {
        throw new BusinessException(ErrorCode.FORBIDDEN);
    }
}
```

사용 위치:

```java
delete()
```

의미:

```text
관리자면 허용
관리자가 아니면 댓글 작성자 본인만 허용
그 외에는 FORBIDDEN
```

### 19.2 게시글 작성자 또는 관리자 검증

```java
private void validatePostOwnerOrAdmin(Member member, Post post) {
    if (!member.isAdmin() && !post.getAuthor().getId().equals(member.getId())) {
        throw new BusinessException(ErrorCode.FORBIDDEN);
    }
}
```

사용 위치:

```java
accept()
```

의미:

```text
관리자면 허용
관리자가 아니면 게시글 작성자만 댓글 채택 허용
그 외에는 FORBIDDEN
```

## 20. Controller 만들기

파일:

`backend/src/main/java/com/example/board/comment/CommentController.java`

```java
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService commentService;
}
```

`@RestController`는 JSON API Controller라는 뜻이다.

`@RequestMapping("/api")`는 이 Controller의 공통 URL이 `/api`로 시작한다는 뜻이다.

`PostController`는 `/api/posts`를 공통 경로로 잡았지만, `CommentController`는 댓글 작성 URL과 댓글 삭제 URL의 시작이 다르기 때문에 `/api`까지만 공통으로 잡았다.

```text
/api/posts/{postId}/comments
/api/comments/{id}
```

## 21. 댓글 API Mapping 이해하기

### 21.1 댓글 작성: `@PostMapping`

```java
@PostMapping("/posts/{postId}/comments")
public ApiResponse<CommentResponse> create(
        Authentication auth,
        @PathVariable Long postId,
        @Valid @RequestBody CommentCreateRequest request
) {
    return ApiResponse.success(commentService.create(auth.getName(), postId, request));
}
```

주소:

```text
POST /api/posts/{postId}/comments
```

사용 상황:

```text
특정 게시글에 새 댓글 작성
```

값 전달 흐름:

```text
/api/posts/1/comments
-> @PathVariable Long postId = 1

JSON body { "content": "댓글 내용" }
-> @RequestBody CommentCreateRequest request

Authorization 토큰
-> Authentication auth
-> auth.getName()
-> email

email + postId + request
-> commentService.create(email, postId, request)
```

### 21.2 댓글 목록 조회: `@GetMapping`

```java
@GetMapping("/posts/{postId}/comments")
public ApiResponse<List<CommentResponse>> list(@PathVariable Long postId) {
    return ApiResponse.success(commentService.list(postId));
}
```

주소:

```text
GET /api/posts/{postId}/comments
```

사용 상황:

```text
특정 게시글의 댓글 목록 보여주기
```

### 21.3 댓글 삭제: `@DeleteMapping`

```java
@DeleteMapping("/comments/{id}")
public ApiResponse<Void> delete(Authentication auth, @PathVariable Long id) {
    commentService.delete(auth.getName(), id);
    return ApiResponse.success(null);
}
```

주소:

```text
DELETE /api/comments/{id}
```

사용 상황:

```text
댓글 삭제
```

### 21.4 댓글 채택: `@PatchMapping`

```java
@PatchMapping("/comments/{id}/accept")
public ApiResponse<CommentResponse> accept(Authentication auth, @PathVariable Long id) {
    return ApiResponse.success(commentService.accept(auth.getName(), id));
}
```

주소:

```text
PATCH /api/comments/{id}/accept
```

사용 상황:

```text
댓글 전체를 수정하는 것이 아니라
accepted 상태만 부분 변경
```

그래서 `PUT`이 아니라 `PATCH`를 사용한다.

## 22. `@RequestBody`를 쓰는 이유

댓글 작성 요청은 JSON으로 온다.

프론트 코드:

```ts
apiFetch<ApiResponse<CommentItem>>(
  `/posts/${postId}/comments`,
  { method: "POST", body: { content } }
)
```

`apiFetch()`는 일반 객체 body를 JSON 문자열로 바꾸고 `Content-Type: application/json`을 붙인다.

그래서 백엔드는 `@RequestBody`로 받는다.

```java
@RequestBody CommentCreateRequest request
```

`Post` 작성은 이미지 파일이 있어서 `FormData`와 `@ModelAttribute`를 사용했다.

`Comment` 작성은 파일이 없어서 JSON과 `@RequestBody`를 사용한다.

비교:

| 도메인 | 프론트 요청 | 백엔드 수신 |
| --- | --- | --- |
| `Post` | `FormData` | `@ModelAttribute` |
| `Comment` | JSON object | `@RequestBody` |

## 23. 프론트 API 연결

파일:

`front/src/lib/api.ts`

댓글 목록 조회:

```ts
comments: (postId: string | number) =>
  apiFetch<ApiResponse<CommentItem[]>>(`/posts/${postId}/comments`, { method: "GET" })
```

댓글 작성:

```ts
createComment: (postId: string | number, content: string) =>
  apiFetch<ApiResponse<CommentItem>>(`/posts/${postId}/comments`, {
    method: "POST",
    body: { content }
  })
```

프론트 타입:

```ts
export interface CommentItem {
  id: number;
  content: string;
  authorNickname: string;
  accepted: boolean;
  createdAt: string;
}
```

백엔드 응답 DTO와 프론트 타입은 같은 의미를 가진다.

```text
CommentResponse.id
-> CommentItem.id

CommentResponse.content
-> CommentItem.content

CommentResponse.authorNickname
-> CommentItem.authorNickname

CommentResponse.accepted
-> CommentItem.accepted

CommentResponse.createdAt
-> CommentItem.createdAt
```

## 24. 프론트 화면 연결

파일:

`front/src/pages/PostDetailPage.tsx`

댓글 상태:

```ts
const [comments, setComments] = useState<CommentItem[]>([]);
const [comment, setComment] = useState("");
const [commentError, setCommentError] = useState("");
```

댓글 목록 로딩:

```ts
async function loadComments(id: string) {
  try {
    const response = await api.comments(id);
    setComments(Array.isArray(response.data) ? response.data : []);
  } catch {
    setComments([]);
  }
}
```

댓글 작성:

```ts
async function submitComment() {
  if (!post || !comment.trim()) return;
  try {
    const response = await api.createComment(post.id, comment);
    setComments((current) => [...current, response.data]);
    setComment("");
    setCommentError("");
  } catch (error) {
    setCommentError(apiErrorMessage(error, "댓글 등록에 실패했습니다."));
  }
}
```

화면 출력:

```tsx
{comments.map((item) => (
  <div className="comment-item" key={item.id}>
    <strong>{item.authorNickname}</strong>
    <p>{item.content}</p>
  </div>
))}
```

현재 코드 기준으로 프론트에는 댓글 목록 조회와 댓글 작성 연결이 있다.

백엔드에는 댓글 삭제와 댓글 채택 API도 있지만, `api.ts`에서 `deleteComment`, `acceptComment` 같은 프론트 API 함수는 현재 확인되지 않았다.

확인 필요: 댓글 삭제/채택 버튼을 프론트에서 제공할지 여부.

## 25. Comment 도메인 요청 전체 흐름

### 25.1 댓글 작성

```text
사용자가 게시글 상세 화면에서 댓글 입력
-> PostDetailPage.tsx의 comment state 변경
-> 등록 버튼 클릭
-> submitComment()
-> api.createComment(post.id, comment)
-> POST /api/posts/{postId}/comments
-> CommentController.create()
-> CommentService.create(email, postId, request)
-> postRepository.findByIdAndDeletedAtIsNull(postId)
-> memberRepository.findByEmail(email)
-> new Comment(post, member, content)
-> commentRepository.save(comment)
-> comments row 생성
-> CommentResponse 반환
-> setComments([...current, response.data])
-> 화면에 새 댓글 표시
```

### 25.2 댓글 목록 조회

```text
게시글 상세 페이지 진입
-> loadPost()
-> loadComments(postId)
-> api.comments(postId)
-> GET /api/posts/{postId}/comments
-> CommentController.list()
-> CommentService.list(postId)
-> postRepository.findByIdAndDeletedAtIsNull(postId)
-> commentRepository.findByPostAndDeletedAtIsNullOrderByIdAsc(post)
-> List<CommentResponse>
-> setComments(response.data)
-> 댓글 목록 렌더링
```

### 25.3 댓글 삭제

```text
DELETE /api/comments/{id}
-> CommentController.delete()
-> CommentService.delete(email, id)
-> commentRepository.findById(id)
-> memberRepository.findByEmail(email)
-> validateOwnerOrAdmin(member, comment)
-> comment.softDelete()
-> comments.deleted_at 값 저장
```

### 25.4 댓글 채택

```text
PATCH /api/comments/{id}/accept
-> CommentController.accept()
-> CommentService.accept(email, id)
-> commentRepository.findById(id)
-> memberRepository.findByEmail(email)
-> validatePostOwnerOrAdmin(member, comment.getPost())
-> comment.accept()
-> comment.getPost().acceptComment(comment.getId())
-> comments.accepted = true
-> posts.accepted_comment_id = comment.id
```

## 26. 처음 직접 만들 때 체크리스트

### 26.1 DB 체크

- `comments` 테이블이 있는가
- `post_id`가 `posts(id)`를 참조하는가
- `member_id`가 `members(id)`를 참조하는가
- `content`가 `text not null`인가
- `accepted`가 `boolean not null`인가
- `created_at`, `updated_at`, `deleted_at`이 있는가

### 26.2 Entity 체크

- `@Entity`를 붙였는가
- `@Table(name = "comments")`를 붙였는가
- `@Id`가 있는가
- `@GeneratedValue`가 있는가
- `Post post` 관계가 있는가
- `@ManyToOne`과 `@JoinColumn(name = "post_id")`가 있는가
- `Member author` 관계가 있는가
- `@ManyToOne`과 `@JoinColumn(name = "member_id")`가 있는가
- 댓글 내용에 `@Column(nullable = false, columnDefinition = "TEXT")`가 있는가
- JPA용 기본 생성자가 있는가
- 댓글 채택을 `accept()` 메서드로 표현했는가

### 26.3 Repository 체크

- `JpaRepository<Comment, Long>`을 상속했는가
- 게시글별 댓글 수를 세는 메서드가 있는가
- 게시글별 삭제되지 않은 댓글 목록 조회 메서드가 있는가
- 정렬 기준이 필요한 경우 `OrderByIdAsc`를 붙였는가

### 26.4 DTO 체크

- 댓글 작성 요청 DTO가 있는가
- `content`에 `@NotBlank`가 있는가
- 댓글 응답 DTO가 있는가
- 응답에 `id`, `content`, `authorNickname`, `accepted`, `createdAt`이 있는가
- Entity를 그대로 응답하지 않고 DTO로 변환하는가

### 26.5 Service 체크

- `@Service`를 붙였는가
- 댓글 작성에 `@Transactional`을 붙였는가
- 댓글 목록 조회에 `@Transactional(readOnly = true)`를 붙였는가
- 댓글 작성 시 게시글을 먼저 조회하는가
- 댓글 작성 시 로그인 사용자를 조회하는가
- 댓글 삭제 시 작성자 또는 관리자 검증을 하는가
- 댓글 채택 시 게시글 작성자 또는 관리자 검증을 하는가
- 댓글 삭제는 `softDelete()`를 사용하는가
- 댓글 채택 시 `Comment.accept()`와 `Post.acceptComment()`를 함께 호출하는가

### 26.6 Controller 체크

- `@RestController`를 붙였는가
- 공통 경로 `@RequestMapping("/api")`를 붙였는가
- 댓글 작성은 `@PostMapping("/posts/{postId}/comments")`인가
- 댓글 목록 조회는 `@GetMapping("/posts/{postId}/comments")`인가
- 댓글 삭제는 `@DeleteMapping("/comments/{id}")`인가
- 댓글 채택은 `@PatchMapping("/comments/{id}/accept")`인가
- URL의 id는 `@PathVariable`로 받는가
- JSON body는 `@RequestBody`로 받는가
- DTO 검증을 위해 `@Valid`를 붙였는가
- 로그인 사용자 정보는 `Authentication auth`로 받는가

### 26.7 Front/API 체크

- `api.comments(postId)`가 있는가
- `api.createComment(postId, content)`가 있는가
- `CommentItem` 타입이 백엔드 응답과 맞는가
- `PostDetailPage`에서 댓글 목록 state가 있는가
- 댓글 등록 후 `setComments()`로 화면에 반영하는가
- 실패 시 `commentError`를 보여주는가

## 27. 디버깅할 때 확인 순서

댓글 작성이 안 된다면 아래 순서로 확인한다.

1. 브라우저 Network에서 `POST /api/posts/{postId}/comments` 요청이 나갔는지 확인
2. 요청 body가 `{ "content": "..." }` 형태인지 확인
3. 요청 header에 `Authorization: Bearer ...`가 있는지 확인
4. 응답 status가 `200`, `400`, `401`, `403`, `404`, `500` 중 무엇인지 확인
5. `400`이면 `content`가 비어 있는지 확인
6. `401`이면 로그인 토큰 문제 확인
7. `404`이면 `postId`가 실제 존재하는 게시글인지 확인
8. `500`이면 서버 로그 확인
9. DB에서 `comments` row가 생성되었는지 확인

댓글 목록이 안 보이면 아래를 확인한다.

1. `GET /api/posts/{postId}/comments` 요청이 나갔는지 확인
2. 응답 data가 배열인지 확인
3. 각 item에 `id`, `content`, `authorNickname`, `accepted`, `createdAt`이 있는지 확인
4. DB의 `comments.deleted_at`이 null인지 확인
5. 프론트에서 `setComments(response.data)`가 실행되는지 확인

댓글 삭제가 안 되면 아래를 확인한다.

1. `DELETE /api/comments/{id}` 요청이 나갔는지 확인
2. 로그인 사용자가 댓글 작성자 또는 관리자인지 확인
3. `comments.deleted_at` 값이 채워지는지 확인

댓글 채택이 안 되면 아래를 확인한다.

1. `PATCH /api/comments/{id}/accept` 요청이 나갔는지 확인
2. 로그인 사용자가 게시글 작성자 또는 관리자인지 확인
3. `comments.accepted`가 true로 바뀌는지 확인
4. `posts.accepted_comment_id`가 댓글 id로 바뀌는지 확인

## 28. Post 도메인과 Comment 도메인의 차이

| 구분 | Post | Comment |
| --- | --- | --- |
| 중심 데이터 | 게시글 | 댓글 |
| 부모 데이터 | 작성자 `Member` | 게시글 `Post`, 작성자 `Member` |
| 작성 요청 방식 | `FormData` | JSON |
| 백엔드 수신 | `@ModelAttribute` | `@RequestBody` |
| 파일 업로드 | 있음 | 없음 |
| 목록 응답 | 페이징 | 배열 |
| 삭제 방식 | soft delete | soft delete |
| 권한 | 작성자 또는 관리자 | 댓글 삭제는 댓글 작성자 또는 관리자, 댓글 채택은 게시글 작성자 또는 관리자 |

## 29. 면접/프로젝트 설명 키워드

- 댓글은 `Post`와 `Member`에 모두 연결되는 Entity
- `@ManyToOne` 두 개로 게시글과 작성자 관계 표현
- 댓글 작성은 JSON 요청이므로 `@RequestBody` 사용
- 댓글 내용은 `@NotBlank`로 검증
- 댓글 목록은 삭제되지 않은 댓글만 id 오름차순 조회
- 댓글 삭제는 soft delete 방식
- 댓글 채택은 댓글의 `accepted`와 게시글의 `acceptedCommentId`를 함께 변경
- 댓글 수는 `CommentRepository.countByPostAndDeletedAtIsNull(post)`로 계산
- 댓글 도메인은 `Post` 상세/목록 응답에도 영향을 줌

## 30. 직접 다시 구현할 때 연습 순서

1. `comments` 테이블 컬럼을 먼저 종이에 적는다.
2. `Comment` Entity 필드만 먼저 작성한다.
3. `@Entity`, `@Table`, `@Id`, `@GeneratedValue`를 붙인다.
4. `Post post` 관계를 추가한다.
5. `Member author` 관계를 추가한다.
6. `content`, `accepted` 필드를 추가한다.
7. 생성자와 `accept()` 메서드를 만든다.
8. `CommentRepository`를 만든다.
9. `CommentCreateRequest`를 만든다.
10. `CommentResponse`를 만든다.
11. `CommentService.create()`만 먼저 만든다.
12. `CommentController.create()`만 먼저 연다.
13. Network에서 댓글 작성 요청을 확인한다.
14. DB의 `comments` row를 확인한다.
15. 목록 조회, 삭제, 채택 순서로 확장한다.

## 31. 질문 / 확인 필요

- 기존 Obsidian 개념 파일 목록 확인 필요: `Entity`, `DTO`, `Repository`, `Service`, `Controller`, `Transaction`, `RequestBody`, `ManyToOne` 문서가 이미 있는지 확인 필요
- 현재 프론트 코드 기준으로 댓글 삭제/채택 API 호출 함수는 확인되지 않음
- 댓글 삭제/채택 버튼을 프론트에 추가할지 여부 확인 필요
- 이미 삭제된 댓글을 다시 삭제하거나 채택하려는 경우의 정책 확인 필요
