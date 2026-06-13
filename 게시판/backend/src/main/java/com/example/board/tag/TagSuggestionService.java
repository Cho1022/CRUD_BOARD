package com.example.board.tag;

import com.example.board.tag.dto.TagSuggestionResponse;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TagSuggestionService {
    private static final Pattern SPLIT = Pattern.compile("[^가-힣a-zA-Z0-9]+");
    private final TagRepository tagRepository;

    public TagSuggestionResponse suggest(String title, String content) {
        var counts = new LinkedHashMap<String, Integer>();
        SPLIT.splitAsStream((title + " " + content).toLowerCase())
                .filter(word -> word.length() >= 2)
                .forEach(word -> counts.merge(word, 1, Integer::sum));
        tagRepository.findTop20ByOrderByNameAsc().forEach(tag -> boostExisting(counts, tag.getName()));
        return new TagSuggestionResponse(top(counts));
    }

    private void boostExisting(LinkedHashMap<String, Integer> counts, String name) {
        if (counts.containsKey(name.toLowerCase())) counts.merge(name, 5, Integer::sum);
    }

    private List<String> top(LinkedHashMap<String, Integer> counts) {
        return counts.entrySet().stream()
                .sorted(Comparator.<java.util.Map.Entry<String, Integer>>comparingInt(java.util.Map.Entry::getValue).reversed())
                .limit(5)
                .map(java.util.Map.Entry::getKey)
                .toList();
    }
}
