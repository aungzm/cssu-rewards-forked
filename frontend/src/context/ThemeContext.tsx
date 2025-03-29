import React, { createContext, useState, useEffect, ReactNode } from "react";

// Define the shape of the context
export type ThemeContextType = {
  darkMode: boolean;
  toggleDarkMode: () => void;
};

// Create the context
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Props for the provider component
type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize state from localStorage or system preference
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Check localStorage first
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      return JSON.parse(savedMode);
    }
    
    // Fall back to system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Update the DOM when darkMode changes
  useEffect(() => {
    // Apply or remove the 'dark' class on the html element
    document.documentElement.classList.toggle("dark", darkMode);
    
    // Save preference to localStorage
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // Toggle function
  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
