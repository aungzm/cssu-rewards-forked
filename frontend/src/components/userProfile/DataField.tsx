import { Pencil } from 'lucide-react';
import React from "react";
import { useState } from 'react';
import { fetchWithAuth } from '../../utils/authHelper';
import { API_BASE_URL } from '../../utils/auth';
interface DataFieldProps {
  fieldName: string,
	fieldContent: string | number,
	isEditable: boolean,
	isLong?: boolean // note: DO NOT USE THIS SHIT THIS HARDCODE IS SO BAD honestly I don't see anything in the design that would benefit from this field
	isLeft?: boolean
}



const DataField: React.FC<DataFieldProps> = ({
  fieldName,
  fieldContent: initialFieldContent,
  isEditable,
  isLong,
  isLeft,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fieldContent, setFieldContent] = useState(initialFieldContent);

  const handleClick = () => {
    if (isEditable) {
      setIsEditing(true);
    }
  };
	const statusHandler = (status: Number) => {
		if (status===400) {
			if (fieldName==="Birthday") {
				alert("Birthday must be in YYYY-MM-DD");
			} else if (fieldName==="Email") {
				alert("Must be a valid UofT email");
			}
			return false;
		} else if (status===200) {
			alert(`${fieldName} successfully updated`);
			return true;
		}

	}
  const handleBlur = () => {
    setIsEditing(false);
		if (fieldName==="Password") {
			// redirect to reset password page
		} else {
			fetchWithAuth(`${API_BASE_URL}/users/me`, {
				method: "PATCH",
				body: JSON.stringify({[fieldName.toLowerCase()]:fieldContent}),
			}).then((res)=>statusHandler(res.status))
		}
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFieldContent(e.target.value);
  };

  return (
    <div
      className={
        "rounded-md bg-white row flex flex-row p-1 m-2 drop-shadow-lg items-center h-[3rem] " +
        (isLong ? "ml-2 col-span-2 justify-self-center text-center w-[49rem] " : "w-[24rem] ") +
        (isLeft ? "justify-self-end" : "")
      }
    >
      <span className="p-2 justify-self-center text-lg font-bold">{fieldName}:</span>
      
      {isEditing ? (
        <input
          type="text"
          value={fieldContent}
          onChange={handleChange}
          onBlur={handleBlur}
          autoFocus
          className="ml-2 flex-1 text-lg border-b-2 border-gray-300 focus:outline-none focus:border-blue-500"
        />
      ) : (
        <span className="ml-2 text-center text-lg text-ellipsis overflow-hidden">
          {fieldContent}
        </span>
      )}
      
      <span className="ml-auto" onClick={handleClick}>
        {isEditable ? <Pencil /> : <></>}
      </span>
    </div>
  );
};

export default DataField