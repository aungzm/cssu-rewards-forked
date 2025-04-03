import { Pencil } from 'lucide-react';
import React from "react";

interface DataFieldProps {
  fieldName: string,
	fieldContent: string | number,
	isEditable: boolean,
}

const DataField: React.FC<DataFieldProps> = ({
  fieldName,
	fieldContent,
	isEditable,
}) => {
	return <div className={"rounded-xl bg-white row flex flex-row p-6 m-5 drop-shadow-lg "+(window.innerWidth>=1250?"w-[25vw]":"w-[40vw]")}>
		<span className='justify-self-start '>{fieldName}:</span>
		<span className="ml-5">{fieldContent}</span>
		<span className="ml-auto">{ (isEditable? <Pencil/>: <></>)}</span>
	</div>
}

export default DataField

