import dotenv from 'dotenv';
dotenv.config();
import express, {
  Request,
  Response,
  NextFunction,
  Express,
  ErrorRequestHandler,
} from 'express'; 
import http from 'http';
import morgan from "morgan";
import cors from "cors"; 

// Imports for routes
import userRoutes from "./routes/userRoute.js";
import authRoutes from "./routes/authRoute.js";
import transactionRoutes from "./routes/transactionRoute.js";
import eventRoutes from "./routes/eventRoute.js";
import promotionRoutes from "./routes/promotionRoute.js";

const app: Express = express();

const allowedOrigins = [
  'https://cssu-rewards.vercel.app', // Your Vercel frontend URL
  'http://localhost:5173', // Default Vite dev port 
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
      } else {
          callback(new Error('Not allowed by CORS'));
      }
  },
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Specify allowed methods
  allowedHeaders: ['Content-Type', 'Authorization', ], // Specify allowed headers
};

// Essential Middleware 
app.use(express.json());

// CORS Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Logging Middleware (Morgan)
// Use 'dev' format for concise output colored by response status for development use
const nodeEnv = process.env.NODE_ENV;
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Port Parsing
function parsePort(portStr: string | undefined, source: string): number {
  if (portStr === undefined) {
    console.error(`Error: Port source (${source}) is undefined.`);
    process.exit(1);
  }
  const num = parseInt(portStr, 10);
  if (isNaN(num) || num <= 0 || num > 65535) {
    console.error(
      `Error: Port from ${source} ('${portStr}') must be an integer between 1 and 65535.`
    );
    process.exit(1);
  }
  return num;
}

let port: number;
const args = process.argv;

if (nodeEnv === 'production') {
  console.log('Running in production mode.');
  port = parsePort(process.env.PORT, 'environment variable PORT');
} else if (nodeEnv === 'test') {
  console.log('Running in test mode - server start skipped.');
  // Port value doesn't matter for test if app.listen isn't called
  port = 0; // Assign a dummy value
} else {
  // Handles 'development' or undefined NODE_ENV
  console.log(`Running in ${nodeEnv || 'development'} mode.`);
  // Expect port from command line argument (node dist/index.js <port>)
  if (args.length !== 3) {
    console.error('Usage: node dist/index.js <port>'); // Point to the compiled JS file
    process.exit(1);
  }
  port = parsePort(args[2], 'command line argument');
}

// Mount Routers
app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/transactions", transactionRoutes);
app.use("/events", eventRoutes);
app.use("/promotions", promotionRoutes);

// Only listen if NOT in test environment (e.g., when run directly with node)
app.use(
  (
    err: ErrorRequestHandler,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.error('Unhandled Error:', err);
    // Avoid sending stack trace in production
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500; // Use existing status code if set, else 500
    res.status(statusCode).json({
      message: 'Internal Server Error',
    });
  }
);

let server: http.Server | null = null;
if (nodeEnv !== 'test') {
  server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  // Handle server startup errors (like EADDRINUSE)
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.syscall !== 'listen') {
      throw err;
    }
    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
    switch (err.code) {
      case 'EACCES':
        console.error(`${bind} requires elevated privileges`);
        process.exit(1);
      case 'EADDRINUSE':
        console.error(`${bind} is already in use`);
        process.exit(1);
      default:
        console.error(`Cannot start server: ${err.message}`);
        process.exit(1);
    }
  });
}


// Export the app instance, primarily for testing purposes
export default app;
