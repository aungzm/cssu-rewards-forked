package com.cssurewards.auth;

import com.cssurewards.auth.dto.CompleteResetRequest;
import com.cssurewards.auth.dto.ResetRequest;
import com.cssurewards.auth.dto.ResetResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth/resets")
@ConditionalOnProperty(name = "app.password-updates-enabled", havingValue = "true")
public class PasswordResetController {
    private final AuthService authService;

    public PasswordResetController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ResetResponse requestReset(@Valid @RequestBody ResetRequest request, HttpServletRequest httpRequest) {
        return authService.requestReset(request, httpRequest.getRemoteAddr());
    }

    @PostMapping("/{resetToken}")
    public Map<String, String> completeReset(@PathVariable String resetToken,
            @Valid @RequestBody CompleteResetRequest request) {
        authService.completeReset(resetToken, request);
        return Map.of("message", "Password reset successful. You may now log in with your new password.");
    }
}
