package com.webquanly.security;

import java.security.Key;
import java.util.Date;

import org.springframework.stereotype.Component;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtil {
    private final Key key;
    private final long expirationMs = 1000L * 60 * 60 * 24; // 24h

    public JwtUtil() {
        String secret = System.getenv().getOrDefault("JWT_SECRET", "changeit-changeit-changeit-changeit-123456");
        key = Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String username) {
        Date now = new Date();
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    public String extractUsername(String token) {
        try {
            return Jwts.parserBuilder().setSigningKey(key).build()
                    .parseClaimsJws(token).getBody().getSubject();
        } catch (JwtException e) {
            return null;
        }
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }
}
