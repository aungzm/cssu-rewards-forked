Backend Deployment Instructions
----------------------------------

Follow the steps below to deploy the backend server in a production environment.

### Prerequisites

Ensure the following dependencies are installed on your system:

-   **Node.js** (v18 or higher recommended)

-   **npm** (v9 or higher)

-   **SQLite** (already used via dependency)

-   Optional: `pm2` or another process manager for persistent deployment

* * * * *

### Setup

1.  **Clone the Repository**

    ```
    git clone <your-repo-url>
    cd backend

    ```

2.  **Install Dependencies**

    ```
    npm install

    ```

3.  **Configure Environment Variables**\
    Create a `.env` file in the `backend` directory. At minimum, include:

    ```
    DATABASE_URL="file:./dev.db"
    JWT_SECRET="<your_jwt_secret>"

    ```

4.  **Generate Prisma Client & Push DB Schema**\
    This resets and syncs the database schema:

    ```
    npm run reset

    ```

5.  **Seed the Database (Optional)**\
    If you have seed data, run:

    ```
    npm run seed

    ```

* * * * *

### Build & Start

1.  **Build the Project**\
    Compile TypeScript into JavaScript:

    ```
    npm run build

    ```

2.  **Start the Server**\
    Launch the compiled server:

    ```
    npm start

    ```

    Alternatively, for development:

    ```
    npm run dev

    ```

* * * * *

### Running Tests

To execute the test suite:

```
npm test

```

This includes setup, running, and teardown automatically.

* * * * *

### Useful Scripts

| Command | Description |
| --- | --- |
| `npm run reset` | Regenerate and force-reset Prisma DB schema |
| `npm run seed` | Resets DB and populates it with seed data |
| `npm run dev` | Starts server with live reload (TS) |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm start` | Starts compiled JavaScript server |
| `npm test` | Runs the complete test suite |

* * * * *

### Notes

-   Make sure to replace `<your_jwt_secret>` with a secure, random string.

-   Production deployments may want to use `pm2` or Docker for managing the backend process.

-   Ensure ports and CORS settings match your frontend configuration.



Frontend Deployment Instructions
-----------------------------------

Follow these steps to set up and deploy the frontend in a production environment.

### 🔧 Prerequisites

Ensure your system has the following installed:

-   **Node.js** (v18 or higher)

-   **npm** (v9 or higher)

-   A modern browser for previewing

* * * * *

### 🛠️ Setup

1.  **Navigate to the Frontend Directory**\
    From the root of your project:

    ```
    cd frontend

    ```

2.  **Install Dependencies**\
    Install all required packages using:

    ```
    npm install

    ```

3.  **Configure Environment Variables (Optional)**\
    If your application relies on any environment variables (e.g., API base URL), create a `.env` file:

    ```
    VITE_API_BASE_URL="http://localhost:3000"

    ```

    > Vite requires all env variables to be prefixed with `VITE_` to be exposed to the client.

* * * * *

### Development

To start the development server with hot module reloading:

```
npm run dev

```

The app should be available at <http://localhost:5173> by default.

* * * * *

### Production Build

To create a production-ready build:

```
npm run build

```

The optimized and minified static assets will be generated in the `dist/` folder.

You can preview the production build locally using:

```
npm run preview

```

* * * * *

### Code Quality

Run ESLint to analyze code for potential issues:

```
npm run lint

```

* * * * *

### Useful Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint for code quality checks |

* * * * *

### Notes

-   Ensure that the API base URL in `.env` matches your backend deployment.

-   For production deployment, serve the contents of the `dist/` folder using a static file server (e.g., Nginx, Vercel, Netlify).

-   Tailwind CSS is used for styling, and React Router (v7) is used for routing.

-   This project uses Vite for fast bundling and optimized builds.
