package com.example.board.likes;

import com.example.board.member.Member;
import com.example.board.post.Post;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    long countByPost(Post post);

    Optional<PostLike> findByPostAndMember(Post post, Member member);
}
