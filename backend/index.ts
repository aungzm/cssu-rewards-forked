#!/usr/bin/env node
import express, {
  Request,
  Response,
  NextFunction,
  Express,
  ErrorRequestHandler,
} from "express";
import http from "http"; 
import morgan from "morgan";
import cors from "cors"; 

// Imports for routes
import userRoutes from "./routes/userRoute";
import authRoutes from "./routes/authRoute";
import transactionRoutes from "./routes/transactionRoute";
import eventRoutes from "./routes/eventRoute";
import promotionRoutes from "./routes/promotionRoute";

const app: Express = express();

// Essential Middleware 
app.use(express.json());

// CORS Middleware
app.use(cors()); 

// Logging Middleware (Morgan)
// Use 'dev' format for concise output colored by response status for development use
// Other formats include 'common', 'combined', 'short', 'tiny'
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Port Parsing
const port: number = (() => {
  const args = process.argv;
  if (process.env.NODE_ENV === "test") {
    // Don't exit in test mode if port arg is missing, Supertest provides the port
    return parseInt(args[2], 10) || 0; // Use 0 or a default test port if needed
  }
  // Original logic for non-test environment
  if (args.length !== 3) {
    console.error("Usage: node <script_name>.js <port>");
    process.exit(1);
  }
  const num = parseInt(args[2], 10);
  if (isNaN(num) || num <= 0 || num > 65535) {
    console.error(
      "Error: Port argument must be an integer between 1 and 65535."
    );
    process.exit(1);
  }
  return num;
})();

// Mount Routers
// Routes should come AFTER general middleware like cors() and express.json()
app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/transactions", transactionRoutes);
app.use("/events", eventRoutes);
app.use("/promotions", promotionRoutes);

// Only listen if NOT in test environment (e.g., when run directly with node)
let server: http.Server | null = null;
if (process.env.NODE_ENV !== "test") {
  server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  // Handle server startup errors (like EADDRINUSE)
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.syscall !== "listen") {
      throw err;
    }
    switch (err.code) {
      case "EACCES":
        console.error(`Port ${port} requires elevated privileges`);
        process.exit(1);
      case "EADDRINUSE":
        console.error(`Port ${port} is already in use`);
        process.exit(1);
      default:
        console.error(`Cannot start server: ${err.message}`);
        process.exit(1);
    }
  });
} else {
  console.log("Running in test mode - server start skipped in index.ts");
}

// Export the app instance, primarily for testing purposes
export default app;
