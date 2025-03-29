import React from "react";
import ThemeToggle from "./ThemeToggle";

interface DropdownItem {
    name: string;
    href: string;
}

interface NavLink {
    name: string;
    href: string;
    hasDropdown?: boolean;
    dropdownItems?: DropdownItem[];
}

interface NavbarProps {
    userName: string;
    avatarUrl?: string;
    activeLink: string;
    isSuperUser?: boolean;
}

const navLinks: NavLink[] = [
    { name: "Dashboard", href: "#" },
    { name: "Users", href: "#" },
    { 
        name: "My Points", 
        href: "#", 
        hasDropdown: true,
        dropdownItems: [
            { name: "Current Balance", href: "#" },
            { name: "Transfer/Redeemm", href: "#" },
            { name: "Transaction History", href: "#" },
        ]
    },
    { 
        name: "Transactions", 
        href: "#", 
        hasDropdown: true,
        dropdownItems: [
            { name: "Transaction History", href: "#" },
            { name: "Process Redemption", href: "#" },
            { name: "Create Transaction", href: "#" },
        ]
    },
    { name: "Promotions", href: "#" },
    { name: "Events", href: "#" },
    { name: "Role Management", href: "#" },
];

const Navbar: React.FC<NavbarProps> = ({
    userName,
    avatarUrl = "https://via.placeholder.com/35x35",
    activeLink,
    isSuperUser = true,
}) => {
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
                    {navLinks.map((link) => (
                        <div key={link.name} className="relative group">
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
                            {link.hasDropdown && link.dropdownItems && (
                                <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
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
                    ))}
                </div>

                {/* Right Section */}
                <div className="flex items-center space-x-4">
                    <ThemeToggle />
                    
                    {/* User Menu */}
                    <div className="flex items-center space-x-2 cursor-pointer group">
                        <div
                            className="w-9 h-9 rounded-full bg-cover bg-center bg-gray-200 dark:bg-gray-700"
                            style={{ backgroundImage: `url(${avatarUrl})` }}
                        ></div>
                        <div className="flex items-center">
                            <span className="text-sm font-medium mr-1">{userName}</span>
                            {isSuperUser && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-600 text-white font-bold">
                                    SU
                                </span>
                            )}
                            <span className="ml-1 text-xs opacity-70">▼</span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
