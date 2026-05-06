package com.cssurewards.user;

import com.cssurewards.user.dto.UserResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {
    private final UserRepository users;

    public UserService(UserRepository users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Integer id) {
        User user = findUser(id);
        return new UserResponse(user.getId(), user.getUtorid(), user.getEmail(),
            user.getName(), user.getBirthday(), user.getAvatarUrl(), user.getRole(),
            user.getLastLogin(), user.isVerified(), user.getPoints(), user.getCreatedAt(),
            user.getAvatar() != null, List.of());
    }

    @Transactional(readOnly = true)
    public String getAvatar(Integer id) {
        return findUser(id).getAvatar();
    }

    private User findUser(Integer id) {
        return users.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
    }
}
