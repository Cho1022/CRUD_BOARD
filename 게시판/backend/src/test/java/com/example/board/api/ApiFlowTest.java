package com.example.board.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApiFlowTest {
    @Autowired
    MockMvc mockMvc;
    @Autowired
    ObjectMapper objectMapper;

    @Test
    void signupLoginCreateAndListPost() throws Exception {
        var accessToken = signup();
        var loginToken = login();

        createPost(accessToken);
        var list = listPosts();

        assertThat(loginToken).isNotBlank();
        assertThat(list.at("/data/content/0/title").asText()).isEqualTo("API 게시글");
    }

    private String signup() throws Exception {
        var file = new MockMultipartFile("profileImage", "profile.png", "image/png", "x".getBytes());
        var result = mockMvc.perform(multipart("/api/auth/signup")
                        .file(file)
                        .param("email", "api@test.com")
                        .param("password", "Password1!")
                        .param("passwordConfirm", "Password1!")
                        .param("nickname", "apiuser"))
                .andExpect(status().isOk())
                .andReturn();
        return token(result.getResponse().getContentAsString());
    }

    private String login() throws Exception {
        var body = "{\"email\":\"api@test.com\",\"password\":\"Password1!\"}";
        var result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        return token(result.getResponse().getContentAsString());
    }

    private void createPost(String token) throws Exception {
        mockMvc.perform(multipart("/api/posts")
                        .param("title", "API 게시글")
                        .param("content", "본문")
                        .param("postType", "GENERAL")
                        .param("tags", "api,test")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    private JsonNode listPosts() throws Exception {
        var result = mockMvc.perform(get("/api/posts?keyword=API&page=1&size=10"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String token(String json) throws Exception {
        return objectMapper.readTree(json).at("/data/accessToken").asText();
    }
}
