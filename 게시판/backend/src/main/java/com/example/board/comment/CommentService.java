package com.example.board.comment;

import com.example.board.comment.dto.CommentCreateRequest;
import com.example.board.comment.dto.CommentResponse;
import com.example.board.common.BusinessException;
import com.example.board.common.ErrorCode;
import com.example.board.member.Member;
import com.example.board.member.MemberRepository;
import com.example.board.post.Post;
import com.example.board.post.PostRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.val;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService {
    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public CommentResponse create(String email, Long postId, CommentCreateRequest request) {
        val comment = new Comment(post(postId), member(email), request.content());
        return CommentResponse.from(commentRepository.save(comment));
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> list(Long postId) {
        return commentRepository.findByPostAndDeletedAtIsNullOrderByIdAsc(post(postId)).stream().map(CommentResponse::from).toList();
    }

    @Transactional
    public void delete(String email, Long id) {
        val comment = commentRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        validateOwnerOrAdmin(member(email), comment);
        comment.softDelete();
    }

    @Transactional
    public CommentResponse accept(String email, Long id) {
        val comment = commentRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        validatePostOwnerOrAdmin(member(email), comment.getPost());
        comment.accept();
        comment.getPost().acceptComment(comment.getId());
        return CommentResponse.from(comment);
    }

    private void validateOwnerOrAdmin(Member member, Comment comment) {
        if (!member.isAdmin() && !comment.getAuthor().getId().equals(member.getId())) throw new BusinessException(ErrorCode.FORBIDDEN);
    }

    private void validatePostOwnerOrAdmin(Member member, Post post) {
        if (!member.isAdmin() && !post.getAuthor().getId().equals(member.getId())) throw new BusinessException(ErrorCode.FORBIDDEN);
    }

    private Member member(String email) {
        return memberRepository.findByEmail(email).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    private Post post(Long id) {
        return postRepository.findByIdAndDeletedAtIsNull(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}
