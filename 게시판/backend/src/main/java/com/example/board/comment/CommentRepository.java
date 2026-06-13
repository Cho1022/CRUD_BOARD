package com.example.board.comment;

import com.example.board.post.Post;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    long countByPostAndDeletedAtIsNull(Post post);

    List<Comment> findByPostAndDeletedAtIsNullOrderByIdAsc(Post post);
}
