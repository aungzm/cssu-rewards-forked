import React, {useState} from "react";
import { fetchWithAuth } from "../../utils/authHelper";
import { API_BASE_URL } from "../../utils/auth";
import { UserData } from "../../types"


interface UserInfoProps {
    setUser: (user: UserData) => void;
}


const UserInfo: React.FC<UserInfoProps> = (
    { setUser }
) => {

    const [userId, setUserId] = useState<number | null>(null);

    const findUser = async() => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`);

            if (response.ok) {
                const data = await response.json();
                console.log(data);
                setUser(data);

            } else {    // If we could not find the user by ID, we will try to find them by Utorid
                findUserByUtorid();
            }
            
            const data = await response.json();
            console.log(data);
        } catch (error) {
            console.error("Error fetching user:", error);
            
        }
    }

    const findUserByUtorid = async() => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/users?name=${userId}`);
            if (!response.ok) {
                alert("User not found");
                throw new Error("Network response was not ok");
            }

            const data = await response.json();
            if (data.results.length === 0) {
                alert("User not found");
                console.error("User not found");
                return;
            }
            setUser(data.results[0]);
            console.log(data);

        } catch (error) {
            console.error("Error fetching user by Utorid:", error);
        }
    }


    return (
        <div className="bg-white flex flex-col w-full my-4 border border-gray-300 shadow-md rounded-lg">
            <h2 className="text-xl font-bold m-4" style={{ color: "#002A5C" }}>User Information</h2>

            <label className="text-lg font-bold mx-4">User ID / Utorid</label>
            <input
                type="text"
                value={userId || ""}
                onChange={(e) => setUserId(Number(e.target.value))}
                placeholder="Enter User ID or Utorid to find their account"
                className="w-full max-w-2xl border border-gray-300 rounded-lg p-2 mx-4"
            />

            <button
                className="bg-blue-500 hover:bg-blue-700 text-white rounded p-2 m-4"
                style={{ width: "fit-content" }}
                onClick={findUser}
            >
                Find User
            </button>
        </div>
    )

}

export default UserInfo;