import React, { useState } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { User, Menu, X } from "lucide-react";
import { useUser } from "../context/UserContext";
import { UserData } from "../types"; 
import cssu from "../assets/cssu.png"

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
    name: "Points",
    href: "#",
    hasDropdown: true,
    dropdownItems: [
      { name: "Redeem Points", href: "/redeem-points" },
      { name: "Transfer Points", href: "/transfer-points" },
      { name: "Point History", href: "/transaction-history" },
    ],
  },
  {
    name: "Transactions",
    href: "#",
    hasDropdown: true,
    requiredRoles: ["MANAGER", "SUPERUSER", "CASHIER"],
    dropdownItems: [
      { name: "Create Transaction", href: "/create-transaction" },
      { name: "Process Redemption", href: "/process-redemption" },
      { name: "Transaction History", href: "/points-history" },
    ],
  },
  { name: "Promotions", href: "/promotions" },
  {
    name: "Events",
    href: "#",
    hasDropdown: true,
    dropdownItems: [
      { name: "All Events", href: "/events" },
      { name: "My Organized Events", href: "/my-events" },
    ],
  },
  {
    name: "Role Management",
    href: "/user-management",
    requiredRoles: ["MANAGER", "SUPERUSER", "CASHIER"],
  },
];

// Helper Function for Role Check
const userHasRequiredRole = (
  userRole: UserData["role"] | undefined,
  requiredRoles: UserData["role"][] | undefined
): boolean => {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
};

// Navbar Component
const Navbar: React.FC<NavbarProps> = ({ activeLink }) => {
  const { userData, isLoading, error, signout } = useUser();
  const isSuperUser = userData?.role === "SUPERUSER";

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Track which dropdowns are open in mobile view
  const [openMobileDropdowns, setOpenMobileDropdowns] = useState<
    Record<string, boolean>
  >({});

  // Toggle mobile dropdown
  const toggleMobileDropdown = (linkName: string) => {
    setOpenMobileDropdowns((prev) => ({
      ...prev,
      [linkName]: !prev[linkName],
    }));
  };

  // Avatar Rendering Logic
  const renderAvatar = () => {
    return (
      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
        {userData?.avatar ? (
          // If a base64 encoded avatar exists, display it
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url(data:image/png;base64,${userData.avatar})`,
            }}
            aria-label={`${userData.utorid}'s avatar`}
          ></div>
        ) : userData?.avatarUrl ? (
          // Otherwise, use the avatar URL if available
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${userData.avatarUrl})` }}
            aria-label={`${userData.utorid}'s avatar`}
          ></div>
        ) : (
          // Fallback to icon component
          <User size={20} aria-label="Default user avatar" />
        )}
      </div>
    );
  };

  // Loading State
  if (isLoading) {
    return (
      <nav className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 sm:px-6 py-4 shadow-md sticky top-0 z-50">
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
      <nav className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-4 sm:px-6 py-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          Error: {error || "User data not available."}
        </div>
      </nav>
    );
  }

  // Render Full Navbar
  return (
    <nav className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 sm:px-6 py-4 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center mr-3">
                <span className="text-white dark:text-gray-900 font-bold">
                  <img src={cssu}></img>
                </span>
              </div>
              <span className="font-bold text-lg">CSSU Rewards</span>
            </Link>
          </div>

          {/* Desktop Navigation Links - Hidden on Mobile */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map(
              (link) =>
                userHasRequiredRole(userData.role, link.requiredRoles) && (
                  <div key={link.name} className="relative group">
                    {/* Nav Link Item */}
                    <Link
                      to={link.href}
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
                    </Link>
                    {/* Dropdown Menu for Nav Links */}
                    {link.hasDropdown && link.dropdownItems && (
                      <div
                        className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg
                                   opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-10"
                      >
                        {link.dropdownItems.map((item) => (
                          <Link
                            key={item.name}
                            to={item.href}
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle />

            {/* User Menu with Dropdown (Visible on all screens) */}
            <div className="relative group">
              {/* Trigger Area */}
              <div className="flex items-center space-x-2 cursor-pointer">
                {renderAvatar()}
                <div className="hidden sm:flex items-center">
                  <span className="text-sm font-medium mr-1">
                    {userData?.utorid}
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
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-10">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Profile Details
                  </Link>
                  <button
                    onClick={signout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button - Only visible on mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu - Only visible when menu is open */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-1">
              {navLinks.map(
                (link) =>
                  userHasRequiredRole(userData.role, link.requiredRoles) && (
                    <div key={link.name} className="w-full">
                      {/* Mobile Nav Link Item */}
                      {link.hasDropdown ? (
                        <button
                          onClick={() => toggleMobileDropdown(link.name)}
                          className={`flex justify-between items-center w-full px-2 py-3 text-sm font-medium ${
                            link.name === activeLink
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {link.name}
                          <span className="text-xs opacity-70">
                            {openMobileDropdowns[link.name] ? "▲" : "▼"}
                          </span>
                        </button>
                      ) : (
                        <Link
                          to={link.href}
                          className={`block px-2 py-3 text-sm font-medium ${
                            link.name === activeLink
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {link.name}
                        </Link>
                      )}

                      {/* Mobile Dropdown Menu */}
                      {link.hasDropdown &&
                        link.dropdownItems &&
                        openMobileDropdowns[link.name] && (
                          <div className="bg-gray-100 dark:bg-gray-800 pl-4">
                            {link.dropdownItems.map((item) => (
                              <Link
                                key={item.name}
                                to={item.href}
                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                              >
                                {item.name}
                              </Link>
                            ))}
                          </div>
                        )}
                    </div>
                  )
              )}

              {/* Additional Mobile Menu items - visible only in mobile menu */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <Link
                  to="/profile"
                  className="block px-2 py-3 text-sm font-medium text-gray-600 dark:text-gray-300"
                >
                  Profile Details
                </Link>
                <button
                  onClick={signout}
                  className="block w-full text-left px-2 py-3 text-sm font-medium text-gray-600 dark:text-gray-300"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
