
import ThemeToggle from "../components/ThemeToggle";
import { useState, useEffect } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../utils/auth";

interface ApiError {
  message: string;
}

const Signup: React.FC = () => {
  const [utorid, setUtorid] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [resetToken, setResetToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const navigate = useNavigate();

  // Password validation
  useEffect(() => {
    const errors: string[] = [];
    
    if (password) {
      if (password.length < 8 || password.length > 20) {
        errors.push("Password must be 8-20 characters long");
      }
      if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
      }
      if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
      }
      if (!/[0-9]/.test(password)) {
        errors.push("Password must contain at least one number");
      }
      if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
        errors.push("Password must contain at least one special character");
      }
      
      if (confirmPassword && password !== confirmPassword) {
        errors.push("Passwords do not match");
      }
    }
    
    setPasswordErrors(errors);
  }, [password, confirmPassword]);

  const handleUtoridChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUtorid(event.target.value);
  };

  const handlePasswordChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setPassword(event.target.value);
  };
  
  const handleConfirmPasswordChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setConfirmPassword(event.target.value);
  };

  const handleResetTokenChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setResetToken(event.target.value);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Don't submit if there are password errors
    if (passwordErrors.length > 0) {
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/resets/${resetToken}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          utorid, 
          password,
        }),
      });

      // Handle different response statuses
      if (response.status === 200) {
        // Success - redirect to login
        navigate('/login', { 
          state: { message: "Password reset successful. Please log in with your new password." } 
        });
        return;
      } else if (response.status === 404) {
        throw new Error("Invalid reset token. Please request a new password reset."); // Maybe parse from the backend response?
      } else if (response.status === 410) {
        throw new Error("Reset token has expired. Please request a new password reset."); // Maybe parse from the backend response?
      }
      
      // Try to parse error message from response
      const data: ApiError = await response.json();
      throw new Error(data.message || "An error occurred during password reset.");
      
    } catch (err) {
      console.error("Password reset failed:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 transition-colors duration-300">
      {/* Dark Mode Toggle Button */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Signup Container */}
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-black shadow-lg p-8 transition-colors duration-300">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-20 h-20 flex items-center justify-center rounded-full bg-black dark:bg-white">
            <span className="text-2xl font-bold text-white dark:text-black">
              U
            </span>
          </div>
          <h1 className="text-xl font-bold text-black dark:text-white mb-1">
            Reset Your Password
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create a new secure password
          </p>
        </div>

        {/* Display Error Message */}
        {error && (
          <div className="mb-4 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Signup Form */}
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

          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm text-gray-700 dark:text-gray-300 mb-2"
            >
              New Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Create a new password"
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded text-black dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white"
              value={password}
              onChange={handlePasswordChange} 
              required
              disabled={loading}
            />
            {password && passwordErrors.length > 0 && (
              <div className="mt-2">
                <ul className="text-xs text-red-600 dark:text-red-400 list-disc pl-5">
                  {passwordErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Password must be 8-20 characters with at least one uppercase letter, 
              one lowercase letter, one number, and one special character.
            </p>
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-sm text-gray-700 dark:text-gray-300 mb-2"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm your password"
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded text-black dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange} 
              required
              disabled={loading}
            />
          </div>
              
          <div className="mb-6">
            <label
                htmlFor="confirmPassword"
                className="block text-sm text-gray-700 dark:text-gray-300 mb-2"
                >
                Reset Token
            </label>
            <input 
                type="text" 
                name="resetToken" 
                value={resetToken}
                onChange={handleResetTokenChange}
                required
                disabled={loading}
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded text-black dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white"
            />
          </div>

          

          <button
            type="submit"
            disabled={loading || passwordErrors.length > 0}
            className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded font-semibold transition-colors hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-70"
          >
            {loading ? "Resetting Password..." : "Reset Password"}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Already have an account?{" "}
            <a onClick={() => navigate('/login')} className="text-black dark:text-white hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
