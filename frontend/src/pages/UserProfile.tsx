import DataField from "../components/userProfile/DataField";
import PointsCard from "../components/userProfile/PointsCard";
import Navbar from "../components/Navbar";
import MyPromotions from "../components/userProfile/MyPromotions";
import React, { useState } from "react";
import { User, Pencil } from "lucide-react";
import { useUser } from "../context/UserContext";
import { API_BASE_URL } from '../utils/auth';
const UserProfile: React.FC = () => {
  const { userData } = useUser();
  const [profilePicture, setProfilePicture] = useState<string | null>(
    userData?.avatar || null,
  );
  // Update profile picture
  const updateProfilePicture = () => {
    // Create a hidden file input to open file picker
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
          const formData = new FormData();
          formData.append("avatar", file);
          const token = localStorage.getItem('authToken');
          try {
            // cannot use fetch with auth here, since fetch with auth has application/json set in headers, but this requires multipart/form-data
            // trying to set multipart/form-data will result in not having a default boundary and thus fetch fails
            // backend cors settings allows localhost:5173 (and BASE_API_URL), for PATCH /users/me in order for this to be able to send a file.
            fetch(`${API_BASE_URL}/users/me`, {
              headers : {'Authorization': `Bearer ${token}`},
              method: "PATCH",
              body: formData
            }).then((response) => {
                if (!response.ok) {
                  console.error("Failed to update profile picture on server");
                } else {
                  console.log("Profile picture successfully updated on server");
                }
                return response.json()
              }).then((data)=>setProfilePicture(data.avatar))
              .catch((error) => console.error("Error updating profile picture:", error));
          } catch (e) {
            console.log(e)
          }
      }
    };
    fileInput.click();
  };
  if (!userData) {
    // Consider a more user-friendly loading state or redirect logic here
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading user data or redirecting...
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      <Navbar activeLink={""} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Use grid-cols-1 for mobile (default) and md:grid-cols-[1fr,1fr] for medium screens and up */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr] gap-x-8 gap-y-6 items-start">
          <div
            className="relative group row-start-1 bg-gray-500 rounded-full flex items-center justify-center 
                       w-[12rem] h-[12rem] justify-self-center mb-4 cursor-pointer 
                       md:row-span-4 md:col-start-1 md:mr-[6rem] md:justify-self-end md:w-[16rem] md:h-[16rem] md:mb-0"
            onClick={updateProfilePicture}
          >
            {/**for some reason, profilePicture is set to null on load, while userData.avatar actually has the content, this allows the page on load 
             * to contain the user avatar using userData.avatar, and on update, uses profilePicture to get the most updated avatar
             */}
            {profilePicture || userData.avatar? (
              <img
                src={`data:image/png;base64,${(profilePicture ? profilePicture: userData.avatar )}`}
                alt="Profile"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <User className="w-16 h-16 text-white" />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition duration-200">
              <Pencil className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition duration-200" />
            </div>
          </div>

          <div className="w-full md:row-start-1 md:col-start-2">
            <DataField
              fieldName="Name"
              fieldContent={userData.name}
              isEditable={true}
            />
          </div>

          <div className="w-full md:row-start-2 md:col-start-2">
            <DataField
              fieldName="Utorid"
              fieldContent={userData.utorid}
              isEditable={false}
            />
          </div>

          <div className="w-full md:row-start-3 md:col-start-2">
            <DataField
              fieldName="Birthday"
              fieldContent={
                userData.birthday ? userData.birthday.slice(0, 10) : ""
              }
              isEditable={true}
            />
          </div>

          <div className="w-full md:row-start-4 md:col-start-2">
            <DataField
              fieldName="Role"
              fieldContent={userData.role.toLowerCase()}
              isEditable={false}
            />
          </div>

          <div className="w-full max-w-full justify-self-center md:row-start-5 md:col-start-1 md:col-span-2">
            <DataField
              fieldName="Email"
              fieldContent={userData.email}
              isEditable={true}
            />
          </div>

          <div className="w-full md:row-start-6 md:col-start-1 md:max-w-full">
            <PointsCard points={userData.points} />
          </div>

          <div className="self-start w-full md:row-start-6 md:col-start-2 md:row-span-4">
            <MyPromotions />
          </div>

            <div className="w-full md:row-start-7 md:col-start-1 md:max-w-full md:mr-[8rem]">
            <DataField
              fieldName="Password"
              fieldContent="********"
              isEditable={true}
            />
            </div>

          <div className="w-full md:row-start-8 md:col-start-1 md:max-w-full md:mr-[3rem]">
            <DataField
              fieldName="Last login"
              fieldContent={
                userData.lastLogin
                  ? userData.lastLogin.slice(0, 10)
                  : new Date().toISOString().slice(0, 10)
              }
              isEditable={false}
            />
          </div>

          <div className="w-full md:row-start-9 md:col-start-1 md:max-w-full md:mr-[6rem]">
            <DataField
              fieldName="Created at"
              fieldContent={userData.createdAt.slice(0, 10)}
              isEditable={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
