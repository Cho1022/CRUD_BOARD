package com.example.board.post;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostTagRepository extends JpaRepository<PostTag, Long> {
    List<PostTag> findByPostAndDeletedAtIsNull(Post post);

    void deleteByPost(Post post);
}
