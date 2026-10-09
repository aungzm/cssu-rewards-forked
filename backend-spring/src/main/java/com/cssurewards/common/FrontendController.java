package com.cssurewards.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@ConditionalOnProperty(name = "app.serve-frontend", havingValue = "true")
public class FrontendController {
    private final boolean demoMode;

    public FrontendController(@Value("${app.demo-mode:false}") boolean demoMode) {
        this.demoMode = demoMode;
    }

    @GetMapping(value = "/app-config.js", produces = "application/javascript")
    public ResponseEntity<String> configuration() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
            "window.__APP_CONFIG__ = {\"apiBaseUrl\":\"/api\",\"demoMode\":" + demoMode + "};\n");
    }

    @GetMapping({"/", "/login", "/signup", "/dashboard", "/transaction-history",
        "/redeem-points", "/transfer-points", "/create-transaction", "/process-redemption",
        "/points-history", "/profile", "/user-management", "/my-events", "/promotions",
        "/events", "/edit/events/{eventId}", "/create/event"})
    public String page() {
        return "forward:/index.html";
    }
}
