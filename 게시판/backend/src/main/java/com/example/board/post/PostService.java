package com.example.board.post;

import com.example.board.comment.CommentRepository;
import com.example.board.common.BusinessException;
import com.example.board.common.ErrorCode;
import com.example.board.common.PageRequestFactory;
import com.example.board.common.PageResponse;
import com.example.board.file.FileStorage;
import com.example.board.file.FileValidator;
import com.example.board.likes.PostLikeRepository;
import com.example.board.member.Member;
import com.example.board.member.MemberRepository;
import com.example.board.post.dto.PostCreateRequest;
import com.example.board.post.dto.PostDetailResponse;
import com.example.board.post.dto.PostListResponse;
import com.example.board.post.dto.PostUpdateRequest;
import com.example.board.tag.Tag;
import com.example.board.tag.TagRepository;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.val;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PostService {
    private final PostRepository postRepository;
    private final PostTagRepository postTagRepository;
    private final TagRepository tagRepository;
    private final MemberRepository memberRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final FileStorage fileStorage;
    private final FileValidator fileValidator;

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
        postTagRepository.flush();      // JPA 영속성 컨텍스트 flush입니다. DB먼저 삭제 -> 추후 로직 추가 필요
        saveTags(post, request.tags());
        return detail(post);
    }

    @Transactional
    public void delete(String email, Long id) {
        val post = post(id);
        validateOwnerOrAdmin(member(email), post);
        post.softDelete();
    }

    @Transactional
    public PostDetailResponse find(Long id) {
        val post = post(id);
        post.increaseView();
        return detail(post);
    }

    @Transactional(readOnly = true)
    public PageResponse<PostListResponse> list(String keyword, PostType type, String tag, int page, int size) {
        val result = postRepository.search(text(keyword), type, text(tag), PageRequestFactory.create(page, size));
        return PageResponse.from(result.map(this::summary));
    }

    private PostListResponse summary(Post post) {
        return PostListResponse.of(post, tags(post), commentRepository.countByPostAndDeletedAtIsNull(post), postLikeRepository.countByPost(post));
    }

    private PostDetailResponse detail(Post post) {
        return PostDetailResponse.of(post, tags(post), commentRepository.countByPostAndDeletedAtIsNull(post), postLikeRepository.countByPost(post));
    }

    private void saveTags(Post post, String tags) {
        parseTags(tags).forEach(name -> postTagRepository.save(new PostTag(post, tag(name))));
    }

    private Tag tag(String name) {
        return tagRepository.findByNameIgnoreCase(name).orElseGet(() -> tagRepository.save(new Tag(name)));
    }

    private List<String> tags(Post post) {
        return postTagRepository.findByPostAndDeletedAtIsNull(post).stream().map(pt -> pt.getTag().getName()).toList();
    }

    private List<String> parseTags(String tags) {
        if (tags == null || tags.isBlank()) return List.of();
        return Arrays.stream(tags.split(",")).map(String::trim).filter(s -> !s.isBlank()).distinct().limit(10).toList();
    }

    private void validatePostType(Member member, PostType type) {
        if ((type == PostType.NOTICE || type == PostType.FAQ) && !member.isAdmin()) throw new BusinessException(ErrorCode.FORBIDDEN);
    }

    private void validateTitle(String title) {
        if (title == null || title.isBlank() || title.length() > 26) throw new BusinessException(ErrorCode.INVALID_INPUT);
    }

    private void validateOwnerOrAdmin(Member member, Post post) {
        if (!member.isAdmin() && !post.getAuthor().getId().equals(member.getId())) throw new BusinessException(ErrorCode.FORBIDDEN);
    }

    private Member member(String email) {
        return memberRepository.findByEmail(email).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    private Post post(Long id) {
        return postRepository.findByIdAndDeletedAtIsNull(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private PostType type(PostType type) {
        return type == null ? PostType.GENERAL : type;
    }

    private boolean visible(Boolean visible) {
        return visible == null || visible;
    }

    private String text(String value) {
        return value == null || value.isBlank() ? "" : value.trim();
    }
}
