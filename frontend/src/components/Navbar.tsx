import React from "react";
import ThemeToggle from "./ThemeToggle";
import { User } from "lucide-react";
import { useUser } from "../context/UserContext"; 

// Interfaces (move to a separate file later probably in types.ts)
interface UserData {
  id: number;
  utorid: string;
  role: "REGULAR" | "CASHIER" | "MANAGER" | "SUPERUSER";
  points: number;
  verified: boolean;
  avatarUrl?: string;
}

interface DropdownItem {
  name: string;
  href: string;
}

interface NavLink {
  name: string;
  href: string;
  hasDropdown?: boolean;
  dropdownItems?: DropdownItem[];
  requiredRoles?: UserData["role"][];
}

// NavbarProps
interface NavbarProps {
  activeLink: string;
}

// Navigation Links Configuration 
const navLinks: NavLink[] = [
  { name: "Dashboard", href: "/dashboard" },
  {
    name: "Points ",
    href: "#",
    hasDropdown: true,
    dropdownItems: [
      { name: "Create Transactions", href: "#" }, // Transfer points, Redeem points and Create Purchase transaction
      { name: "Transaction history", href: "#" }, // Has current balance as well 
    ],
  },
  { name: "Promotions", href: "/promotions" },
  {
    name: "Events",
    href: "#",
    hasDropdown: true,
    dropdownItems: [
      { name: "All Events", href: "#" },
      { name: "My Organized Events", href: "#" },
    ],
  },
  {
    name: "Role Management",
    href: "user-management",
    requiredRoles: ["MANAGER", "SUPERUSER", "CASHIER"],
  },
];

// Helper Function for Role Check
const userHasRequiredRole = (
  userRole: UserData["role"] | undefined,
  requiredRoles: UserData["role"][] | undefined,
): boolean => {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
};

// Navbar Component
const Navbar: React.FC<NavbarProps> = ({ activeLink }) => {
  const { userData, isLoading, error, signout } = useUser();
  const isSuperUser = userData?.role === "SUPERUSER";

  // Avatar Rendering Logic
  const renderAvatar = () => {
    return (
      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
        {userData?.avatarUrl ? (
          // If URL exists, use it
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${userData.avatarUrl})` }}
            aria-label={`${userData.utorid}'s avatar`} 
          ></div>
        ) : (
          // Otherwise, render the icon component
          <User size={20} aria-label="Default user avatar" />
        )}
      </div>
    );
  };

  // Loading State
  if (isLoading) {
    return (
      <nav className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-6 py-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Simplified loading view */}
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 animate-pulse mr-3"></div>
            <span className="font-bold text-lg text-gray-400 dark:text-gray-600">
              Loading...
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <div className="w-9 h-9 rounded-full bg-gray-300 dark:bg-gray-700 animate-pulse"></div>
          </div>
        </div>
      </nav>
    );
  }

  // Error State
  if (error || !userData) {
    return (
      <nav className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-6 py-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          Error: {error || "User data not available."}
        </div>
      </nav>
    );
  }

  // Render Full Navbar
  return (
    <nav className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-6 py-4 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center mr-3">
            <span className="text-white dark:text-gray-900 font-bold">U</span>
          </div>
          <span className="font-bold text-lg">UofT Rewards</span>
        </div>

        {/* Navigation Links Section */}
        <div className="hidden md:flex items-center space-x-6">
          {navLinks.map(
            (link) =>
              userHasRequiredRole(userData.role, link.requiredRoles) && (
                <div key={link.name} className="relative group">
                  {/* Nav Link Item */}
                  <a
                    href={link.href}
                    className={`relative px-1 py-2 text-sm font-medium transition-colors ${
                      link.name === activeLink
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {link.name}
                    {link.hasDropdown && (
                      <span className="ml-1 text-xs opacity-70">▼</span>
                    )}
                    {link.name === activeLink && (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></span>
                    )}
                  </a>
                  {/* Dropdown Menu for Nav Links */}
                  {link.hasDropdown && link.dropdownItems && (
                    <div
                      className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg
                                 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-10"
                    >
                      {link.dropdownItems.map((item) => (
                        <a
                          key={item.name}
                          href={item.href}
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          {item.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ),
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          <ThemeToggle />

          {/* User Menu with Dropdown */}
          <div className="relative group">
            {/* Trigger Area */}
            <div className="flex items-center space-x-2 cursor-pointer">
              {renderAvatar()} {/* Use the avatar rendering function */}
              <div className="flex items-center">
                <span className="text-sm font-medium mr-1">
                  {userData?.utorid} {/* Display utorid */}
                </span>
                {isSuperUser && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-600 text-white font-bold">
                    SU
                  </span>
                )}
                <span className="ml-1 text-xs opacity-70">▼</span>
              </div>
            </div>

            {/* User Dropdown Menu */}
            <div className="relative">
              {/* Invisible wrapper to expand the hover area */}
              <div className="absolute inset-0 -m-2" />
              <div
              className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-10"
              >
              <a
                href="#profile" // Replace with actual profile link/route
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Profile Details
              </a>
              {/* Use button for actions like logout */}
              <button
                onClick={signout} // Call signout from useUser context
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Sign Out
              </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;