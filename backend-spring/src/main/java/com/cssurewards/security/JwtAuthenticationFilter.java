package com.cssurewards.security;

import com.cssurewards.user.User;
import com.cssurewards.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtDecoder jwtDecoder;
    private final UserRepository users;

    public JwtAuthenticationFilter(JwtDecoder jwtDecoder, UserRepository users) {
        this.jwtDecoder = jwtDecoder;
        this.users = users;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getMethod().equals("POST") && request.getServletPath().equals("/auth/tokens");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Jwt jwt = jwtDecoder.decode(header.substring(7));
                Number id = jwt.getClaim("id");
                User user = id == null ? null : users.findById(id.intValue()).orElse(null);
                if (user == null) {
                    throw new IllegalArgumentException("Unknown user");
                }
                SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(user.getId(), null,
                        java.util.List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))));
            } catch (JwtException | IllegalArgumentException exception) {
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Invalid or expired token.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
