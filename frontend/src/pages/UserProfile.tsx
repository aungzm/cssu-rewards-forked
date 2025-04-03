import DataField from '../components/DataField';
import Navbar from "../components/Navbar";
const UserProfile=() => {
  return (
	<div className=" min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300 ">
		<div className=" bg-gray-500 rounded-full w-1/2"></div>
		<Navbar userName="John Smith" isSuperUser={false} activeLink="none" />
		<div className=" grid grid-cols-[1fr,1fr] grid-rows-4 container  justify-self-center">
		<div className={"row-span-4 bg-gray-500 rounded-full min-w-16 \
		min-h-16 self-center flex items-center justify-center mr-5 justify-self-end "+(window.innerWidth>=1250?"w-[25vw] h-[25vw]":"w-[40vw] h-[40vw]")}>
		</div>
			<DataField 
		fieldName="Name"
		fieldContent="John Smith"
		isEditable={true}
		/>
		<DataField 
		fieldName="Utorid"
		fieldContent="jsmith69"
		isEditable={false}
		/>
		<DataField 
		fieldName="Birthday"
		fieldContent="2000/01/01"
		isEditable={true}
		/>
		<DataField 
		fieldName="Role"
		fieldContent="Regular"
		isEditable={false}
		/>
		</div>
	</div>    
	)
}


export default UserProfile