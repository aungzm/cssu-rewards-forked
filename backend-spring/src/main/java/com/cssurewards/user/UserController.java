package com.cssurewards.user;

import com.cssurewards.user.dto.UserResponse;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
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
}
