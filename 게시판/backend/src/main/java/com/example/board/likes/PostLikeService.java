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
