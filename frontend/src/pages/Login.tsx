// src/pages/LoginPage.tsx
import ThemeToggle from "../components/ThemeToggle";
import { useState } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../utils/auth";

interface AuthTokenResponse {
  token: string;
  expiresAt: string;
}

interface ApiError {
  message: string;
}

const LoginPage: React.FC = () => {
  const [utorid, setUtorid] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleUtoridChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUtorid(event.target.value);
  };

  const handlePasswordChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setPassword(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ utorid, password }),
      });

      // Try to parse the body regardless of status code
      const data: AuthTokenResponse | ApiError = await response.json();
      console.log("Response data:", data); // Log the response data
      if (!response.ok) {
        // Check if the parsed data has a 'message' property
        const errorMessage =
          typeof data === "object" && data !== null && "message" in data
            ? (data as ApiError).message
            : `HTTP error! Status: ${response.status}`;
        throw new Error(errorMessage);
      }

      // Authentication Successful
      const successData = data as AuthTokenResponse;
      
      // Store the token and expiry
      localStorage.setItem('authToken', successData.token);
      localStorage.setItem('tokenExpiresAt', successData.expiresAt);

      // Redirect to dashboard
      navigate('/dashboard');
      
    } catch (err) {
      console.error("Authentication failed:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Rest of your component remains the same
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 transition-colors duration-300">
      {/* Dark Mode Toggle Button */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Login Container */}
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-black shadow-lg p-8 transition-colors duration-300">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-20 h-20 flex items-center justify-center rounded-full bg-black dark:bg-white">
            <span className="text-2xl font-bold text-white dark:text-black">
              U
            </span>
          </div>
          <h1 className="text-xl font-bold text-black dark:text-white mb-1">
            University of Toronto
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sign in to continue
          </p>
        </div>

        {/* OAuth Button */}
        <button className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded font-semibold transition-colors hover:bg-gray-800 dark:hover:bg-gray-200 mb-6">
          Sign in with UofT Login
        </button>

        {/* Divider */}
        <div className="flex items-center my-6">
          <span className="flex-1 border-t border-gray-300 dark:border-gray-700"></span>
          <span className="px-3 text-sm text-gray-500 dark:text-gray-400">
            or
          </span>
          <span className="flex-1 border-t border-gray-300 dark:border-gray-700"></span>
        </div>

        {/* Display Error Message */}
        {error && (
          <div className="mb-4 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="utorid"
              className="block text-sm text-gray-700 dark:text-gray-300 mb-2"
            >
              UTORid
            </label>
            <input
              type="text"
              id="utorid"
              name="utorid"
              placeholder="Enter your UTORid"
              value={utorid}
              onChange={handleUtoridChange}
              required
              disabled={loading}
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded text-black dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm text-gray-700 dark:text-gray-300 mb-2"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded text-black dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white"
              value={password}
              onChange={handlePasswordChange} 
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded font-semibold transition-colors hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-70"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Don't have an account?{" "}
            <a onClick={() => navigate('/signup')} className="text-black dark:text-white hover:underline" style={{ cursor: 'pointer' }}>
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
