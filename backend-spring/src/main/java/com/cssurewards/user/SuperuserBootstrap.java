package com.cssurewards.user;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class SuperuserBootstrap implements ApplicationRunner {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final String utorid;
    private final String email;
    private final String password;

    public SuperuserBootstrap(UserRepository users, PasswordEncoder passwords,
            @Value("${BOOTSTRAP_SUPERUSER_UTORID:}") String utorid,
            @Value("${BOOTSTRAP_SUPERUSER_EMAIL:}") String email,
            @Value("${BOOTSTRAP_SUPERUSER_PASSWORD:}") String password) {
        this.users = users;
        this.passwords = passwords;
        this.utorid = utorid;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (utorid.isBlank() && email.isBlank() && password.isBlank()) {
            return;
        }
        if (!utorid.matches("[a-zA-Z0-9]{8}") || !email.matches("[^@]+@mail\\.utoronto\\.ca")
                || password.length() < 8) {
            throw new IllegalStateException("Set a valid bootstrap UTORid, university email, and password (8+ chars)");
        }
        if (users.count() == 0) {
            users.save(new User(utorid, email, passwords.encode(password), RoleType.SUPERUSER));
        }
    }
}
