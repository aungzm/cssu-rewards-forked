package com.cssurewards.user;

import com.cssurewards.user.dto.UserResponse;
import com.cssurewards.user.dto.CreateUserRequest;
import com.cssurewards.user.dto.CreatedUserResponse;
import com.cssurewards.user.dto.ChangePasswordRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public UserResponse currentUser(Authentication authentication) {
        return userService.getCurrentUser((Integer) authentication.getPrincipal());
    }

    @GetMapping("/me/avatar")
    public Map<String, String> currentUserAvatar(Authentication authentication) {
        return java.util.Collections.singletonMap("avatar",
            userService.getAvatar((Integer) authentication.getPrincipal()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER', 'SUPERUSER')")
    public CreatedUserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        return userService.createUser(request);
    }

    @PatchMapping("/me/password")
    public Map<String, String> changePassword(Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword((Integer) authentication.getPrincipal(), request);
        return Map.of("message", "Password updated successfully.");
    }
}
