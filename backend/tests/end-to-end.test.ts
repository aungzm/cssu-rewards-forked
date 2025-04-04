import request from "supertest";
import app from "../index"; // Adjust the import based on your project structure

// State storage for dynamic data (tokens, IDs, etc.)
const userIds: { [key: string]: number } = {};
const userTokens: { [key: string]: string } = {};
const userResetTokens: { [key: string]: string } = {};
const eventIds: { [key: string]: number } = {};
const promotionIds: { [key: string]: number } = {};
const transactionIds: { [key: string]: number } = {};

// Helper function for potential delays needed for time-based tests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("End-to-End API Tests (Strict Order)", () => {
  // Log #1
  it("Log #1: should fail login with invalid credentials (401)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({
        utorid: "clive123",
        password: "NotMyPassword123!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid credentials." });
  });

  // Log #2
  it("Log #2: should fail login with empty body (400)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({})
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.utorid",
          message: "UTORid is required",
        }),
        expect.objectContaining({
          path: "body.password",
          message: "Password is required",
        }),
      ]),
    );
  });

  // Log #3
  it("Log #3: should fail login with missing password (400)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({ utorid: "clive123" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.password",
          message: "Password is required",
        }),
      ]),
    );
  });

  // Log #4
  it("Log #4: should fail login with missing utorid (using email instead) (400)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({
        email: "john.doe@mail.utoronto.ca",
        password: "",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.utorid",
          message: "UTORid is required",
        }),
      ]),
    );
  });

  // Log #5
  it("Log #5: should successfully log in a superuser (200)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({
        utorid: "clive123",
        password: "SuperUser123!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(typeof response.body.token).toBe("string");
    expect(response.body).toHaveProperty("expiresAt");
    userTokens["clive123"] = response.body.token;
    userIds["clive123"] = 1; // Assuming ID 1 from logs
  });

  // Log #6
  it("Log #6: should fail to create user with empty body (400)", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({})
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "body.name", message: "Required" }),
        expect.objectContaining({ path: "body.utorid", message: "Required" }),
        expect.objectContaining({ path: "body.email", message: "Required" }),
      ]),
    );
  });

  // Log #7
  it("Log #7: should fail to create user with null utorid (400)", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        utorid: null,
        name: "John Doe",
        email: "john.doe@mail.utoronto.ca",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.utorid",
          message: "Expected string, received null",
        }),
      ]),
    );
  });

  // Log #8
  it("Log #8: should fail to create user with invalid utorid length (400)", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        utorid: "johndoe666",
        name: "John Doe",
        email: "john.doe@mail.utoronto.ca",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.utorid",
          message: "String must contain exactly 8 character(s)",
        }),
      ]),
    );
  });

  // Log #9
  it("Log #9: should fail to create user with null name (400)", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        utorid: "johndoe1",
        name: null,
        email: "john.doe@mail.utoronto.ca",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.name",
          message: "Expected string, received null",
        }),
      ]),
    );
  });

  // Log #10
  it("Log #10: should fail to create user with empty name (400)", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        utorid: "johndoe1",
        name: "",
        email: "john.doe@mail.utoronto.ca",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.name",
          message: "String must contain at least 1 character(s)",
        }),
      ]),
    );
  });

  // Log #11
  it("Log #11: should fail to create user with too long name (400)", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        utorid: "johndoe1",
        name: "Lorem ipsum dolor sit amet consectetur adipiscing tempo",
        email: "john.doe@mail.utoronto.ca",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.name",
          message: "String must contain at most 50 character(s)",
        }),
      ]),
    );
  });

  // Log #12
  it("Log #12: should fail to create user with null email (400)", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        utorid: "johndoe1",
        name: "John Doe",
        email: null,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.email",
          message: "Expected string, received null",
        }),
      ]),
    );
  });

  // Log #13
  it("Log #13: should fail to create user with invalid email format (400)", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        utorid: "johndoe1",
        name: "John Doe",
        email: "john.doe@",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.email",
          message: "Invalid email",
        }),
        expect.objectContaining({
          path: "body.email",
          message: "Email must be a valid @mail.utoronto.ca address",
        }),
      ]),
    );
  });

  // Log #14
  it("Log #14: should fail to create user with non-utoronto email domain (400)", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        utorid: "johndoe1",
        name: "John Doe",
        email: "john.doe@mail.google.com",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.email",
          message: "Email must be a valid @mail.utoronto.ca address",
        }),
      ]),
    );
  });

  // Log #15
  it("Log #15: should fail to create user with multiple validation errors (400)", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        utorid: "!johndoe666",
        name: "J",
        email: "john.doe@",
        password: "JohnDoe123!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.utorid",
          message: "String must contain exactly 8 character(s)",
        }),
        expect.objectContaining({
          path: "body.utorid",
          message: "UTORid must be alphanumeric",
        }),
        expect.objectContaining({
          path: "body.email",
          message: "Invalid email",
        }),
        expect.objectContaining({
          path: "body.email",
          message: "Email must be a valid @mail.utoronto.ca address",
        }),
      ]),
    );
  });

  // Log #16
  it("Log #16: should successfully create user johndoe1 (201)", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        utorid: "johndoe1",
        name: "John Doe",
        email: "john.doe@mail.utoronto.ca",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(typeof response.body.id).toBe("number");
    expect(response.body).toHaveProperty("resetToken");
    expect(response.body.utorid).toBe("johndoe1");
    expect(response.body.name).toBe("John Doe");
    expect(response.body.email).toBe("john.doe@mail.utoronto.ca");
    expect(response.body.verified).toBe(false);
    userIds["johndoe1"] = response.body.id;
    userResetTokens["johndoe1_activation"] = response.body.resetToken;
  });

  // Log #17
  it("Log #17: should fail to create user with duplicate email (409)", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        utorid: "johndoe1", // Using same utorid as well in log
        name: "John Doe",
        email: "john.doe@mail.utoronto.ca",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "A user with this email already exists.",
    });
  });

  // Log #18
  it("Log #18: should fail login for unactivated user johndoe1 (401)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({
        utorid: "johndoe1",
        password: "JohnDoe123!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid credentials." });
  });

  // Log #19
  it("Log #19: should fail password reset request for non-existent user (404)", async () => {
    const response = await request(app)
      .post("/auth/resets")
      .send({ utorid: "invalid1" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "User not found." });
  });

  // Log #20
  it("Log #20: should fail password reset request with empty body (400)", async () => {
    const response = await request(app)
      .post("/auth/resets")
      .send({})
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.utorid",
          message: "UTORid is required",
        }),
      ]),
    );
  });

  // Log #21
  it("Log #21: should fail password reset request with email instead of utorid (400)", async () => {
    const response = await request(app)
      .post("/auth/resets")
      .send({ email: "john.doe@mail.utoronto.ca" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.utorid",
          message: "UTORid is required",
        }),
      ]),
    );
  });

  // Log #22
  it("Log #22: should successfully request password reset for johndoe1 (202)", async () => {
    const response = await request(app)
      .post("/auth/resets")
      .send({ utorid: "johndoe1" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty("resetToken");
    expect(typeof response.body.resetToken).toBe("string");
    expect(response.body).toHaveProperty("expiresAt");
    expect(response.body.message).toContain(
      "Use the provided token to reset your password",
    );
    userResetTokens["johndoe1_req"] = response.body.resetToken;
  });

  // Log #23
  it("Log #23: should fail password reset with activation token (404)", async () => {
    const activationToken = userResetTokens["johndoe1_activation"];
    const response = await request(app)
      .post(`/auth/resets/${activationToken}`)
      .send({
        utorid: "johndoe1",
        password: "JohnDoe123!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Invalid reset token." });
  });

  // Log #24
  it("Log #24: should fail password reset with invalid token string (404)", async () => {
    const response = await request(app)
      .post("/auth/resets/invalid_token")
      .send({
        utorid: "johndoe1",
        password: "JohnDoe123!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Invalid reset token." });
  });

  // Log #25
  it("Log #25: should fail password reset when token does not match user (401)", async () => {
    const resetToken = userResetTokens["johndoe1_req"];
    const response = await request(app)
      .post(`/auth/resets/${resetToken}`)
      .send({
        utorid: "clive123",
        password: "JohnDoe123!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Token does not match the user." });
  });

  // Log #26
  it("Log #26: should fail password reset with empty body (400)", async () => {
    const resetToken = userResetTokens["johndoe1_req"];
    const response = await request(app)
      .post(`/auth/resets/${resetToken}`)
      .send({})
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.utorid",
          message: "UTORid is required",
        }),
        expect.objectContaining({
          path: "body.password",
          message: "Password is required",
        }),
      ]),
    );
  });

  // Log #27
  it("Log #27: should fail password reset with weak password (400)", async () => {
    const resetToken = userResetTokens["johndoe1_req"];
    const response = await request(app)
      .post(`/auth/resets/${resetToken}`)
      .send({
        utorid: "johndoe1",
        password: "john",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.password",
          message: "Password must be at least 8 characters",
        }),
        expect.objectContaining({
          path: "body.password",
          message: "Password must contain at least one uppercase letter",
        }),
        expect.objectContaining({
          path: "body.password",
          message: "Password must contain at least one number",
        }),
        expect.objectContaining({
          path: "body.password",
          message: "Password must contain at least one special character",
        }),
      ]),
    );
  });

  // Log #28
  it("Log #28: should fail password reset with too long password (400)", async () => {
    const resetToken = userResetTokens["johndoe1_req"];
    const response = await request(app)
      .post(`/auth/resets/${resetToken}`)
      .send({
        utorid: "johndoe1",
        password:
          "JohnDoe123!0JohnDoe123!0JohnDoe123!0JohnDoe123!0JohnDoe123!0JohnDoe123!0JohnDoe123!0JohnDoe123!0JohnDoe123!0JohnDoe123!0",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.password",
          message: "Password cannot exceed 20 characters",
        }),
      ]),
    );
  });

  // Log #29
  it("Log #29: should fail password reset with password missing required characters (400)", async () => {
    const resetToken = userResetTokens["johndoe1_req"];
    const response = await request(app)
      .post(`/auth/resets/${resetToken}`)
      .send({
        utorid: "johndoe1",
        password: "123123123123123123",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.password",
          message: "Password must contain at least one uppercase letter",
        }),
        expect.objectContaining({
          path: "body.password",
          message: "Password must contain at least one lowercase letter",
        }),
        expect.objectContaining({
          path: "body.password",
          message: "Password must contain at least one special character",
        }),
      ]),
    );
  });

  // Log #30
  it("Log #30: should fail password reset with null values (400)", async () => {
    const resetToken = userResetTokens["johndoe1_req"];
    const response = await request(app)
      .post(`/auth/resets/${resetToken}`)
      .send({
        utorid: null,
        password: null,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.utorid",
          message: "UTORid must be a string",
        }),
        expect.objectContaining({
          path: "body.password",
          message: "Password must be a string",
        }),
      ]),
    );
  });

  // Log #31
  it("Log #31: should successfully reset password for johndoe1 (200)", async () => {
    const resetToken = userResetTokens["johndoe1_req"];
    const response = await request(app)
      .post(`/auth/resets/${resetToken}`)
      .send({
        utorid: "johndoe1",
        password: "JohnDoe123!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message:
        "Password reset successful. You may now log in with your new password.",
    });
  });

  // Log #32
  it("Log #32: should successfully log in johndoe1 with new password (200)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({
        utorid: "johndoe1",
        password: "JohnDoe123!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(typeof response.body.token).toBe("string");
    userTokens["johndoe1"] = response.body.token;
  });

  // Log #33
  it("Log #33: should fail user creation as a regular user (403)", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${userTokens["johndoe1"]}`)
      .send({
        utorid: "janedoe1",
        name: "Jane Doe",
        email: "janedoe@mail.utoronto.ca",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden. Requires cashier or higher.",
    });
  });

  // --- Bulk User Creation (Logs #34-53) ---
  const mockUsers: Array<{ utorid: string; name: string; email: string }> = [];
  for (let i = 0; i < 20; i++) {
    mockUsers.push({
      utorid: `mock${i.toString().padStart(4, "0")}`,
      name: `Mock User ${i}`,
      email: `mock.user${i.toString().padStart(2, "0")}@mail.utoronto.ca`,
    });
  }

  mockUsers.forEach((user, index) => {
    const logId = 34 + index;
    it(`Log #${logId}: should create mock user ${index} (${user.utorid}) (201)`, async () => {
      const response = await request(app)
        .post("/users")
        .set("Authorization", `Bearer ${userTokens["clive123"]}`)
        .send(user)
        .set("Content-Type", "application/json");

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.utorid).toBe(user.utorid);
      expect(response.body).toHaveProperty("resetToken");
      userIds[user.utorid] = response.body.id;
      userResetTokens[`${user.utorid}_activation`] = response.body.resetToken;
    });
  });

  // --- Bulk User Activation (Logs #54-73) ---
  mockUsers.forEach((user, index) => {
    const logId = 54 + index;
    it(`Log #${logId}: should activate mock user ${index} (${user.utorid}) via reset (200)`, async () => {
      const activationToken = userResetTokens[`${user.utorid}_activation`];
      const response = await request(app)
        .post(`/auth/resets/${activationToken}`)
        .send({
          utorid: user.utorid,
          password: "MockUser123!",
        })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message:
          "Password reset successful. You may now log in with your new password.",
      });
    });
  });

  // Log #74
  it("Log #74: should fail to get users as regular user (403)", async () => {
    const response = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${userTokens["johndoe1"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Insufficient clearance" });
  });

  // Log #75
  it("Log #75: should fail to get users with invalid page number (400)", async () => {
    const response = await request(app)
      .get("/users")
      .query({ page: -1 })
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "query.page",
          message: "Number must be greater than 0",
        }),
      ]),
    );
  });

  // Log #76
  it("Log #76: should get first page of users (default limit 10) (200)", async () => {
    const response = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("count", 22);
    expect(response.body).toHaveProperty("results");
    expect(Array.isArray(response.body.results)).toBe(true);
    expect(response.body.results.length).toBe(10);
    expect(response.body.results[0].utorid).toBe("mock0019");
    expect(response.body.results[9].utorid).toBe("mock0010");
  });

  // Log #77
  it("Log #77: should get users filtered by name (200)", async () => {
    const response = await request(app)
      .get("/users")
      .query({ name: "John Doe" })
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.results.length).toBe(1);
    expect(response.body.results[0].name).toBe("John Doe");
    expect(response.body.results[0].utorid).toBe("johndoe1");
  });

  // Log #78
  it("Log #78: should get users filtered by role (regular) (200)", async () => {
    const response = await request(app)
      .get("/users")
      .query({ role: "regular" })
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(21);
    expect(response.body.results.length).toBe(10);
    response.body.results.forEach((user: any) => {
      expect(user.role).toBe("REGULAR");
    });
  });

  // Log #79
  it("Log #79: should get users filtered by verified=true (200)", async () => {
    const response = await request(app)
      .get("/users")
      .query({ verified: "true" })
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.results.length).toBe(1);
    expect(response.body.results[0].verified).toBe(true);
    expect(response.body.results[0].utorid).toBe("clive123");
  });

  // Log #80
  it("Log #80: should get users filtered by activated=false (verified=false) (200)", async () => {
    const response = await request(app)
      .get("/users")
      .query({ verified: "false" }) // Using verified based on log response
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    // At this point, only johndoe1 is unverified among the non-mock users
    // The mock users were created but not verified yet in the logs
    expect(response.body.count).toBe(21); // 20 mocks + johndoe1
    expect(response.body.results.length).toBe(10);
    response.body.results.forEach((user: any) => {
      expect(user.verified).toBe(false);
    });
  });

  // Log #81
  it("Log #81: should get page 3 of users (200)", async () => {
    const response = await request(app)
      .get("/users")
      .query({ page: 3 })
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(22);
    expect(response.body.results.length).toBe(2);
    expect(response.body.results[0].utorid).toBe("johndoe1");
    expect(response.body.results[1].utorid).toBe("clive123");
  });

  // Log #82
  it("Log #82: should get users with limit 5 (200)", async () => {
    const response = await request(app)
      .get("/users")
      .query({ limit: 5 })
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(22);
    expect(response.body.results.length).toBe(5);
    expect(response.body.results[0].utorid).toBe("mock0019");
    expect(response.body.results[4].utorid).toBe("mock0015");
  });

  // Log #83
  it("Log #83: should fail to update user with empty body (400)", async () => {
    const userId = userIds["johndoe1"]; // ID is 2 from log #16
    const response = await request(app)
      .patch(`/users/${userId}`)
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({})
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body",
          message: "At least one field must be provided",
        }),
      ]),
    );
  });

  // Log #84
  it("Log #84: should fail to update user with invalid email (400)", async () => {
    const userId = userIds["johndoe1"];
    const response = await request(app)
      .patch(`/users/${userId}`)
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        email: "invalid@",
        verified: null,
        suspicious: null,
        role: null,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.email",
          message: "Invalid email",
        }),
        expect.objectContaining({
          path: "body.email",
          message: "Email must be a valid @mail.utoronto.ca address",
        }),
      ]),
    );
  });

  // Log #85
  it("Log #85: should fail to update user verified status to false (400)", async () => {
    const userId = userIds["johndoe1"];
    const response = await request(app)
      .patch(`/users/${userId}`)
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        email: null,
        verified: false,
        suspicious: null,
        role: null,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid verified value." });
  });

  // Log #86
  it("Log #86: should fail to update user role to invalid value (400)", async () => {
    const userId = userIds["johndoe1"];
    const response = await request(app)
      .patch(`/users/${userId}`)
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        email: null,
        verified: null,
        suspicious: null,
        role: "boss",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.role",
          message:
            "Invalid enum value. Expected 'regular' | 'cashier' | 'manager' | 'superuser', received 'boss'",
        }),
      ]),
    );
  });

  // Log #87
  it("Log #87: should fail to update user with invalid data types (400)", async () => {
    const userId = userIds["johndoe1"];
    const response = await request(app)
      .patch(`/users/${userId}`)
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        email: 123,
        verified: "WHAT",
        suspicious: null,
        role: "superuser",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.email",
          message: "Expected string, received number",
        }),
        expect.objectContaining({
          path: "body.verified",
          message: "Expected boolean, received string",
        }),
      ]),
    );
  });

  // Log #88
  it("Log #88: should successfully update user johndoe1 to manager and verified (200)", async () => {
    const userId = userIds["johndoe1"];
    const response = await request(app)
      .patch(`/users/${userId}`)
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .send({
        email: "john.doe@mail.utoronto.ca",
        verified: true,
        suspicious: null,
        role: "manager",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: userId,
      utorid: "johndoe1",
      name: "John Doe",
      email: "john.doe@mail.utoronto.ca",
      role: "MANAGER",
      verified: true,
    });
  });

  // Log #89 - Login as Manager (using original password before change)
  it("Log #89: should successfully log in johndoe1 as manager (using original password) (200)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({
        utorid: "johndoe1",
        password: "JohnDoe123!", // Password before change in log #124
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    userTokens["johndoe1_manager_temp"] = response.body.token; // Store temp token
  });

  // Log #90
  it("Log #90: should fail for manager trying to promote user to manager (403)", async () => {
    const targetUserId = userIds["mock0000"]; // ID is 3 from log #34
    const response = await request(app)
      .patch(`/users/${targetUserId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        role: "manager",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden. Managers cannot promote users to Manager or Superuser.",
    });
  });

  // --- Bulk Verify Users (Logs #91-110) ---
  mockUsers.forEach((user, index) => {
    const logId = 91 + index;
    it(`Log #${logId}: should verify mock user ${index} (${user.utorid}) (200)`, async () => {
      const userId = userIds[user.utorid];
      const response = await request(app)
        .patch(`/users/${userId}`)
        .set("Authorization", `Bearer ${userTokens["clive123"]}`)
        .send({
          verified: true,
        })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: userId,
        utorid: user.utorid,
        verified: true,
      });
    });
  });

  // Log #111
  it("Log #111: should successfully promote mock0000 to cashier by manager (200)", async () => {
    const targetUserId = userIds["mock0000"];
    const response = await request(app)
      .patch(`/users/${targetUserId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        role: "cashier",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: targetUserId,
      utorid: "mock0000",
      role: "CASHIER",
      suspicious: false, // Assuming default is false
    });
  });

  // Log #112
  it("Log #112: should successfully mark mock0000 as suspicious by manager (200)", async () => {
    const targetUserId = userIds["mock0000"];
    const response = await request(app)
      .patch(`/users/${targetUserId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        suspicious: true,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: targetUserId,
      utorid: "mock0000",
      suspicious: true,
    });
  });

  // Log #113 - Login mock0001 (now verified)
  it("Log #113: should log in mock0001 (verified) (200)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({ utorid: "mock0001", password: "MockUser123!" })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(200);
    userTokens["mock0001"] = response.body.token;
  });

  // Log #114
  it("Log #114: should fail for regular user getting another user's details (403)", async () => {
    const targetUserId = userIds["johndoe1"];
    const response = await request(app)
      .get(`/users/${targetUserId}`)
      .set("Authorization", `Bearer ${userTokens["mock0001"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden. Requires cashier or higher.",
    });
  });

  // Log #115
  it("Log #115: should get user details (mock0001) as manager (200)", async () => {
    const targetUserId = userIds["mock0001"]; // ID is 4
    const response = await request(app)
      .get(`/users/${targetUserId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(targetUserId);
    expect(response.body.utorid).toBe("mock0001");
    expect(response.body.role).toBe("REGULAR"); // Role not changed yet in this flow
    expect(response.body).toHaveProperty("password");
    expect(response.body).toHaveProperty("lastLogin");
    expect(response.body.verified).toBe(true); // Verified in logs 91-110
  });

  // Log #116
  it("Log #116: should get user details (mock0001) as superuser (200)", async () => {
    const targetUserId = userIds["mock0001"];
    const response = await request(app)
      .get(`/users/${targetUserId}`)
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(targetUserId);
    expect(response.body.utorid).toBe("mock0001");
    expect(response.body).toHaveProperty("password");
    expect(response.body.verified).toBe(true);
  });

  // Log #117
  it("Log #117: should fail changing password with incorrect old password (403)", async () => {
    const response = await request(app)
      .patch("/users/me/password")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        old: "!321JohnDor123!",
        new: "JohnDoe123!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Old password is incorrect." });
  });

  // Log #118
  it("Log #118: should fail changing password with empty body (400)", async () => {
    const response = await request(app)
      .patch("/users/me/password")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({})
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "body.old", message: "Required" }),
        expect.objectContaining({ path: "body.new", message: "Required" }),
      ]),
    );
  });

  // Log #119
  it("Log #119: should fail changing password with null old password (400)", async () => {
    const response = await request(app)
      .patch("/users/me/password")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        old: null,
        new: "JohnDoe123!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.old",
          message: "Expected string, received null",
        }),
      ]),
    );
  });

  // Log #120
  it("Log #120: should fail changing password with null new password (400)", async () => {
    const response = await request(app)
      .patch("/users/me/password")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        old: "JohnDoe123!",
        new: null,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.new",
          message: "Expected string, received null",
        }),
      ]),
    );
  });

  // Log #121
  it("Log #121: should fail changing password to weak new password (400)", async () => {
    const response = await request(app)
      .patch("/users/me/password")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        old: "JohnDoe123!",
        new: "J1!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.new",
          message: "String must contain at least 8 character(s)",
        }),
        // Other validation messages might appear
      ]),
    );
  });

  // Log #122
  it("Log #122: should fail changing password to too long new password (400)", async () => {
    const response = await request(app)
      .patch("/users/me/password")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        old: "JohnDoe123!",
        new: "JohnDoe123!JohnDoe123!JohnDoe123!JohnDoe123!JohnDoe123!JohnDoe123!JohnDoe123!JohnDoe123!JohnDoe123!JohnDoe123!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.new",
          message: "String must contain at most 20 character(s)",
        }),
      ]),
    );
  });

  // Log #123
  it("Log #123: should fail changing password to new password missing required characters (400)", async () => {
    const response = await request(app)
      .patch("/users/me/password")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        old: "JohnDoe123!",
        new: "123123123123!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        // Check for specific missing character type messages if applicable
        expect.objectContaining({ path: "body.new" }),
      ]),
    );
  });

  // Log #124
  it("Log #124: should successfully change password for johndoe1 (200)", async () => {
    const response = await request(app)
      .patch("/users/me/password")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        old: "JohnDoe123!",
        new: "!1FancyPassword2!",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Password updated successfully." });
  });

  // Log #125 - Login mock0000 (cashier)
  it("Log #125: should log in mock0000 as cashier (200)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({ utorid: "mock0000", password: "MockUser123!" })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(200);
    userTokens["mock0000_cashier"] = response.body.token;
  });

  // Log #126
  it("Log #126: should fail updating self with empty body (400)", async () => {
    const response = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .send({})
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body",
          message: "At least one field must be provided with a non-null value",
        }),
      ]),
    );
  });

  // Log #127
  it("Log #127: should fail updating self with all null body (400)", async () => {
    const response = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .send({
        name: null,
        email: null,
        birthday: null,
        avatar: null,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body",
          message: "At least one field must be provided with a non-null value",
        }),
      ]),
    );
  });

  // Log #128
  it("Log #128: should fail updating self with too long name (400)", async () => {
    const response = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .send({
        name: "Mock UserMock UserMock UserMock UserMock UserMock UserMock UserMock UserMock UserMock User",
        email: null,
        birthday: null,
        avatar: null,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.name",
          message: "String must contain at most 50 character(s)",
        }),
      ]),
    );
  });

  // Log #129
  it("Log #129: should fail updating self with non-utoronto email (400)", async () => {
    const response = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .send({
        name: null,
        email: "m.1@google.com",
        birthday: null,
        avatar: null,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.email",
          message: "Email must be a valid @mail.utoronto.ca address",
        }),
      ]),
    );
  });

  // Log #130
  it("Log #130: should fail updating self with invalid birthday month/day (400)", async () => {
    const response = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .send({
        name: null,
        email: null,
        birthday: "1990-13-41",
        avatar: null,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.birthday",
          message: "Invalid date. Please provide a valid calendar date.",
        }),
      ]),
    );
  });

  // Log #131
  it("Log #131: should fail updating self with invalid birthday day (400)", async () => {
    const response = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .send({
        name: null,
        email: null,
        birthday: "1990-02-31",
        avatar: null,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.birthday",
          message: "Invalid date. Please provide a valid calendar date.",
        }),
      ]),
    );
  });

  // Log #132
  it("Log #132: should fail updating self with non-date birthday string (400)", async () => {
    const response = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .send({
        name: null,
        email: null,
        birthday: "Apple and Banana",
        avatar: null,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.birthday",
          message: "Invalid date. Please provide a valid calendar date.",
        }),
      ]),
    );
  });

  // Log #133
  it("Log #133: should successfully update self birthday (200)", async () => {
    const response = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .send({
        name: null,
        email: null,
        birthday: "1987-06-05",
        avatar: null,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: userIds["mock0000"],
      utorid: "mock0000",
      birthday: "1987-06-05",
      role: "CASHIER",
      verified: true, // Was verified in bulk step
    });
  });

  // Log #134 - Re-login mock0000
  it("Log #134: should re-login mock0000 as cashier (200)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({ utorid: "mock0000", password: "MockUser123!" })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(200);
    userTokens["mock0000_cashier"] = response.body.token; // Update token if necessary
  });

  // Log #135
  it("Log #135: should get own user details (mock0000) (200)", async () => {
    const response = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(userIds["mock0000"]);
    expect(response.body.utorid).toBe("mock0000");
    expect(response.body.birthday).toContain("1987-06-05");
    expect(response.body.role).toBe("CASHIER");
    expect(response.body).toHaveProperty("lastLogin");
    expect(response.body).toHaveProperty("points");
  });

  // --- Event Management (Logs #136-...) ---

  // Log #136
  it("Log #136: should fail event creation as cashier (403)", async () => {
    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .send({
        name: "Test Event Forbidden",
        description: "Creating event with insufficient permissions",
        location: "Test Location",
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 172800000).toISOString(),
        capacity: 10,
        points: 100,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Insufficient clearance" });
  });

  // Log #137
  it("Log #137: should fail event creation with invalid token (401)", async () => {
    const response = await request(app)
      .post("/events")
      .set("Authorization", "Bearer invalid")
      .send({
        name: "Test Event Unauthorized",
        description: "Creating event without token",
        location: "Test Location",
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 172800000).toISOString(),
        capacity: 10,
        points: 100,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid or expired token." });
  });

  // Log #138
  it("Log #138: should fail event creation with empty body (400)", async () => {
    // Need manager token - use the temp one from log #89
    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({})
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "body.name", message: "Required" }),
        expect.objectContaining({
          path: "body.description",
          message: "Required",
        }),
        expect.objectContaining({ path: "body.location", message: "Required" }),
        expect.objectContaining({
          path: "body.startTime",
          message: "Required",
        }),
        expect.objectContaining({ path: "body.endTime", message: "Required" }),
        expect.objectContaining({ path: "body.points", message: "Required" }),
      ]),
    );
  });

  // Log #139
  it("Log #139: should fail event creation with missing name/description (400)", async () => {
    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        location: "Test Location",
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 172800000).toISOString(),
        capacity: 10,
        points: 100,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "body.name", message: "Required" }),
        expect.objectContaining({
          path: "body.description",
          message: "Required",
        }),
      ]),
    );
  });

  // Log #140
  it("Log #140: should fail event creation with invalid startTime (400)", async () => {
    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: "Test Event Invalid Start Time",
        description: "Creating event with invalid start time",
        location: "Test Location",
        startTime: "invalid",
        endTime: new Date(Date.now() + 172800000).toISOString(),
        capacity: 10,
        points: 100,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.startTime",
          message: "startTime must be valid ISO8601 date",
        }),
      ]),
    );
  });

  // Log #141
  it("Log #141: should fail event creation with endTime before startTime (400)", async () => {
    const startTime = new Date(Date.now() + 172800000).toISOString();
    const endTime = new Date(Date.now() + 86400000).toISOString();
    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: "Test Event End Time Before Start Time",
        description: "Creating event with end time before start time",
        location: "Test Location",
        startTime: startTime,
        endTime: endTime,
        capacity: 10,
        points: 100,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "endTime must be after startTime" });
  });

  // Log #142
  it("Log #142: should fail event creation with negative capacity (400)", async () => {
    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: "Test Event Negative Capacity",
        description: "Creating event with negative capacity",
        location: "Test Location",
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 172800000).toISOString(),
        capacity: -1,
        points: 100,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.capacity",
          message: "capacity must be a non-negative integer",
        }),
      ]),
    );
  });

  // Log #143
  it("Log #143: should fail event creation with negative points (400)", async () => {
    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: "Test Event Negative Points",
        description: "Creating event with negative points",
        location: "Test Location",
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 172800000).toISOString(),
        capacity: 10,
        points: -100,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.points",
          message: "points must be a positive integer",
        }),
      ]),
    );
  });

  // --- Bulk Event Creation (Logs #144-155) ---
  const eventTimes: Array<{ start: string; end: string }> = [];
  const baseTime = Date.now() + 3000; // Start slightly in the future
  eventTimes.push({
    start: new Date(baseTime + 3000).toISOString(), // Event 0 (short duration)
    end: new Date(baseTime + 4000).toISOString(),
  });
  for (let i = 1; i <= 11; i++) {
    eventTimes.push({
      start: new Date(baseTime + i * 10000).toISOString(), // Events 1-11
      end: new Date(baseTime + (i + 1) * 10000).toISOString(),
    });
  }

  it(`Log #144: should create Event 0 with null capacity (201)`, async () => {
    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: "Event 0",
        description: "Creating event 0",
        location: "Bahen Centre",
        startTime: eventTimes[0].start,
        endTime: eventTimes[0].end,
        capacity: null,
        points: 100,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.name).toBe("Event 0");
    expect(response.body.capacity).toBeNull();
    eventIds["Event 0"] = response.body.id;
  });

  for (let i = 1; i <= 11; i++) {
    const logId = 144 + i;
    it(`Log #${logId}: should create Event ${i.toString().padStart(2, "0")} (201)`, async () => {
      const eventName = `Event ${i.toString().padStart(2, "0")}`;
      const response = await request(app)
        .post("/events")
        .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
        .send({
          name: eventName,
          description: `Creating event ${i.toString().padStart(2, "0")}`,
          location: "Bahen Centre",
          startTime: eventTimes[i].start,
          endTime: eventTimes[i].end,
          capacity: 5,
          points: 100,
        })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe(eventName);
      expect(response.body.capacity).toBe(5);
      eventIds[eventName] = response.body.id;
    });
  }

  // Log #156
  it("Log #156: should fail adding non-existent user as organizer (404)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .post(`/events/${eventId}/organizers`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ utorid: "invalid0" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "User not found" });
  });

  // Log #157
  it("Log #157: should fail adding organizer to non-existent event (404)", async () => {
    const response = await request(app)
      .post("/events/123/organizers")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ utorid: "mock0000" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event not found" });
  });

  // Log #158
  it("Log #158: should add mock0000 as organizer to Event 0 (201)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .post(`/events/${eventId}/organizers`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ utorid: "mock0000" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(eventId);
    expect(response.body.organizers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: userIds["mock0000"],
          utorid: "mock0000",
        }),
      ]),
    );
  });

  // --- Add Organizers Bulk (Logs #159-168) ---
  for (let i = 2; i <= 11; i++) {
    const logId = 157 + i; // Starts from 159
    const eventName = `Event ${i.toString().padStart(2, "0")}`;
    it(`Log #${logId}: should add mock0000 as organizer to ${eventName} (ID: ${eventIds[eventName]}) (201)`, async () => {
      const eventId = eventIds[eventName];
      const response = await request(app)
        .post(`/events/${eventId}/organizers`)
        .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
        .send({ utorid: "mock0000" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(eventId);
      expect(response.body.organizers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ utorid: "mock0000" }),
        ]),
      );
    });
  }

  // Log #169
  it("Log #169: should fail updating event points as cashier (403)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .send({ points: 200 })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Insufficient clearance" });
  });

  // Log #170
  it("Log #170: should fail publishing event as cashier (403)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .send({ published: true })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Insufficient clearance" });
  });

  // Log #171
  it("Log #171: should fail updating event with negative points (400)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ points: -200 })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.points",
          message: "points must be a positive integer",
        }),
      ]),
    );
  });

  // Log #172
  it("Log #172: should fail updating event startTime to the past (400)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ startTime: "2025-03-27T01:58:03.663Z" }) // Past time from log
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Cannot set a start time in the past",
    });
  });

  // Log #173
  it("Log #173: should fail updating event with negative capacity (400)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ capacity: -10 })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.capacity",
          message: "capacity must be a non-negative integer",
        }),
      ]),
    );
  });

  // Log #174
  it("Log #174: should successfully update event points (200)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ points: 100 })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: eventId,
      pointsRemain: 100,
    });
  });

  // Log #175
  it("Log #175: should successfully publish Event 0 (200)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ published: true })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: eventId,
      published: true,
    });
  });

  // Log #176
  it("Log #176: should fail update event with null body (400)", async () => {
    const eventId = eventIds["Event 03"]; // ID is 4
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send(undefined) // Sending null body
      .set("Content-Type", "application/json");
    
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Request body cannot be empty. At least one field must be provided.",
        }),
      ]),
    );
  });

  // Log #177
  it("Log #177: should fail updating event with all null values (400)", async () => {
    const eventId = eventIds["Event 03"]; // ID is 4
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: null,
        description: null,
        location: null,
        startTime: null,
        endTime: null,
        capacity: null,
        points: null,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Request body cannot have all fields set to null. At least one field must have a value.",
        }),
      ]),
    );
  });

  // Log #178
  it("Log #178: should successfully update startTime for unpublished event (Event 03) (200)", async () => {
    const eventId = eventIds["Event 03"]; // ID is 4
    const newStartTime = new Date(Date.now() + 10000).toISOString(); // 10 seconds in the future
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ startTime: newStartTime })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: eventId,
      startTime: newStartTime,
    });
    eventTimes[3].start = newStartTime; // Update local state if needed
  });

  // Log #179
  it("Log #179: should get unpublished events (200)", async () => {
    const response = await request(app)
      .get("/events")
      .query({ published: "false" })
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    // Event 01 (ID 2) and Event 11 (ID 12) are unpublished
    expect(response.body.count).toBe(11); // Log shows 11? Let's re-check publishing
    // Logs 178-186 publish events 3-11 (IDs 3-11)
    // Event 0 (ID 1) was published in log 175
    // Event 01 (ID 2) was NOT published
    // Event 11 (ID 12) was NOT published
    // So, only 2 should be unpublished. The log response seems incorrect here.
    // Let's assert based on expected logic (2 unpublished)
    const unpublishedEvents = response.body.results.filter(
      (e: any) => !e.published,
    );
    // Adjusting expectation based on log output, though it seems inconsistent
    expect(response.body.count).toBe(11);
    expect(response.body.results.length).toBe(10); // Default limit
    // Check if Event 01 and Event 11 are *not* in the first 10 results if count is truly 11
  });

  // --- Bulk Publish Events (Logs #178-186) ---
  for (let i = 2; i <= 10; i++) {
    const logId = 176 + i; // Starts from 178
    const eventName = `Event ${i.toString().padStart(2, "0")}`;
    it(`Log #${logId}: should publish ${eventName} (ID: ${eventIds[eventName]}) (200)`, async () => {
      const eventId = eventIds[eventName];
      const response = await request(app)
        .patch(`/events/${eventId}`)
        .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
        .send({ published: true })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: eventId,
        published: true,
      });
    });
  }

  // Log #189
  it("Log #189: should fail adding organizer as guest (400)", async () => {
    const eventId = eventIds["Event 0"]; // ID 1
    const response = await request(app)
      .post(`/events/${eventId}/guests`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ utorid: "mock0000" }) // mock0000 was organizer in log #158
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "User is currently an organizer; remove them as organizer first",
    });
  });

  // Log #190
  it("Log #190: should fail getting events with invalid limit (400)", async () => {
    const response = await request(app)
      .get("/events")
      .query({ limit: -1 })
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "query.limit",
          message: "Number must be greater than 0",
        }),
      ]),
    );
  });

  // Log #191
  it("Log #191: should fail getting events with invalid page (400)", async () => {
    const response = await request(app)
      .get("/events")
      .query({ page: -1 })
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "query.page",
          message: "Number must be greater than 0",
        }),
      ]),
    );
  });

  // Log #192
  it("Log #192: should get published events as cashier (200)", async () => {
    const response = await request(app)
      .get("/events")
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    // Events 0, 2-10 are published = 10 events
    expect(response.body.count).toBe(10);
    expect(response.body.results.length).toBe(10);
    // Check sorting if necessary
  });

  // --- Add Guests Bulk (Logs #191-194) ---
  const guestsToAdd = ["mock0001", "mock0002", "mock0003", "mock0004"];
  guestsToAdd.forEach((utorid, index) => {
    const logId = 191 + index;
    it(`Log #${logId}: should add ${utorid} as guest to Event 0 (201)`, async () => {
      const eventId = eventIds["Event 0"]; // ID 1
      const response = await request(app)
        .post(`/events/${eventId}/guests`)
        .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
        .send({ utorid })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(eventId);
      expect(response.body.guestAdded).toMatchObject({ utorid });
      expect(response.body.numGuests).toBe(index + 1);
    });
  });

  // Log #197
  it("Log #197: should fail adding organizer who is already a guest (400)", async () => {
    const eventId = eventIds["Event 0"]; // ID 1
    const response = await request(app)
      .post(`/events/${eventId}/organizers`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ utorid: "mock0002" }) // Added as guest in log #192
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:
        "User is currently a guest; remove them as a guest first before adding as an organizer",
    });
  });

  // Log #198
  it("Log #198: should fail removing organizer as regular user (403)", async () => {
    const eventId = eventIds["Event 0"]; // ID 1
    const organizerUserId = userIds["mock0000"]; // ID 3 (added in log #158)
    const response = await request(app)
      .delete(`/events/${eventId}/organizers/${organizerUserId}`)
      .set("Authorization", `Bearer ${userTokens["mock0001"]}`) // Regular user
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Insufficient clearance" });
  });

  // Log #199
  it("Log #199: should remove mock0000 as organizer from Event 0 (204)", async () => {
    const eventId = eventIds["Event 0"]; // ID 1
    const organizerUserId = userIds["mock0000"]; // ID 3
    const response = await request(app)
      .delete(`/events/${eventId}/organizers/${organizerUserId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(204);
  });

  // --- Event Ended Restrictions (Logs #198-204) ---
  // Wait for Event 0 to end
  it("should wait for Event 0 to end", async () => {
    const endTime = new Date(eventTimes[0].end).getTime();
    const waitTime = endTime - Date.now() + 100; // Wait 100ms past end time
    if (waitTime > 0) {
      await delay(waitTime);
    }
    expect(Date.now()).toBeGreaterThan(endTime);
  });

  // Log #200
  it("Log #200: should fail updating name after event ended (400)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ name: "Event 0 - Ended" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Cannot update name after the event has started.",
    });
  });

  // Log #201
  it("Log #201: should fail updating description after event ended (400)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ description: "Event 0 has ended" })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Cannot update description after the event has started.",
    });
  });

  // Log #202
  it("Log #202: should fail updating location after event ended (400)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ location: "Event 0 has ended" })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Cannot update location after the event has started.",
    });
  });

  // Log #203
  it("Log #203: should fail updating startTime after event ended (400)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ startTime: "2025-03-27T01:58:08.904Z" }) // Past time
      .set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Cannot set a start time in the past",
    });
  });

  // Log #204
  it("Log #204: should fail updating capacity after event ended (400)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ capacity: 10 })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Cannot update capacity after the event has started.",
    });
  });

  // Log #205
  it("Log #205: should fail adding organizer after event ended (410)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .post(`/events/${eventId}/organizers`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ utorid: "mock0000" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(410);
    expect(response.body).toEqual({ error: "Event has ended" });
  });

  // Log #206
  it("Log #206: should fail adding guest after event ended (410)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .post(`/events/${eventId}/guests`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ utorid: "mock0000" }) // Trying to add anyone
      .set("Content-Type", "application/json");

    expect(response.status).toBe(410);
    expect(response.body).toEqual({ error: "Event has ended" });
  });

  // Log #207
  it("Log #207: should fail deleting a published event (Event 10) (400)", async () => {
    const eventId = eventIds["Event 10"]; // ID 11, published in log #186
    const response = await request(app)
      .delete(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Cannot delete a published event",
    });
  });

  // Log #208
  it("Log #208: should update points for unpublished event (Event 11) (200)", async () => {
    const eventId = eventIds["Event 11"]; // ID 12, not published
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ points: 200 })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: eventId, pointsRemain: 200 });
  });

  // Log #209
  it("Log #209: should successfully delete an unpublished event (Event 11) (204)", async () => {
    const eventId = eventIds["Event 11"]; // ID 12
    const response = await request(app)
      .delete(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(204);
    delete eventIds["Event 11"];
  });

  // Log #210 - Login mock0002
  it("Log #210: should log in mock0002 (200)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({ utorid: "mock0002", password: "MockUser123!" })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(200);
    userTokens["mock0002"] = response.body.token;
  });

  // Log #211
  it("Log #211: should fail self RSVP for ended event (Event 0) (410)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .post(`/events/${eventId}/guests/me`)
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(410);
    expect(response.body).toEqual({ error: "Event has ended" });
  });

  // Log #212
  it("Log #212: should self RSVP for Event 02 (201)", async () => {
    const eventId = eventIds["Event 02"]; // ID 3
    const response = await request(app)
      .post(`/events/${eventId}/guests/me`)
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(eventId);
    expect(response.body.guestAdded).toMatchObject({ utorid: "mock0002" });
    expect(response.body.numGuests).toBe(1);
  });

  // Log #213
  it("Log #213: should get event details (Event 02) showing guest (200)", async () => {
    const eventId = eventIds["Event 02"];
    const response = await request(app)
      .get(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.guests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ utorid: "mock0002" }),
      ]),
    );
  });

  // Log #214
  it("Log #214: should fail self un-RSVP for ended event (Event 0) (410)", async () => {
    const eventId = eventIds["Event 0"];
    const response = await request(app)
      .delete(`/events/${eventId}/guests/me`)
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(410);
    expect(response.body).toEqual({ error: "Event has ended" });
  });

  // Log #215
  it("Log #215: should self un-RSVP from Event 02 (204)", async () => {
    const eventId = eventIds["Event 02"];
    const response = await request(app)
      .delete(`/events/${eventId}/guests/me`)
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(204);
  });

  // Log #216
  it("Log #216: should get event details (Event 02) showing guest removed (200)", async () => {
    const eventId = eventIds["Event 02"];
    const response = await request(app)
      .get(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.guests).toEqual([]);
  });

  // --- Add Guests to Full Event (Logs #215-221) ---
  const guestsForEvent4 = [
    "mock0001",
    "mock0002",
    "mock0003",
    "mock0004",
    "mock0005",
  ];
  guestsForEvent4.forEach((utorid, index) => {
    const logId = 215 + index;
    it(`Log #${logId}: should add guest ${index + 1} (${utorid}) to Event 03 (ID 4) (201)`, async () => {
      const eventId = eventIds["Event 03"]; // ID 4
      const response = await request(app)
        .post(`/events/${eventId}/guests`)
        .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
        .send({ utorid })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(eventId);
      expect(response.body.numGuests).toBe(index + 1);
    });
  });

  // Log #222 - Login mock0010
  it("Log #222: should log in mock0010 (200)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({ utorid: "mock0010", password: "MockUser123!" })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(200);
    userTokens["mock0010"] = response.body.token;
  });

  // Log #223
  it("Log #223: should fail adding guest to full event (Event 03) (410)", async () => {
    const eventId = eventIds["Event 03"]; // ID 4, capacity 5, now full
    const response = await request(app)
      .post(`/events/${eventId}/guests`)
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .send({ utorid: "mock0010" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(410);
    expect(response.body).toEqual({ error: "Event is full" });
  });

  // Log #224
  it("Log #224: should fail reducing capacity after event started (400)", async () => {
      const eventId = eventIds["Event 03"]; // ID 4
      // Find the correct start time (might have been updated in Log #176)
      const eventRes = await request(app)
        .get(`/events/${eventId}`)
        .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`);
      const startTime = new Date(eventRes.body.startTime).getTime();
  
      const waitTime = startTime - Date.now() + 100;
      if (waitTime > 0) {
        await delay(waitTime);
      }
  
      const response = await request(app)
        .patch(`/events/${eventId}`)
        .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
        .send({ capacity: 3 })
        .set("Content-Type", "application/json");
  
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "Cannot update capacity after the event has started.",
      });
    },
    30000,
  );

  // --- Event Transactions (Logs #223-230) ---

  // Log #225
  it("Log #225: should fail awarding event points as regular user (403)", async () => {
    const eventId = eventIds["Event 03"]; // ID 4
    const response = await request(app)
      .post(`/events/${eventId}/transactions`)
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`) // Regular user
      .send({
        type: "event",
        utorid: "mock0003",
        amount: 200,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Insufficient clearance" });
  });

  // Log #226
  it("Log #226: should fail awarding event points to non-guest (400)", async () => {
    const eventId = eventIds["Event 03"]; // ID 4
    const response = await request(app)
      .post(`/events/${eventId}/transactions`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        type: "event",
        utorid: "mock0010", // Not a guest
        amount: 20,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "The specified user is not a guest of this event",
    });
  });

  // Log #227
  it("Log #227: should fail awarding negative event points (400)", async () => {
    const eventId = eventIds["Event 03"]; // ID 4
    const response = await request(app)
      .post(`/events/${eventId}/transactions`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        type: "event",
        utorid: "mock0003",
        amount: -100,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.amount",
          message: "amount must be a positive integer",
        }),
      ]),
    );
  });

  // Log #228
  it("Log #228: should fail awarding more event points than available (400)", async () => {
    const eventId = eventIds["Event 03"]; // ID 4, points: 100
    const response = await request(app)
      .post(`/events/${eventId}/transactions`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        type: "event",
        utorid: "mock0003",
        amount: 1000,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Not enough remaining points for this award",
    });
  });

  // Log #229
  it("Log #229: should award 20 event points to mock0003 for Event 03 (201)", async () => {
    const eventId = eventIds["Event 03"]; // ID 4
    const response = await request(app)
      .post(`/events/${eventId}/transactions`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        type: "event",
        utorid: "mock0003",
        amount: 20,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      recipient: "mock0003",
      awarded: 20,
      type: "event",
      relatedId: eventId,
      createdBy: "johndoe1",
    });
    transactionIds["event_award_single"] = response.body.id;
  });

  // Log #230
  it("Log #230: should award 5 event points to all guests of Event 03 (201)", async () => {
    const eventId = eventIds["Event 03"]; // ID 4
    const response = await request(app)
      .post(`/events/${eventId}/transactions`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        type: "event",
        utorid: null,
        amount: 5,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(5);
    response.body.forEach((tx: any) => {
      expect(tx.awarded).toBe(5);
      expect(tx.type).toBe("event");
      expect(tx.relatedId).toBe(eventId);
      expect(tx.createdBy).toBe("johndoe1");
    });
    transactionIds["event_award_bulk_start"] = response.body[0].id;
  });

  // Log #231
  it("Log #231: should fail reducing event total points below awarded amount (400)", async () => {
    const eventId = eventIds["Event 03"]; // Awarded 20 + 5*5 = 45
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ points: 10 })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:
        "Total points cannot be reduced below the points already awarded.",
    });
  });

  // Log #232
  it("Log #232: should reduce event total points to 60 (200)", async () => {
    const eventId = eventIds["Event 03"]; // Awarded 45
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ points: 60 })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: eventId,
      pointsRemain: 15, // 60 - 45
    });
  });

  // --- Final Get Event Checks (Logs #231-236) ---

  // Log #233
  it("Log #233: should get events including full ones (200)", async () => {
    const response = await request(app)
      .get("/events")
      .query({ showFull: "true" })
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(11); // Event 11 was deleted
    expect(response.body.results.length).toBe(10); // Default limit
    const event4 = response.body.results.find((e: any) => e.id === 4);
    expect(event4).toBeDefined();
    expect(event4.numGuests).toBe(5);
    expect(event4.capacity).toBe(5);
  });

  // Log #234
  it("Log #234: should fail getting non-existent event (123) (404)", async () => {
    const response = await request(app)
      .get("/events/123")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event not found" });
  });

  // Log #235
  it("Log #235: should fail getting deleted event (12) as regular user (404)", async () => {
    const deletedEventId = 12; // From log #207
    const response = await request(app)
      .get(`/events/${deletedEventId}`)
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event not found" });
  });

  // Log #236 - Publish Event 06 (ID 7)
  it("Log #236: should publish Event 06 (ID 7) (200)", async () => {
    const eventId = eventIds["Event 06"]; // ID 7
    const response = await request(app)
      .patch(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ published: true })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: eventId,
      published: true,
    });
  });

  // Log #237
  it("Log #237: should get event details (Event 03) as regular user (200)", async () => {
    const eventId = eventIds["Event 03"]; // ID 4
    const response = await request(app)
      .get(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(eventId);
    expect(response.body).toHaveProperty("organizers");
    expect(response.body).toHaveProperty("numGuests", 5);
    expect(response.body).not.toHaveProperty("guests");
    expect(response.body).not.toHaveProperty("pointsRemain");
    expect(response.body).not.toHaveProperty("pointsAwarded");
  });

  // Log #238
  it("Log #238: should get event details (Event 03) as superuser (200)", async () => {
    const eventId = eventIds["Event 03"]; // ID 4
    const response = await request(app)
      .get(`/events/${eventId}`)
      .set("Authorization", `Bearer ${userTokens["clive123"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(eventId);
    expect(response.body).toHaveProperty("guests");
    expect(response.body.guests.length).toBe(5);
    expect(response.body).toHaveProperty("organizers");
    expect(response.body.organizers.length).toBe(1);
    expect(response.body).toHaveProperty("pointsRemain", 15);
    expect(response.body).toHaveProperty("pointsAwarded", 45);
  });

  // Log #239 - Promote mock0001 to Cashier
  it("Log #239: should promote mock0001 to cashier (200)", async () => {
    const userId = userIds["mock0001"]; // ID 4
    const response = await request(app)
      .patch(`/users/${userId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ role: "cashier" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: userId,
      utorid: "mock0001",
      role: "CASHIER",
    });
  });

  // Log #240 - Login mock0001 as Cashier
  it("Log #240: should log in mock0001 as cashier (200)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({ utorid: "mock0001", password: "MockUser123!" })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(200);
    userTokens["mock0001_cashier"] = response.body.token;
  });

  // --- Transaction Creation (Logs #239-...) ---

  // Log #239
  it("Log #239: should record a purchase transaction (201)", async () => {
    const response = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        utorid: "mock0002",
        type: "purchase",
        spent: 20,
        promotionIds: [],
        remark: "Test purchase no promo",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      utorid: "mock0002",
      type: "purchase",
      spent: 20,
      earned: 80, // Assuming 4x multiplier
      remark: "Test purchase no promo",
      createdBy: "johndoe1",
    });
    transactionIds["purchase_1"] = response.body.id; // ID 7
  });

  // Log #242
  it("Log #242: should get purchase transaction details (ID 7) (200)", async () => {
    const txId = transactionIds["purchase_1"];
    const response = await request(app)
      .get(`/transactions/${txId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: txId,
      utorid: "mock0002",
      type: "purchase",
      spent: 20,
      amount: 80,
      suspicious: false,
    });
  });

  // Log #243
  it("Log #243: should record a purchase by suspicious cashier (201)", async () => {
    const response = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`) // Suspicious
      .send({
        utorid: "mock0002",
        type: "purchase",
        spent: 15,
        promotionIds: [],
        remark: "Purchase from suspicious cashier",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      utorid: "mock0002",
      type: "purchase",
      spent: 15,
      earned: 0,
      remark: "Purchase from suspicious cashier",
      createdBy: "mock0000",
    });
    transactionIds["purchase_suspicious"] = response.body.id; // ID 8
  });

  // Log #244
  it("Log #244: should get suspicious purchase details (ID 8) (200)", async () => {
    const txId = transactionIds["purchase_suspicious"];
    const response = await request(app)
      .get(`/transactions/${txId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: txId,
      utorid: "mock0002",
      type: "purchase",
      spent: 15,
      amount: 60, // Potential points
      suspicious: true,
    });
  });

  // Log #245
  it("Log #245: should fail purchase with negative spent amount (400)", async () => {
    const response = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${userTokens["mock0001_cashier"]}`)
      .send({
        utorid: "mock0002",
        type: "purchase",
        spent: -10,
        promotionIds: [],
        remark: "Should fail",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.spent",
          message: "Spent amount must be positive",
        }),
      ]),
    );
  });

  // Log #246
  it("Log #246: should fail purchase creation by regular user (403)", async () => {
    const response = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`) // Regular user
      .send({
        utorid: "mock0001",
        type: "purchase",
        spent: 10,
        promotionIds: [],
        remark: "Regular user can't create purchase",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden. Requires cashier or higher.",
    });
  });

  // Log #247
  it("Log #247: should create an adjustment transaction (ID 9) (201)", async () => {
    const relatedTxId = transactionIds["purchase_1"]; // ID 7
    const response = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        utorid: "mock0002",
        type: "adjustment",
        amount: -20,
        relatedId: relatedTxId,
        promotionIds: null,
        remark: "Correct an over-credit from purchase_0", // Remark from log
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      utorid: "mock0002",
      amount: -20,
      type: "adjustment",
      relatedId: relatedTxId,
      remark: "Correct an over-credit from purchase_0",
      createdBy: "johndoe1",
    });
    transactionIds["adjustment_1"] = response.body.id; // ID 9
  });

  // Log #248
  it("Log #248: should get adjustment transaction details (ID 9) (200)", async () => {
    const txId = transactionIds["adjustment_1"];
    const response = await request(app)
      .get(`/transactions/${txId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: txId,
      utorid: "mock0002",
      type: "adjustment",
      amount: -20,
      // 'spent' field value depends on API logic for adjustments
      relatedId: transactionIds["purchase_1"], // ID 7
    });
  });

  // Log #249
  it("Log #249: should fail adjustment for non-existent related transaction (404)", async () => {
    const response = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        utorid: "mock0002",
        type: "adjustment",
        amount: 10,
        relatedId: 9999999,
        promotionIds: null,
        remark: "Adjustment missing related tx",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Related transaction not found." });
  });

  // Log #250
  it("Log #250: should fail adjustment creation by regular user (403)", async () => {
    const response = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`) // Regular user
      .send({
        utorid: "mock0002",
        type: "adjustment",
        amount: 10,
        relatedId: 1, // Using ID 1 as per log, assuming it exists
        promotionIds: null,
        remark: "Regular user tries to adjust",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden. Requires cashier or higher.",
    });
  });

  // Log #251
  it("Log #251: should mark purchase_1 (ID 7) as suspicious (200)", async () => {
    const txId = transactionIds["purchase_1"]; // ID 7
    const response = await request(app)
      .patch(`/transactions/${txId}/suspicious`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ suspicious: true })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: txId,
      suspicious: true,
    });
  });

  // Log #252
  it("Log #252: should unmark purchase_suspicious (ID 8) as suspicious (200)", async () => {
    const txId = transactionIds["purchase_suspicious"]; // ID 8
    const response = await request(app)
      .patch(`/transactions/${txId}/suspicious`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ suspicious: false })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: txId,
      suspicious: false,
    });
  });

  // Log #253
  it("Log #253: should fail marking transaction suspicious as regular user (403)", async () => {
    const txId = transactionIds["purchase_1"]; // ID 7
    const response = await request(app)
      .patch(`/transactions/${txId}/suspicious`)
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`) // Regular user
      .send({ suspicious: true })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Insufficient clearance" });
  });

  // Log #254 - Login mock0003
  it("Log #254: should log in mock0003 (200)", async () => {
    const response = await request(app)
      .post("/auth/tokens")
      .send({ utorid: "mock0003", password: "MockUser123!" })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(200);
    userTokens["mock0003"] = response.body.token;
  });

  // Log #255
  it("Log #255: should perform a point transfer from mock0003 to mock0001 (201)", async () => {
    const recipientId = userIds["mock0001"]; // ID 4
    const response = await request(app)
      .post(`/users/${recipientId}/transactions`)
      .set("Authorization", `Bearer ${userTokens["mock0003"]}`)
      .send({
        type: "transfer",
        amount: 5,
        remark: "Test transfer from mock0003 to mock0001",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      sender: "mock0003",
      recipient: "mock0001",
      type: "transfer",
      sent: 5,
      remark: "Test transfer from mock0003 to mock0001",
      createdBy: "mock0003",
    });
    transactionIds["transfer_sender"] = response.body.id; // ID 10 (sender's tx)
    // Assuming recipient tx ID is sender ID + 1 based on log #262
    transactionIds["transfer_recipient"] = response.body.id + 1; // ID 11
  });

  // Log #256
  it("Log #256: should verify recipient (mock0001) received points after transfer (200)", async () => {
    const recipientId = userIds["mock0001"]; // ID 4
    const response = await request(app)
      .get(`/users/${recipientId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    // Points check: mock0001 had 5 from event (log #228), received 5 => 10
    expect(response.body.points).toBe(10);
    expect(response.body.role).toBe("CASHIER"); // Promoted in log #237
  });

  // Log #257
  it("Log #257: should fail transfer due to insufficient points (400)", async () => {
    const recipientId = userIds["mock0003"]; // ID 6
    const response = await request(app)
      .post(`/users/${recipientId}/transactions`)
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`)
      .send({
        type: "transfer",
        amount: 999999,
        remark: "Insufficient points",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Insufficient points for transfer.",
    });
  });

  // Log #258
  it("Log #258: should create a redemption request (ID 12) (201)", async () => {
    const response = await request(app)
      .post("/users/me/transactions")
      .set("Authorization", `Bearer ${userTokens["mock0003"]}`)
      .send({
        type: "redemption",
        amount: 10,
        remark: "Redeem 10 points",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      utorid: "mock0003",
      type: "redemption",
      amount: 10,
      remark: "Redeem 10 points",
      createdBy: "mock0003",
      processedBy: null,
    });
    transactionIds["redemption_1"] = response.body.id; // ID 12
  });

  // Log #259
  it("Log #259: should fail redemption exceeding user balance (400)", async () => {
    const response = await request(app)
      .post("/users/me/transactions")
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`)
      .send({
        type: "redemption",
        amount: 999999,
        remark: "Exceed user balance",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Insufficient points for redemption.",
    });
  });

  // Log #260
  it("Log #260: should process redemption request (ID 12) (200)", async () => {
    const txId = transactionIds["redemption_1"]; // ID 12
    const response = await request(app)
      .patch(`/transactions/${txId}/processed`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ processed: true })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: txId,
      utorid: "mock0003",
      type: "redemption",
      processedBy: "johndoe1",
      redeemed: 10,
    });
  });

  // Log #261
  it("Log #261: should fail processing an already processed redemption (ID 12) (400)", async () => {
    const txId = transactionIds["redemption_1"]; // ID 12
    const response = await request(app)
      .patch(`/transactions/${txId}/processed`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ processed: true })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Transaction has already been processed.",
    });
  });

  // Log #262
  it("Log #262: should fail processing redemption (ID 12) as regular user (403)", async () => {
    const txId = transactionIds["redemption_1"]; // ID 12
    const response = await request(app)
      .patch(`/transactions/${txId}/processed`)
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`) // Regular user
      .send({ processed: true })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden. Requires cashier or higher.",
    });
  });

  // Log #263
  it("Log #263: should fail getting all transactions as regular user (403)", async () => {
    const response = await request(app)
      .get("/transactions")
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Insufficient clearance" });
  });

  // Log #264
  it("Log #264: should get all transactions as manager (200)", async () => {
    const response = await request(app)
      .get("/transactions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("count", 12); // Based on log
    expect(response.body).toHaveProperty("results");
    expect(Array.isArray(response.body.results)).toBe(true);
    expect(response.body.results.length).toBe(10); // Default limit
  });

  // Log #265
  it("Log #265: should fail getting specific transaction (ID 7) as regular user (403)", async () => {
    const txId = transactionIds["purchase_1"]; // ID 7
    const response = await request(app)
      .get(`/transactions/${txId}`)
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Insufficient clearance" });
  });

  // Log #266
  it("Log #266: should get specific transaction (ID 7) as manager (200)", async () => {
    const txId = transactionIds["purchase_1"]; // ID 7
    const response = await request(app)
      .get(`/transactions/${txId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(txId);
    expect(response.body.suspicious).toBe(true); // Marked in log #249
  });

  // Log #267
  it("Log #267: should get own transactions as regular user (mock0002) (200)", async () => {
    const response = await request(app)
      .get("/users/me/transactions")
      .set("Authorization", `Bearer ${userTokens["mock0002"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("count", 4); // Based on log
    expect(response.body).toHaveProperty("results");
    expect(Array.isArray(response.body.results)).toBe(true);
    // Check if transactions match expected IDs/types for mock0002
    const txIds = response.body.results.map((tx: any) => tx.id);
    expect(txIds).toContain(transactionIds["purchase_1"]); // ID 7
    expect(txIds).toContain(transactionIds["purchase_suspicious"]); // ID 8
    expect(txIds).toContain(transactionIds["adjustment_1"]); // ID 9
    // Also includes event transaction ID 3 from log #228
  });

  // --- Promotion Management (Logs #266-...) ---

  // Log #268
  it("Log #268: should fail promotion creation as cashier (403)", async () => {
    const response = await request(app)
      .post("/promotions")
      .set("Authorization", `Bearer ${userTokens["mock0001_cashier"]}`)
      .send({
        name: "Forbidden Promotion",
        description: "Promotion creation attempt without manager privileges",
        type: "automatic",
        startTime: "2025-03-29T01:58:09.872Z",
        endTime: "2025-03-30T01:58:09.872Z",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Insufficient clearance" });
  });

  // Log #269
  it("Log #269: should fail promotion creation with invalid token (401)", async () => {
    const response = await request(app)
      .post("/promotions")
      .set("Authorization", "Bearer invalid-token")
      .send({
        name: "Unauthorized Promotion",
        description: "Promotion creation attempt with invalid token",
        type: "automatic",
        startTime: "2025-03-29T01:58:09.876Z",
        endTime: "2025-03-30T01:58:09.876Z",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid or expired token." });
  });

  // Log #270
  it("Log #270: should fail promotion creation with empty body (400)", async () => {
    const response = await request(app)
      .post("/promotions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({})
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "body.name", message: "Required" }),
        expect.objectContaining({
          path: "body.description",
          message: "Required",
        }),
        expect.objectContaining({
          path: "body.startTime",
          message: "Required",
        }),
        expect.objectContaining({ path: "body.endTime", message: "Required" }),
        expect.objectContaining({ path: "body.type", message: "Required" }),
      ]),
    );
  });

  // Log #271
  it("Log #271: should fail promotion creation with startTime in past (400)", async () => {
    const response = await request(app)
      .post("/promotions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: "Invalid Times",
        description: "Testing start time in past",
        type: "one-time",
        startTime: "2025-03-28T01:58:09.882Z", // Time from log, likely past now
        endTime: "2025-03-27T01:58:09.882Z",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    // Error message might be startTime in past OR endTime before startTime
    expect(response.body).toHaveProperty("error");
  });

  // Log #272
  it("Log #272: should fail promotion creation with negative minSpending (400)", async () => {
    const response = await request(app)
      .post("/promotions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: "Negative Min Spending",
        description: "Testing negative minSpending",
        type: "automatic",
        startTime: "2025-03-30T01:58:09.885Z",
        endTime: "2025-03-31T01:58:09.885Z",
        minSpending: -3.14,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.minSpending",
          message: "minSpending must be a positive number",
        }),
      ]),
    );
  });

  // Log #273
  it("Log #273: should fail promotion creation with negative rate (400)", async () => {
    const response = await request(app)
      .post("/promotions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: "Negative Rate",
        description: "Testing negative rate",
        type: "automatic",
        startTime: "2025-03-30T01:58:09.888Z",
        endTime: "2025-03-31T01:58:09.888Z",
        rate: -3.14,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.rate",
          message: "rate must be a positive number",
        }),
      ]),
    );
  });

  // Log #274
  it("Log #274: should fail promotion creation with negative points (400)", async () => {
    const response = await request(app)
      .post("/promotions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: "Negative Points",
        description: "Testing negative points",
        type: "one-time",
        startTime: "2025-03-30T01:58:09.892Z",
        endTime: "2025-03-31T01:58:09.892Z",
        points: -3,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.points",
          message: "points must be a positive integer",
        }),
      ]),
    );
  });

  // Log #275
  it("Log #275: should fail promotion creation with empty required strings (400)", async () => {
    const response = await request(app)
      .post("/promotions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: "",
        description: "",
        type: "",
        startTime: "2025-03-30T01:58:09.895Z",
        endTime: "2025-03-31T01:58:09.895Z",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.name",
          message: "name is required",
        }),
        expect.objectContaining({
          path: "body.description",
          message: "description is required",
        }),
        expect.objectContaining({
          path: "body.type",
          message:
            "Invalid enum value. Expected 'automatic' | 'one-time', received ''",
        }),
      ]),
    );
  });

  // Log #276
  it("Log #276: should create automatic promotion 'Spring Sale' (ID 1) (201)", async () => {
    const now = new Date();
    const startTime = new Date(now);
    startTime.setMinutes(now.getMinutes() + 1);
    const endTime = new Date(startTime);
    // Add 1 day to the end time
    endTime.setDate(startTime.getDate() + 1);
    // Convert dates to ISO 8601 string format (which includes the 'Z' for UTC)
    const startTimeISO = startTime.toISOString();
    const endTimeISO = endTime.toISOString();
    // --- End date calculation ---
    const response = await request(app)
      .post("/promotions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: "Spring Sale",
        description: "This is a test promotion",
        type: "automatic",
        startTime: startTimeISO, 
        endTime: endTimeISO, 
        minSpending: 50,
        rate: 0.02,
        points: 10,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 1, // Assuming first promo gets ID 1
      name: "Spring Sale",
      type: "automatic",
    });
    promotionIds["Spring Sale"] = response.body.id;
  });

  // Log #277
  it("Log #277: should create one-time promotion 'Start of Summer Celebration' (ID 2) (201)", async () => {
    const now = new Date();
    const startTime = new Date(now);
    startTime.setMinutes(now.getMinutes() + 1);
    const endTime = new Date(startTime);
    // Add 1 day to the end time
    endTime.setDate(startTime.getDate() + 1);
    // Convert dates to ISO 8601 string format (which includes the 'Z' for UTC)
    const startTimeISO = startTime.toISOString();
    const endTimeISO = endTime.toISOString();
    // --- End date calculation ---
    const response = await request(app)
      .post("/promotions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: "Start of Summer Celebration",
        description: "A simple promotion",
        type: "one-time",
        startTime: startTimeISO, // Use the dynamic start time
        endTime: endTimeISO, // Use the dynamic end time
        minSpending: 50,
        rate: 0.01,
        points: 0,
      })
      .set("Content-Type", "application/json");    
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 2, // Assuming second promo gets ID 2
      name: "Start of Summer Celebration",
      type: "one-time",
    });
    promotionIds["Summer Celebration"] = response.body.id;
  });

  // Store the start time in milliseconds for later use
const promotionStartTimes: { [key: string]: number } = {};
  // Log #278
  it("Log #278: should create one-time promotion 'Instant Promotion' (ID 3) starting soon (201)", async () => {
    // Calculate dynamic start time (e.g., 5 seconds from now)
    const dynamicStartTimeMs = Date.now() + 5000;
    const startTimeISO = new Date(dynamicStartTimeMs).toISOString();
    const endTimeISO = new Date(dynamicStartTimeMs + 6 * 30 * 86400000).toISOString(); // ~6 months later

    const response = await request(app)
      .post("/promotions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`) // Use appropriate manager token
      .send({
        name: "Instant Promotion",
        description: "A promotion that starts NOW!",
        type: "one-time",
        startTime: startTimeISO, // Use dynamic start time
        endTime: endTimeISO,
        minSpending: 10,
        rate: 0.01,
        points: 10,
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      // id: 3, // ID might change if tests are re-run, rely on storing it
      name: "Instant Promotion",
      type: "one-time",
      startTime: startTimeISO, // Verify the dynamic time was set
    });
    promotionIds["Instant Promotion"] = response.body.id;
    // Store the actual start time in milliseconds for the wait test
    promotionStartTimes["Instant Promotion"] = dynamicStartTimeMs;
  });


  // Log #279
  it("Log #279: should fail getting promotions with invalid page (400)", async () => {
    const response = await request(app)
      .get("/promotions")
      .query({ page: -1 })
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "query.page",
          message: "Number must be greater than 0",
        }),
      ]),
    );
  });

  // Log #280
  it("Log #280: should fail getting promotions with invalid limit (400)", async () => {
    const response = await request(app)
      .get("/promotions")
      .query({ limit: -1 })
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "query.limit",
          message: "Number must be greater than 0",
        }),
      ]),
    );
  });

  // Log #281
  it("Log #281: should get no active promotions as cashier (200)", async () => {
    // At this point in the logs (before Instant Promotion starts), cashier sees none
    const response = await request(app)
      .get("/promotions")
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(0);
    expect(response.body.results.length).toBe(0);
  });

  // Log #282
  it("Log #282: should fail getting promotions with both started and ended filters (400)", async () => {
    const response = await request(app)
      .get("/promotions")
      .query({ started: true, ended: true })
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Cannot specify both "started" and "ended" simultaneously.',
    });
  });

  // Log #283
  it("Log #283: should get all promotions (not started) as manager (200)", async () => {
    const response = await request(app)
      .get("/promotions")
      .query({ started: false })
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(3);
    expect(response.body.results.length).toBe(3);
  });

  // Log #284
  it("Log #284: should fail getting specific inactive promotion (ID 3) as cashier (404)", async () => {
    const promoId = promotionIds["Instant Promotion"]; // ID 3
    const response = await request(app)
      .get(`/promotions/${promoId}`)
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .set("Content-Type", "application/json");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Promotion not found" });
  });

  // Log #285
  it("Log #285: should get specific inactive promotion (ID 1) as manager (200)", async () => {
    const promoId = promotionIds["Spring Sale"]; // ID 1
    const response = await request(app)
      .get(`/promotions/${promoId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(promoId);
    expect(response.body.name).toBe("Spring Sale");
  });

  // Log #286
  it("Log #286: should fail getting non-existent promotion (404)", async () => {
    const response = await request(app)
      .get("/promotions/999999")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Promotion not found" });
  });



  // --- Wait for Instant Promotion to start (between log 284 and 285) ---
  it("should wait for Instant Promotion (ID 3) to start", async () => {
    const promoName = "Instant Promotion";
    const startTimeMs = promotionStartTimes[promoName];

    // Add a check in case the previous test failed to store the time
    if (!startTimeMs) {
      throw new Error(`Start time for promotion '${promoName}' was not stored. Check test Log #276.`);
    }

    const waitTime = startTimeMs - Date.now() + 500; // Increased buffer (500ms)

    if (waitTime > 0) {
      await delay(waitTime);
    }
    // Add a small extra fixed delay just to be safe after the calculated wait
    await delay(100);

    const timeAfterWait = Date.now();
    expect(timeAfterWait).toBeGreaterThanOrEqual(startTimeMs);
  });

  // Log #287
  it("Log #287: should get active 'Instant Promotion' (ID 3) as cashier (200)", async () => {
    const promoId = promotionIds["Instant Promotion"];
    const cashierToken = userTokens["mock0000_cashier"]; // Make sure this was set

    // Add checks for debugging
    if (!promoId) {
      throw new Error("Promotion ID for 'Instant Promotion' is missing!");
    }
    if (!cashierToken) {
      throw new Error("Token for mock0000_cashier is missing!");
    }

    const response = await request(app)
      .get(`/promotions/${promoId}`)
      .set("Authorization", `Bearer ${cashierToken}`) // Use the cashier token
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200); // Now it should be 200
    expect(response.body.id).toBe(promoId);
    expect(response.body.name).toBe("Instant Promotion");
  });

  // Log #288
  it("Log #288: should fail updating promotion (ID 1) as cashier (403)", async () => {
    const promoId = promotionIds["Spring Sale"]; // ID 1
    const response = await request(app)
      .patch(`/promotions/${promoId}`)
      .set("Authorization", `Bearer ${userTokens["mock0000_cashier"]}`)
      .send({ name: "Attempted Update by Non-Manager" })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Insufficient clearance" });
  });

  // Log #289
  it("Log #289: should fail updating promotion (ID 1) startTime to past (400)", async () => {
    const promoId = promotionIds["Spring Sale"]; // ID 1
    const response = await request(app)
      .patch(`/promotions/${promoId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ startTime: "2025-03-27T01:58:14.977Z" }) // Past time
      .set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Cannot set a start time in the past",
    });
  });

  // Log #290
  it("Log #290: should fail updating promotion (ID 1) endTime before startTime (400)", async () => {
    const promoId = promotionIds["Spring Sale"]; // ID 1
    const response = await request(app)
      .patch(`/promotions/${promoId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        startTime: "2025-03-28T01:58:14.984Z", // Future time
        endTime: "2025-03-27T01:58:14.984Z", // Past time
      })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    // Error could be startTime in past OR endTime before startTime depending on exact timing
    expect(response.body).toHaveProperty("error");
  });

  // Log #291
  it("Log #291: should fail updating promotion (ID 1) with negative rate (400)", async () => {
    const promoId = promotionIds["Spring Sale"]; // ID 1
    const response = await request(app)
      .patch(`/promotions/${promoId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ rate: -3.14 })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.rate",
          message: "rate must be a positive number",
        }),
      ]),
    );
  });

  // Log #292 - Duplicate of #287
  it("Log #292: should fail updating promotion (ID 1) startTime to past (400)", async () => {
    const promoId = promotionIds["Spring Sale"]; // ID 1
    const response = await request(app)
      .patch(`/promotions/${promoId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ startTime: "2025-03-27T01:58:14.992Z" }) // Past time
      .set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Cannot set a start time in the past",
    });
  });

  // Log #293 - Duplicate of #288
  it("Log #293: should fail updating promotion (ID 1) endTime before startTime (400)", async () => {
    const promoId = promotionIds["Spring Sale"]; // ID 1
    const response = await request(app)
      .patch(`/promotions/${promoId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        startTime: "2025-03-28T01:58:14.997Z", // Future time
        endTime: "2025-03-27T01:58:14.997Z", // Past time
      })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  // Log #294 - Duplicate of #289
  it("Log #294: should fail updating promotion (ID 1) with negative rate (400)", async () => {
    const promoId = promotionIds["Spring Sale"]; // ID 1
    const response = await request(app)
      .patch(`/promotions/${promoId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ rate: -3.14 })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "body.rate",
          message: "rate must be a positive number",
        }),
      ]),
    );
  });

  // Log #295
  it("Log #295: should successfully update promotion (ID 1) endTime (200)", async () => {
    const promoId = promotionIds["Spring Sale"]; // ID 1
    const newEndTime = "2025-04-12T01:58:15.005Z"; // From log
    const response = await request(app)
      .patch(`/promotions/${promoId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ endTime: newEndTime })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: promoId,
      endTime: newEndTime, // Check if format matches exactly or use toContain
    });
  });

  // Log #296
  it("Log #296: should fail updating non-existent promotion (404)", async () => {
    const response = await request(app)
      .patch("/promotions/999999")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({ name: "New Name That Wont Work" })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Promotion not found" });
  });

  // Log #297
  it("Log #297: should fail deleting an active promotion (ID 3) (403)", async () => {
    const promoId = promotionIds["Instant Promotion"]; // ID 3, active
    const response = await request(app)
      .delete(`/promotions/${promoId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");
    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Cannot delete a promotion that has started",
    });
  });

  // Log #298
  it("Log #298: should create a promotion (ID 4) for deletion test (201)", async () => {
    const now = new Date();
    const startTime = new Date(now);
    startTime.setMinutes(now.getMinutes() + 1);
    const endTime = new Date(startTime);
    // Add 1 day to the end time
    endTime.setDate(startTime.getDate() + 1);
    // Convert dates to ISO 8601 string format (which includes the 'Z' for UTC)
    const startTimeISO = startTime.toISOString();
    const endTimeISO = endTime.toISOString();
    const response = await request(app)
      .post("/promotions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        name: "Delete Test Promo",
        description: "To be deleted",
        type: "one-time",
        startTime: startTimeISO,
        endTime: endTimeISO,
        points: 20,
      })
      .set("Content-Type", "application/json");
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 4, // Assuming next ID is 4
      name: "Delete Test Promo",
    });
    promotionIds["Delete Test"] = response.body.id;
  });

  // Log #299
  it("Log #299: should delete an inactive promotion (ID 4) (204)", async () => {
    const promoId = promotionIds["Delete Test"]; // ID 4
    const response = await request(app)
      .delete(`/promotions/${promoId}`)
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");
    expect(response.status).toBe(204);
    delete promotionIds["Delete Test"];
  });

  // Log #300
  it("Log #300: should fail deleting non-existent promotion (404)", async () => {
    const response = await request(app)
      .delete("/promotions/999999")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .set("Content-Type", "application/json");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Promotion not found" });
  });

  // Log #301
  it("Log #301: should apply active one-time promotion (ID 3) to purchase (201)", async () => {
    const promoId = promotionIds["Instant Promotion"]; // ID 3
    const response = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        utorid: "mock0002",
        type: "purchase",
        spent: 40,
        promotionIds: [promoId],
        remark: "Purchase with active one-time promotion",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      utorid: "mock0002",
      type: "purchase",
      spent: 40,
      earned: 210, // Based on log response
      promotionIds: [promoId],
    });
    transactionIds["purchase_with_promo"] = response.body.id; // ID 13
  });

  // Log #302
  it("Log #302: should fail purchase with inactive promotion (ID 1) (400)", async () => {
    const promoId = promotionIds["Spring Sale"]; // ID 1, not active yet
    const response = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        utorid: "mock0002",
        type: "purchase",
        spent: 40,
        promotionIds: [promoId],
        remark: "Purchase with expired/future promotion",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:
        "One or more promotion IDs are invalid, expired, or not yet active.",
    });
  });

  // Log #303
  it("Log #303: should fail purchase reusing one-time promo (ID 3) - min spending irrelevant (400)", async () => {
    const promoId = promotionIds["Instant Promotion"]; // ID 3, already used by mock0002
    const response = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        utorid: "mock0002",
        type: "purchase",
        spent: 5, // Below minSpending, but reuse error takes precedence
        promotionIds: [promoId],
        remark: "Min spending not met => 400", // Log remark is misleading
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: `Promotion ${promoId} has already been used by this user.`,
    });
  });

  // Log #304
  it("Log #304: should fail purchase reusing one-time promo (ID 3) (400)", async () => {
    const promoId = promotionIds["Instant Promotion"]; // ID 3, already used
    const response = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${userTokens["johndoe1_manager_temp"]}`)
      .send({
        utorid: "mock0002",
        type: "purchase",
        spent: 30,
        promotionIds: [promoId],
        remark: "Re-using one-time promo => 400",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: `Promotion ${promoId} has already been used by this user.`,
    });
  });
});
