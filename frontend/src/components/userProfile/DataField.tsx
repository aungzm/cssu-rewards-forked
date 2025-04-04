import { Pencil } from 'lucide-react';
import React from "react";

interface DataFieldProps {
  fieldName: string,
	fieldContent: string | number,
	isEditable: boolean,
	onClick: Function,
	isLong?: boolean // note: DO NOT USE THIS SHIT THIS HARDCODE IS SO BAD honestly I don't see anything in the design that would benefit from this field
	isLeft?: boolean
}

const DataField: React.FC<DataFieldProps> = ({
  fieldName,
	fieldContent,
	isEditable,
	onClick,
	isLong,
	isLeft,
}) => {
	const clickHandler = () => {
		onClick();
	}
	
	return <div className={"rounded-md bg-white row flex flex-row p-1 m-2 drop-shadow-lg items-center h-[3rem] "
	+(isLong?"ml-2 col-span-2 justify-self-center text-center w-[49rem] ":"w-[24rem] ")+(isLeft?"justify-self-end":"")}>
		<span className='p-2 justify-self-center text-lg font-bold'>{fieldName}:</span>
		<span className="ml-2 text-center text-lg text-ellipsis overflow-hidden">{fieldContent}</span>
		<span className="ml-auto" onClick={()=> {clickHandler}}>{ (isEditable? <Pencil/>: <></>)}</span>
	</div>
}

export default DataField

