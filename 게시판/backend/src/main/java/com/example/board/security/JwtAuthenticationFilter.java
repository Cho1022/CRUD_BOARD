package com.example.board.security;

import com.example.board.member.MemberRepository;
import com.example.board.common.BusinessException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final MemberRepository memberRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var token = bearer(request);
        if (token != null) authenticate(token);
        chain.doFilter(request, response);
    }

    private void authenticate(String token) {
        var member = memberRepository.findByEmail(subject(token)).orElse(null);
        if (member == null) return;
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + member.getRole().name()));
        var auth = new UsernamePasswordAuthenticationToken(member.getEmail(), null, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private String subject(String token) {
        try {
            return jwtService.subject(token);
        } catch (BusinessException ex) {
            return "";
        }
    }

    private String bearer(HttpServletRequest request) {
        var header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return null;
        return header.substring(7);
    }
}
