import DataField from '../components/DataField';
import PointsCard from '../components/PointsCard';
import Navbar from "../components/Navbar";
import React from "react";
import { useUser } from  '../context/UserContext';
const UserProfile: React.FC= () => {
	const { userData } = useUser();
	if (!userData) {
		return <></>
	}
  return (
	<div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300 ">
		<div className=" bg-gray-500 rounded-full w-1/2"></div>
		<Navbar activeLink={''} />
		<div className="mx-auto justify-center">
			<div className=" grid grid-cols-[1fr,1fr] grid-rows-10 container  justify-self-center ">
				<div className={"row-span-4 bg-gray-500 rounded-full \
					self-center flex items-center justify-center mr-[4rem] justify-self-end w-[16rem] h-[16rem]"}>
					{/**ADD CODE FOR AVATAR HERE */}
				</div>
				<DataField 
					fieldName="Name"
					fieldContent={userData.name}
					isEditable={true}

				/>
				<DataField 
					fieldName="Utorid"
					fieldContent={userData.utorid}
					isEditable={false}
				/>
				<DataField 
					fieldName="Birthday"
					fieldContent={userData.birthday.slice(0,10)}
					isEditable={true}
				/>
				<DataField 
					fieldName="Role"
					fieldContent={userData.role.toLowerCase()}
					isEditable={false}
				/>
				<DataField 
					fieldName="Email"
					fieldContent={userData.email}
					isEditable={false}
					isLong={true}
				/>
				<div className="row-start-6 row-end-9">
					<PointsCard 
						points={userData.points}
					/>
				</div>
				<DataField 
					fieldName="Email"
					fieldContent={userData.email}
					isEditable={false}
				/>
			</div>
		</div>
	</div>    
	)
}


export default UserProfile