package com.cssurewards.user;

import com.cssurewards.user.dto.UserResponse;
import com.cssurewards.user.dto.CreateUserRequest;
import com.cssurewards.user.dto.CreatedUserResponse;
import com.cssurewards.user.dto.ChangePasswordRequest;
import com.cssurewards.user.dto.UpdateProfileRequest;
import com.cssurewards.user.dto.UpdateUserRequest;
import com.cssurewards.transaction.TransactionService;
import com.cssurewards.transaction.dto.TransferRequest;
import com.cssurewards.transaction.dto.TransferResponse;
import com.cssurewards.transaction.dto.RedemptionRequest;
import com.cssurewards.transaction.dto.RedemptionResponse;
import com.cssurewards.transaction.dto.TransactionFilters;
import com.cssurewards.event.EventService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.MediaType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {
    private final UserService userService;
    private final TransactionService transactions;
    private final EventService events;

    public UserController(UserService userService, TransactionService transactions, EventService events) {
        this.userService = userService;
        this.transactions = transactions;
        this.events = events;
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

    @PatchMapping("/me")
    public UserResponse updateProfile(Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile((Integer) authentication.getPrincipal(), request);
    }

    @PatchMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> updateAvatar(Authentication authentication,
            @RequestParam("avatar") MultipartFile avatar) throws java.io.IOException {
        return userService.updateAvatar((Integer) authentication.getPrincipal(), avatar);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER', 'SUPERUSER')")
    public Map<String, Object> listUsers(Authentication authentication,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean verified,
            @RequestParam(required = false) Boolean activated,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int limit) {
        return userService.listUsers(name, role, verified, activated, page, limit,
            authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CASHIER")));
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER', 'SUPERUSER')")
    public Map<String, Object> getUser(@PathVariable Integer userId, Authentication authentication) {
        return userService.getUser(userId,
            authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CASHIER")));
    }

    @PatchMapping("/{userId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'SUPERUSER')")
    public Map<String, Object> updateUser(@PathVariable Integer userId, Authentication authentication,
            @Valid @RequestBody UpdateUserRequest request) {
        return userService.updateUser(userId, request,
            authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER")));
    }

    @PostMapping("/{userId}/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public TransferResponse transfer(@PathVariable Integer userId, Authentication authentication,
            @Valid @RequestBody TransferRequest request) {
        return transactions.transfer((Integer) authentication.getPrincipal(), userId, request);
    }

    @PostMapping("/me/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public RedemptionResponse redeem(Authentication authentication,
            @Valid @RequestBody RedemptionRequest request) {
        return transactions.redeem((Integer) authentication.getPrincipal(), request);
    }

    @GetMapping("/me/transactions")
    public Map<String, Object> myTransactions(Authentication authentication,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer relatedId,
            @RequestParam(required = false) Integer promotionId,
            @RequestParam(required = false) Integer amount,
            @RequestParam(required = false) String operator,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return transactions.getMyTransactions((Integer) authentication.getPrincipal(),
            new TransactionFilters(type, relatedId, promotionId, amount, operator, page, limit));
    }

    @GetMapping("/me/events")
    public Map<String, Object> myOrganizedEvents(Authentication authentication,
            @RequestParam(defaultValue = "false") boolean past,
            @RequestParam(required = false) Boolean started,
            @RequestParam(required = false) Boolean ended,
            @RequestParam(required = false) Boolean showFull,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return events.organizedBy((Integer) authentication.getPrincipal(), past, started, ended, showFull, page, limit);
    }

    @GetMapping("/me/events/guest")
    public Map<String, Object> myGuestEvents(Authentication authentication,
            @RequestParam(defaultValue = "false") boolean past,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return events.guestEvents((Integer) authentication.getPrincipal(), past, page, limit);
    }
}
