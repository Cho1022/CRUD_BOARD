package com.example.board.security;

import com.example.board.common.BusinessException;
import com.example.board.common.ErrorCode;
import com.example.board.member.Member;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final ObjectMapper objectMapper;
    private final String secret;
    private final long accessMinutes;

    public JwtService(ObjectMapper objectMapper, @Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.access-token-minutes}") long accessMinutes) {
        this.objectMapper = objectMapper;
        this.secret = secret;
        this.accessMinutes = accessMinutes;
    }

    public String create(Member member) {
        var exp = Instant.now().plusSeconds(accessMinutes * 60).getEpochSecond();
        Map<String, Object> payload = Map.of("sub", member.getEmail(), "role", member.getRole().name(), "exp", exp);
        return encode(Map.of("alg", "HS256", "typ", "JWT")) + "." + encode(payload) + "." + sign(payload, exp);
    }

    public String subject(String token) {
        try {
            var parts = token.split("\\.");
            var payload = readPayload(parts[1]);
            if (!valid(parts) || expired(payload)) throw new BusinessException(ErrorCode.UNAUTHORIZED);
            return (String) payload.get("sub");
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
    }

    private String sign(Map<String, Object> payload, long exp) {
        return hmac(encode(Map.of("alg", "HS256", "typ", "JWT")) + "." + encode(payload));
    }

    private boolean valid(String[] parts) {
        return parts.length == 3 && hmac(parts[0] + "." + parts[1]).equals(parts[2]);
    }

    private boolean expired(Map<String, Object> payload) {
        return ((Number) payload.get("exp")).longValue() < Instant.now().getEpochSecond();
    }

    private Map<String, Object> readPayload(String payload) throws Exception {
        var json = new String(Base64.getUrlDecoder().decode(payload), StandardCharsets.UTF_8);
        return objectMapper.readValue(json, Map.class);
    }

    private String encode(Object value) {
        try {
            var json = objectMapper.writeValueAsBytes(value);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(json);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private String hmac(String value) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
