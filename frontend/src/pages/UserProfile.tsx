import DataField from '../components/userProfile/DataField';
import PointsCard from '../components/userProfile/PointsCard';
import Navbar from "../components/Navbar";
import MyPromotions from "../components/userProfile/MyPromotions"
import React from "react";
import { useUser } from '../context/UserContext';

const UserProfile: React.FC = () => {
  const { userData } = useUser();

  if (!userData) {
    return <>How did you even get here like you should be redirected to login by now</>
  }
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Remove this stray div */}
      {/* <div className="bg-gray-500 rounded-full w-1/2"></div> */}
      
      <Navbar activeLink={''} />
      
      {/* Container with padding - fixed duplicate mx-auto */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-[1fr,1fr] gap-x-8 gap-y-4 items-start">
          
          {/* Avatar: Column 1, Rows 1-4 */}
          <div className="row-start-1 row-span-4 col-start-1 bg-gray-500 rounded-full
              self-center flex items-center justify-center mr-[6rem]
              justify-self-end w-[16rem] h-[16rem]">
            {/**ADD CODE FOR AVATAR HERE */}
          </div>
          
          {/* === COLUMN 2 DATA FIELDS === */}
          {/* Name: Row 1, Column 2 */}
          <div className="row-start-1 col-start-2 w-full">
            <DataField 
              fieldName="Name"
              fieldContent={userData.name}
              isEditable={true}
            />
          </div>
          
          {/* Utorid: Row 2, Column 2 */}
          <div className="row-start-2 col-start-2 w-full">
            <DataField 
              fieldName="Utorid"
              fieldContent={userData.utorid}
              isEditable={false}
            />
          </div>
          
          {/* Birthday: Row 3, Column 2 */}
          <div className="row-start-3 col-start-2 w-full">
            <DataField 
              fieldName="Birthday"
              fieldContent={(userData.birthday? userData.birthday.slice(0,10): "")}
              isEditable={true}
            />
          </div>
          
          {/* Role: Row 4, Column 2 */}
          <div className="row-start-4 col-start-2 w-full">
            <DataField 
              fieldName="Role"
              fieldContent={userData.role.toLowerCase()}
              isEditable={false}
            />
          </div>
          
          {/* Email: Row 5, Spans both columns */}
          <div className="row-start-5 col-start-1 col-span-2 w-full max-w-full justify-self-center">
            <DataField
              fieldName="Email"
              fieldContent={userData.email}
              isEditable={true}
            />
          </div>
          
          {/* Points Card: Row 6, Column 1 */}
          <div className="row-start-6 col-start-1 max-w-full mr-[2rem]">
            <PointsCard 
              points={userData.points}
            />
          </div>
          
          {/* Promotions: Row 6, Column 2, Spans multiple rows */}
		  <div className="row-start-6 col-start-2 row-span-4 self-start w-full ml-2">
			<MyPromotions/>
		  </div>
          
          {/* Password: Row 7, Column 1 */}
          <div className="row-start-7 col-start-1 max-w-full mr-[3rem]">
            <DataField 
              fieldName="Password"
              fieldContent="********"
              isEditable={true}
            />
          </div>
          
          {/* Last login: Row 8, Column 1 */}
          <div className="row-start-8 col-start-1 max-w-full mr-[3rem]">
            <DataField 
              fieldName="Last login"
              fieldContent={(userData.lastLogin ? userData.lastLogin.slice(0,10): new Date().toISOString().slice(0,10))}
              isEditable={false}
            />
          </div>
          
          {/* Created at: Row 9, Column 1 */}
          <div className="row-start-9 col-start-1 max-w-full mr-[3rem]">
            <DataField 
              fieldName="Created at"
              fieldContent={userData.createdAt.slice(0,10)}
              isEditable={false}
            />
          </div>
        </div>
      </div>
    </div>    
  )
}

export default UserProfile
