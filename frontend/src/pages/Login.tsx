import ThemeToggle from "../components/ThemeToggle";

const LoginPage = () => {
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

        {/* Login Form */}
        <form>
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
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded font-semibold transition-colors hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            Sign In
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Forgot your{" "}
            <a href="#" className="text-black dark:text-white hover:underline">
              UTORid
            </a>{" "}
            or{" "}
            <a href="#" className="text-black dark:text-white hover:underline">
              password
            </a>
            ?
          </p>
          <p className="mt-1">
            Need{" "}
            <a href="#" className="text-black dark:text-white hover:underline">
              help
            </a>
            ?
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
