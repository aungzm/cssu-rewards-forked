import React, { useState } from "react";
import { fetchWithAuth } from "../../utils/authHelper";
import { API_BASE_URL } from "../../utils/auth";
import { UserData } from "../../types";
import { CheckCircle } from "lucide-react";

interface UserInfoProps {
  setUser: (user: UserData) => void;
}

const UserInfo: React.FC<UserInfoProps> = ({ setUser }) => {
  const [userId, setUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userFound, setUserFound] = useState<boolean>(false);

  const findUser = async () => {
    if (!userId) {
      alert("Please enter a User ID or UTORid");
      return;
    }

    setIsLoading(true);
    setUserFound(false);
    
    try {
      // Try to find by ID if input is a number
      if (!isNaN(Number(userId))) {
        const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`);
        
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          setUserFound(true);
          setIsLoading(false);
          return;
        }
      }
      
      // If not found by ID or input is not a number, try by UTORid
      await findUserByUtorid();
      
    } catch (error) {
      console.error("Error fetching user:", error);
      alert("Error finding user");
      setIsLoading(false);
    }
  };

  const findUserByUtorid = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/users?name=${userId}`);
      
      if (!response.ok) {
        alert("User not found");
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.results.length === 0) {
        alert("User not found");
        setIsLoading(false);
        return;
      }
      
      setUser(data.results[0]);
      setUserFound(true);
      
    } catch (error) {
      console.error("Error fetching user by UTORid:", error);
      alert("Error finding user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white flex flex-col w-full my-3 md:my-4 border border-gray-300 shadow-md rounded-lg">      
      <h2 className="text-lg md:text-xl font-bold m-3 md:m-4" style={{ color: "#002A5C" }}>
        User Information
      </h2>
      
      <div className="px-3 md:px-4 mb-3 md:mb-4">
        <label className="block text-base md:text-lg font-bold mb-1">
          User ID / UTORid
        </label>
        
        <div className="relative flex items-center">
          {userFound && (
            <div className="absolute left-2 text-green-500 z-10">
              <CheckCircle size={20} />
            </div>
          )}
          
          <input
            type="text"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              if (userFound) setUserFound(false); // Reset the found state when input changes
            }}
            placeholder="Enter User ID or UTORid"
            className={`w-full border border-gray-300 rounded-lg p-2 ${userFound ? 'pl-8' : ''}`}
          />
        </div>
      </div>
      
      <div className="px-3 md:px-4 pb-3 md:pb-4">
        <button
          className={`w-full md:w-auto bg-blue-500 hover:bg-blue-700 text-white rounded p-2 flex justify-center items-center ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
          onClick={findUser}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </>
          ) : "Find User"}
        </button>
      </div>
    </div>
  );
};

export default UserInfo;