package com.example.board.post;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, Long> {
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

    Optional<Post> findByIdAndDeletedAtIsNull(Long id);
}
