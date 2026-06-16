---
type: concept
topic: Spring 게시판 Like 도메인
status: draft
created: 2026-06-16
tags:
  - spring
  - board
  - like
  - jpa
  - rest-api
---

# Like 도메인 처음부터 구현하기

## 1. 이 도메인에서 만들고자 한 것

`Like` 도메인에서 만들고자 한 것은 **게시글 추천 기능**이다.

이 프로젝트의 추천은 `PostLike`라는 이름으로 구현되어 있다.

사용자는 게시글 상세 화면에서 `추천` 버튼을 누를 수 있다.

이때 백엔드는 아래 두 가지 동작 중 하나를 수행한다.

- 아직 추천하지 않은 게시글이면 추천 생성
- 이미 추천한 게시글이면 추천 취소

즉 현재 추천 기능은 **toggle 방식**이다.

```text
추천하지 않은 상태에서 클릭
-> 추천 생성

이미 추천한 상태에서 클릭
-> 추천 취소
```

`Like`는 단독 데이터가 아니다.

`Like`는 항상 아래 두 대상을 연결한다.

- 어떤 게시글을 추천했는가: `Post`
- 어떤 회원이 추천했는가: `Member`

그래서 `PostLike` Entity에는 `Post`와 `Member` 관계가 모두 들어간다.

## 2. 다른 도메인에도 적용할 공통 구현 패턴

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

`Like` 도메인에 적용하면 아래와 같다.

```text
post_likes 테이블 확인
-> PostLike Entity 작성
-> PostLikeRepository 작성
-> Request DTO 필요 여부 확인
-> LikeResponse 작성
-> PostLikeService 작성
-> PostLikeController 작성
-> api.toggleLike() 연결
-> 추천 버튼 클릭 후 Network / 서버 로그 / post_likes row 확인
```

## 3. DB 테이블 구조 확인

추천 테이블은 `post_likes`다.

```sql
create table post_likes (
  id bigserial primary key,
  post_id bigint not null references posts(id),
  member_id bigint not null references members(id),
  created_at timestamp not null,
  updated_at timestamp not null,
  deleted_at timestamp,
  unique(post_id, member_id)
);
```

각 컬럼의 의미는 아래와 같다.

| 컬럼 | 의미 |
| --- | --- |
| `id` | 추천 PK |
| `post_id` | 추천 대상 게시글 ID |
| `member_id` | 추천한 회원 ID |
| `created_at` | 생성 시간 |
| `updated_at` | 수정 시간 |
| `deleted_at` | 삭제 시간 |

DB 컬럼과 Java 필드의 연결은 아래와 같다.

```text
post_likes.id
-> PostLike.id

post_likes.post_id
-> PostLike.post

post_likes.member_id
-> PostLike.member

post_likes.created_at / updated_at / deleted_at
-> BaseEntity
```

## 4. 중복 추천을 막는 구조

`post_likes` 테이블에는 아래 제약 조건이 있다.

```sql
unique(post_id, member_id)
```

의미:

```text
같은 게시글 post_id에
같은 회원 member_id가
추천 row를 중복으로 만들 수 없다
```

예를 들어 회원 3번이 게시글 10번을 추천했다면 아래 조합은 한 번만 저장될 수 있다.

```text
post_id = 10
member_id = 3
```

따라서 한 사용자가 같은 게시글에 중복 추천하지 못하게 하는 DB 구조가 있다.

## 5. 전체 구현 순서

처음부터 만든다고 생각하면 순서는 아래가 좋다.

1. `post_likes` 테이블 구조를 확인한다.
2. `PostLike` Entity를 만든다.
3. `PostLikeRepository`를 만든다.
4. Request DTO가 필요한지 확인한다.
5. 응답 DTO `LikeResponse`를 만든다.
6. `PostLikeService`에서 toggle 로직을 만든다.
7. `PostLikeController`에서 HTTP API를 연다.
8. 프론트 `api.ts`에서 `toggleLike()`를 연결한다.
9. `PostDetailPage.tsx`의 추천 버튼에서 API를 호출한다.
10. Network, 서버 로그, DB row로 동작을 확인한다.

## 6. Entity 코드

파일:

`backend/src/main/java/com/example/board/likes/PostLike.java`

현재 완성된 코드는 아래와 같다.

```java
package com.example.board.likes;

import com.example.board.common.BaseEntity;
import com.example.board.member.Member;
import com.example.board.post.Post;
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
@Table(name = "post_likes")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostLike extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;


    public PostLike(Post post, Member member) {
        this.post = post;
        this.member = member;
    }
}
```

## 7. `PostLike.java`를 줄 단위로 이해하기

### 7.1 `package`

```java
package com.example.board.likes;
```

이 파일이 `likes` 도메인에 속한다는 뜻이다.

추천과 직접 관련된 코드는 `likes` 패키지에 둔다.

### 7.2 `import`

```java
import com.example.board.common.BaseEntity;
import com.example.board.member.Member;
import com.example.board.post.Post;
```

`PostLike`는 공통 시간 필드가 필요해서 `BaseEntity`를 상속한다.

추천은 회원이 게시글에 하는 것이므로 `Member`와 `Post`를 참조한다.

```java
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

## 8. Entity 어노테이션 이해하기

### 8.1 `@Getter`

```java
@Getter
```

모든 필드의 getter를 자동으로 만든다.

### 8.2 `@Entity`

```java
@Entity
```

`PostLike` 클래스가 JPA Entity라는 뜻이다.

즉 Java 객체인 `PostLike`를 DB의 `post_likes` 테이블 row와 연결한다.

연결 관계:

```text
PostLike 객체
-> JPA Entity
-> post_likes 테이블 row
```

### 8.3 `@Table(name = "post_likes")`

```java
@Table(name = "post_likes")
```

이 Entity가 DB의 `post_likes` 테이블과 연결된다는 뜻이다.

```text
PostLike.java
-> @Table(name = "post_likes")
-> post_likes 테이블
```

### 8.4 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`

```java
@NoArgsConstructor(access = AccessLevel.PROTECTED)
```

JPA는 Entity를 만들 때 기본 생성자가 필요하다.

하지만 아무 곳에서나 `new PostLike()`로 비어 있는 추천 객체를 만들면 좋지 않다.

그래서 JPA가 사용할 수 있도록 `protected` 기본 생성자를 만든다.

## 9. Like가 Post와 Member를 연결하는 방식

`PostLike`에는 `Post`와 `Member`가 모두 들어간다.

### 9.1 게시글 관계

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "post_id", nullable = false)
private Post post;
```

추천 여러 개는 게시글 하나에 연결될 수 있다.

그래서 추천과 게시글은 다대일 관계다.

```text
Post 1개
-> PostLike 여러 개
```

`@JoinColumn(name = "post_id")`는 `post_likes.post_id`로 `posts.id`와 연결한다는 뜻이다.

값 전달 흐름:

```text
URL의 /posts/{postId}/likes
-> @PathVariable Long postId
-> postRepository.findByIdAndDeletedAtIsNull(postId)
-> Post post
-> new PostLike(post, member)
-> post_likes.post_id에 post.id 저장
```

### 9.2 회원 관계

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "member_id", nullable = false)
private Member member;
```

추천 여러 개는 회원 한 명이 만들 수 있다.

그래서 추천과 회원도 다대일 관계다.

```text
Member 1명
-> PostLike 여러 개
```

`@JoinColumn(name = "member_id")`는 `post_likes.member_id`로 `members.id`와 연결한다는 뜻이다.

값 전달 흐름:

```text
로그인 사용자 email
-> Authentication auth
-> auth.getName()
-> memberRepository.findByEmail(email)
-> Member member
-> new PostLike(post, member)
-> post_likes.member_id에 member.id 저장
```

## 10. 생성자

```java
public PostLike(Post post, Member member) {
    this.post = post;
    this.member = member;
}
```

추천을 만들 때 필요한 값은 두 가지다.

- 어떤 게시글을 추천하는지: `Post post`
- 누가 추천하는지: `Member member`

추천 자체에는 별도의 내용이 없다.

그래서 `Comment`처럼 `content` 필드가 없다.

## 11. Repository 코드

파일:

`backend/src/main/java/com/example/board/likes/PostLikeRepository.java`

```java
package com.example.board.likes;

import com.example.board.member.Member;
import com.example.board.post.Post;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    long countByPost(Post post);

    Optional<PostLike> findByPostAndMember(Post post, Member member);
}
```

`JpaRepository<PostLike, Long>`의 의미는 아래와 같다.

```text
PostLike Entity를 대상으로
id 타입은 Long이고
기본 CRUD 기능을 제공받는다
```

기본으로 사용할 수 있는 메서드:

- `save(postLike)`
- `findById(id)`
- `findAll()`
- `delete(postLike)`

## 12. Repository 메서드 이름의 쿼리 의미

### 12.1 `countByPost(Post post)`

```java
long countByPost(Post post);
```

의미:

```text
특정 게시글에 연결된 추천 개수를 센다
```

SQL 의미:

```sql
select count(*)
from post_likes
where post_id = ?;
```

현재 코드 기준으로 이 메서드 이름에는 `DeletedAtIsNull` 조건이 없다.

즉 메서드 이름 자체는 `post` 기준 count만 의미한다.

### 12.2 `findByPostAndMember(Post post, Member member)`

```java
Optional<PostLike> findByPostAndMember(Post post, Member member);
```

의미:

```text
특정 게시글과 특정 회원으로
이미 추천 row가 있는지 찾는다
```

SQL 의미:

```sql
select *
from post_likes
where post_id = ?
and member_id = ?;
```

이 메서드는 toggle 로직에서 사용된다.

```text
기존 추천 row가 있으면
-> 추천 취소

기존 추천 row가 없으면
-> 추천 생성
```

## 13. 요청 DTO와 응답 DTO가 있는지

### 13.1 Request DTO

현재 `Like` 도메인에는 요청 DTO가 없다.

추천 toggle 요청에 필요한 값은 URL의 `postId`와 로그인 사용자의 `email`이다.

별도의 JSON body가 필요하지 않다.

값 전달 흐름:

```text
URL의 /posts/{postId}/likes
-> @PathVariable Long postId

Authorization 토큰
-> Authentication auth
-> auth.getName()
-> email
```

그래서 `PostLikeController.toggle()`에는 `@RequestBody`나 request DTO가 없다.

### 13.2 Response DTO

파일:

`backend/src/main/java/com/example/board/likes/dto/LikeResponse.java`

```java
package com.example.board.likes.dto;

public record LikeResponse(boolean liked, long likeCount) {
}
```

응답에는 두 값이 들어간다.

| 필드 | 의미 |
| --- | --- |
| `liked` | 요청 후 현재 사용자가 추천한 상태인지 |
| `likeCount` | 해당 게시글의 추천 수 |

## 14. Service 코드

파일:

`backend/src/main/java/com/example/board/likes/PostLikeService.java`

현재 완성된 코드는 아래와 같다.

```java
package com.example.board.likes;

import com.example.board.common.BusinessException;
import com.example.board.common.ErrorCode;
import com.example.board.likes.dto.LikeResponse;
import com.example.board.member.MemberRepository;
import com.example.board.post.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.val;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PostLikeService {
    private final PostLikeRepository postLikeRepository;
    private final PostRepository postRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public LikeResponse toggle(String email, Long postId) {
        val post = postRepository.findByIdAndDeletedAtIsNull(postId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        val member = memberRepository.findByEmail(email).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        val existing = postLikeRepository.findByPostAndMember(post, member);
        existing.ifPresentOrElse(postLikeRepository::delete, () -> postLikeRepository.save(new PostLike(post, member)));
        return new LikeResponse(existing.isEmpty(), postLikeRepository.countByPost(post));
    }
}
```

## 15. Service 코드 흐름

### 15.1 `@Service`

```java
@Service
```

이 클래스가 서비스 계층이라는 뜻이다.

추천 생성/취소 규칙은 `PostLikeService`에서 처리한다.

### 15.2 `@RequiredArgsConstructor`

```java
@RequiredArgsConstructor
```

`final` 필드를 받는 생성자를 Lombok이 자동으로 만든다.

현재 `PostLikeService`가 필요로 하는 의존성은 세 개다.

```java
private final PostLikeRepository postLikeRepository;
private final PostRepository postRepository;
private final MemberRepository memberRepository;
```

각 역할:

| 의존성 | 역할 |
| --- | --- |
| `PostLikeRepository` | 추천 row 조회, 저장, 삭제, 개수 조회 |
| `PostRepository` | 추천 대상 게시글 조회 |
| `MemberRepository` | 추천한 회원 조회 |

### 15.3 `@Transactional`

```java
@Transactional
public LikeResponse toggle(String email, Long postId) {
```

추천 toggle은 DB를 변경한다.

기존 추천이 없으면 insert가 발생한다.

기존 추천이 있으면 delete가 발생한다.

그래서 `@Transactional`을 사용한다.

## 16. 추천 생성/취소 toggle 흐름

```java
val post = postRepository.findByIdAndDeletedAtIsNull(postId)
        .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
```

먼저 추천 대상 게시글을 찾는다.

삭제되지 않은 게시글만 추천할 수 있다.

```text
postId
-> postRepository.findByIdAndDeletedAtIsNull(postId)
-> Post post
```

```java
val member = memberRepository.findByEmail(email)
        .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
```

로그인 사용자를 email로 찾는다.

```text
Authentication auth
-> auth.getName()
-> email
-> memberRepository.findByEmail(email)
-> Member member
```

```java
val existing = postLikeRepository.findByPostAndMember(post, member);
```

해당 사용자가 해당 게시글을 이미 추천했는지 찾는다.

```text
Post post + Member member
-> postLikeRepository.findByPostAndMember(post, member)
-> Optional<PostLike> existing
```

```java
existing.ifPresentOrElse(
    postLikeRepository::delete,
    () -> postLikeRepository.save(new PostLike(post, member))
);
```

기존 추천이 있으면 삭제한다.

기존 추천이 없으면 새로 저장한다.

```text
existing 있음
-> postLikeRepository.delete(existing)
-> 추천 취소

existing 없음
-> postLikeRepository.save(new PostLike(post, member))
-> 추천 생성
```

현재 코드 기준으로 추천 취소는 `postLikeRepository::delete`를 호출한다.

`softDelete()` 호출은 현재 `PostLikeService` 코드에 없다.

```java
return new LikeResponse(existing.isEmpty(), postLikeRepository.countByPost(post));
```

응답을 만든다.

`existing.isEmpty()`의 의미:

```text
기존 추천이 없었음
-> 이번 요청으로 추천 생성
-> liked = true

기존 추천이 있었음
-> 이번 요청으로 추천 취소
-> liked = false
```

`postLikeRepository.countByPost(post)`는 현재 게시글의 추천 수를 다시 센다.

## 17. Controller 코드

파일:

`backend/src/main/java/com/example/board/likes/PostLikeController.java`

현재 완성된 코드는 아래와 같다.

```java
package com.example.board.likes;

import com.example.board.common.ApiResponse;
import com.example.board.likes.dto.LikeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts/{postId}/likes")
@RequiredArgsConstructor
public class PostLikeController {
    private final PostLikeService postLikeService;

    @PostMapping
    public ApiResponse<LikeResponse> toggle(Authentication auth, @PathVariable Long postId) {
        return ApiResponse.success(postLikeService.toggle(auth.getName(), postId));
    }
}
```

## 18. Controller 어노테이션 이해하기

### 18.1 `@RestController`

```java
@RestController
```

JSON API Controller라는 뜻이다.

메서드가 반환하는 `ApiResponse<LikeResponse>`는 JSON 응답으로 변환된다.

### 18.2 `@RequestMapping("/api/posts/{postId}/likes")`

```java
@RequestMapping("/api/posts/{postId}/likes")
```

추천 API의 공통 URL이다.

이 Controller의 API는 아래 주소로 열린다.

```text
POST /api/posts/{postId}/likes
```

### 18.3 `@PostMapping`

```java
@PostMapping
public ApiResponse<LikeResponse> toggle(...)
```

추천 생성/취소 요청을 처리한다.

현재 코드는 추천 생성과 추천 취소를 같은 `POST` API에서 처리한다.

### 18.4 `@PathVariable`

```java
@PathVariable Long postId
```

URL 경로에 들어 있는 `postId` 값을 받는다.

값 전달 흐름:

```text
/api/posts/10/likes
-> @PathVariable Long postId = 10
```

### 18.5 `Authentication auth`

```java
Authentication auth
```

로그인한 사용자 정보를 받는다.

서비스에는 `auth.getName()` 값을 넘긴다.

```java
postLikeService.toggle(auth.getName(), postId)
```

값 전달 흐름:

```text
Authorization 토큰
-> Spring Security 인증 처리
-> Authentication auth
-> auth.getName()
-> email
-> PostLikeService.toggle(email, postId)
```

## 19. 요청 값 전달 흐름

### 19.1 전체 흐름

```text
사용자가 게시글 상세 화면에서 추천 버튼 클릭
-> PostDetailPage.tsx의 handleLike()
-> api.toggleLike(post.id)
-> POST /api/posts/{postId}/likes
-> PostLikeController.toggle()
-> PostLikeService.toggle(email, postId)
-> postRepository.findByIdAndDeletedAtIsNull(postId)
-> memberRepository.findByEmail(email)
-> postLikeRepository.findByPostAndMember(post, member)
-> 기존 추천이 있으면 delete
-> 기존 추천이 없으면 save(new PostLike(post, member))
-> postLikeRepository.countByPost(post)
-> LikeResponse(liked, likeCount)
-> 프론트 setLiked(), setLikeCount()
```

### 19.2 추천 생성 흐름

```text
기존 post_likes row 없음
-> existing.isEmpty() = true
-> postLikeRepository.save(new PostLike(post, member))
-> post_likes row 생성
-> LikeResponse(true, countByPost(post))
```

### 19.3 추천 취소 흐름

```text
기존 post_likes row 있음
-> existing.isEmpty() = false
-> postLikeRepository.delete(existing)
-> LikeResponse(false, countByPost(post))
```

## 20. 프론트에서 좋아요 버튼 클릭이 API 요청으로 이어지는 흐름

파일:

`front/src/pages/PostDetailPage.tsx`

추천 관련 state:

```ts
const [liked, setLiked] = useState(false);
const [likeCount, setLikeCount] = useState(0);
const [likePending, setLikePending] = useState(false);
```

추천 버튼 클릭 함수:

```ts
async function handleLike() {
  if (!post || likePending) return;
  setLikePending(true);
  setActionError("");
  try {
    const response = await api.toggleLike(post.id);
    setLiked(response.data.liked);
    setLikeCount(response.data.likeCount);
  } catch (error) {
    setActionError(apiErrorMessage(error, "추천 처리에 실패했습니다."));
  } finally {
    setLikePending(false);
  }
}
```

추천 버튼:

```tsx
<button
  type="button"
  className={liked ? "like-button selected" : "like-button"}
  aria-pressed={liked}
  onClick={handleLike}
  disabled={likePending}
>
  추천 {formatCount(likeCount)}
</button>
```

파일:

`front/src/lib/api.ts`

```ts
toggleLike: (postId: string | number) =>
  apiFetch<ApiResponse<LikeResult>>(`/posts/${postId}/likes`, { method: "POST" }),
```

파일:

`front/src/types.ts`

```ts
export interface LikeResult {
  liked: boolean;
  likeCount: number;
}
```

프론트 값 전달 흐름:

```text
추천 버튼 클릭
-> handleLike()
-> api.toggleLike(post.id)
-> POST /api/posts/{postId}/likes
-> 응답 LikeResult
-> setLiked(response.data.liked)
-> setLikeCount(response.data.likeCount)
```

현재 코드 기준으로 게시글 상세 조회 시에는 `likeCount`를 게시글 응답의 추천 수로 초기화한다.

```ts
setLikeCount(nextPost.likes);
```

현재 코드에서 상세 조회 응답만으로 현재 로그인 사용자가 이미 추천했는지 여부를 세팅하는 흐름은 확인되지 않는다.

확인 필요: 상세 페이지 최초 진입 시 `liked` 초기 상태를 실제 사용자 추천 여부와 동기화할지 여부.

## 21. 직접 확인할 것

### 21.1 Network 확인

추천 버튼을 누른 뒤 브라우저 Network에서 아래 요청을 확인한다.

```text
POST /api/posts/{postId}/likes
```

확인할 값:

- 요청 Method가 `POST`인지
- 요청 URL에 게시글 id가 들어가는지
- 요청 Header에 `Authorization: Bearer ...`가 있는지
- 응답 body에 `liked`, `likeCount`가 있는지

응답 예시 구조:

```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 1
  },
  "message": null,
  "code": null
}
```

### 21.2 서버 로그 확인

추천 요청이 실패하면 status를 먼저 본다.

```text
401
-> 로그인 인증 문제 가능성

404
-> postId에 해당하는 게시글이 없거나 deletedAt이 null이 아닐 가능성

500
-> 서버 로그와 DB 제약 조건 확인
```

### 21.3 DB row 확인

추천 생성 후 `post_likes` 테이블을 확인한다.

확인할 컬럼:

```text
post_id
member_id
created_at
updated_at
deleted_at
```

확인할 내용:

- 추천 생성 시 `post_likes` row가 생기는지
- 같은 `post_id`, `member_id` 조합이 중복 생성되지 않는지
- 추천 취소 시 `postLikeRepository.delete()` 호출 결과가 DB에 반영되는지
- 다시 추천하면 row가 다시 생기는지

### 21.4 중복 추천 확인

같은 사용자로 같은 게시글 추천 버튼을 여러 번 눌러 확인한다.

```text
1번째 클릭
-> 추천 생성
-> liked = true
-> likeCount 증가

2번째 클릭
-> 추천 취소
-> liked = false
-> likeCount 감소

3번째 클릭
-> 추천 생성
-> liked = true
-> likeCount 증가
```

DB에는 `unique(post_id, member_id)`가 있으므로 같은 사용자와 같은 게시글 조합이 중복 저장될 수 없다.

## 22. Post/Comment 도메인과 비슷한 점

### 22.1 Entity가 DB 테이블과 연결된다

`Post`, `Comment`, `PostLike` 모두 Entity다.

```text
Post
-> posts 테이블

Comment
-> comments 테이블

PostLike
-> post_likes 테이블
```

모두 `@Entity`, `@Table`, `@Id`, `@GeneratedValue`를 사용한다.

### 22.2 `BaseEntity`를 상속한다

`PostLike`도 `BaseEntity`를 상속한다.

```java
public class PostLike extends BaseEntity
```

그래서 `createdAt`, `updatedAt`, `deletedAt` 필드를 가진다.

### 22.3 `Post`와 연결된다

`Comment`와 `PostLike`는 모두 `Post`에 연결된다.

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "post_id", nullable = false)
private Post post;
```

둘 다 특정 게시글에 속하는 데이터다.

### 22.4 로그인 사용자를 사용한다

`Comment` 작성과 `Like` toggle은 모두 로그인 사용자를 사용한다.

```text
Authentication auth
-> auth.getName()
-> memberRepository.findByEmail(email)
-> Member
```

## 23. Post/Comment 도메인과 다른 점

| 구분 | Post | Comment | Like |
| --- | --- | --- | --- |
| 중심 기능 | 게시글 작성/조회/수정/삭제 | 댓글 작성/조회/삭제/채택 | 추천 생성/취소 |
| Entity | `Post` | `Comment` | `PostLike` |
| 테이블 | `posts` | `comments` | `post_likes` |
| 요청 DTO | 있음 | 있음 | 없음 |
| 응답 DTO | `PostDetailResponse`, `PostListResponse` | `CommentResponse` | `LikeResponse` |
| 작성 요청 body | `FormData` | JSON | 없음 |
| Controller 수신 | `@ModelAttribute` | `@RequestBody` | `@PathVariable` + `Authentication` |
| 파일 업로드 | 있음 | 없음 | 없음 |
| 주요 관계 | `Member author` | `Post post`, `Member author` | `Post post`, `Member member` |
| 중복 방지 | 태그 연결에 `unique(post_id, tag_id)` | 현재 comments 테이블에는 unique 없음 | `unique(post_id, member_id)` |
| 동작 방식 | 작성/수정/삭제가 분리 | 작성/삭제/채택이 분리 | 하나의 `toggle()`로 생성/취소 |

## 24. 처음 직접 만들 때 체크리스트

### 24.1 DB 체크

- `post_likes` 테이블이 있는가
- `post_id`가 `posts(id)`를 참조하는가
- `member_id`가 `members(id)`를 참조하는가
- `unique(post_id, member_id)`가 있는가
- `created_at`, `updated_at`, `deleted_at`이 있는가

### 24.2 Entity 체크

- `@Entity`를 붙였는가
- `@Table(name = "post_likes")`를 붙였는가
- `@Id`가 있는가
- `@GeneratedValue`가 있는가
- `Post post` 관계가 있는가
- `@ManyToOne`과 `@JoinColumn(name = "post_id")`가 있는가
- `Member member` 관계가 있는가
- `@ManyToOne`과 `@JoinColumn(name = "member_id")`가 있는가
- `Post`와 `Member`를 받는 생성자가 있는가

### 24.3 Repository 체크

- `JpaRepository<PostLike, Long>`을 상속했는가
- 게시글별 추천 수를 세는 `countByPost(Post post)`가 있는가
- 기존 추천 여부를 찾는 `findByPostAndMember(Post post, Member member)`가 있는가

### 24.4 DTO 체크

- Request DTO가 필요 없는 구조인지 확인했는가
- 응답 DTO `LikeResponse`가 있는가
- `liked`와 `likeCount`를 응답하는가

### 24.5 Service 체크

- `@Service`를 붙였는가
- `@Transactional`을 붙였는가
- `postId`로 삭제되지 않은 게시글을 조회하는가
- `email`로 회원을 조회하는가
- `findByPostAndMember()`로 기존 추천 여부를 확인하는가
- 기존 추천이 있으면 `delete`하는가
- 기존 추천이 없으면 `save(new PostLike(post, member))`하는가
- 응답으로 `LikeResponse`를 반환하는가

### 24.6 Controller 체크

- `@RestController`를 붙였는가
- `@RequestMapping("/api/posts/{postId}/likes")`를 붙였는가
- `@PostMapping`으로 toggle API를 열었는가
- `@PathVariable Long postId`를 받는가
- `Authentication auth`를 받는가
- `postLikeService.toggle(auth.getName(), postId)`를 호출하는가

### 24.7 Front/API 체크

- `api.toggleLike(postId)`가 있는가
- `method: "POST"`인지 확인했는가
- `LikeResult` 타입이 `liked`, `likeCount`를 가지는가
- 추천 버튼 클릭 시 `handleLike()`가 실행되는가
- 응답 후 `setLiked()`와 `setLikeCount()`가 실행되는가
- 요청 중복 방지를 위해 `likePending`을 사용하는가

## 25. 직접 다시 구현할 때 연습 순서

1. `post_likes` 테이블 컬럼을 먼저 적는다.
2. `unique(post_id, member_id)`가 왜 필요한지 확인한다.
3. `PostLike` Entity를 만든다.
4. `Post post` 관계를 추가한다.
5. `Member member` 관계를 추가한다.
6. `PostLikeRepository`를 만든다.
7. `countByPost(Post post)`를 추가한다.
8. `findByPostAndMember(Post post, Member member)`를 추가한다.
9. `LikeResponse`를 만든다.
10. `PostLikeService.toggle()`을 만든다.
11. `PostLikeController.toggle()`을 만든다.
12. 프론트 `api.toggleLike()`를 연결한다.
13. 추천 버튼 클릭 후 Network 요청을 확인한다.
14. DB의 `post_likes` row를 확인한다.

## 26. 질문 / 확인 필요

- 현재 코드 기준으로 `Like` 요청 DTO는 없음
- 현재 코드 기준으로 추천 취소는 `postLikeRepository.delete()` 호출
- 현재 코드 기준으로 `countByPost(Post post)`에는 `DeletedAtIsNull` 조건이 없음
- 현재 코드 기준으로 상세 페이지 최초 진입 시 현재 로그인 사용자의 추천 여부를 조회해 `liked`를 초기화하는 흐름은 확인되지 않음
- 기존 Obsidian 개념 파일 목록 확인 필요: `Entity`, `Repository`, `ManyToOne`, `Unique Constraint`, `Transaction`, `Toggle` 문서가 이미 있는지 확인 필요
