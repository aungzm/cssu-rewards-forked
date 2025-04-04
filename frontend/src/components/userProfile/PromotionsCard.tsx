import React from "react";


interface PromotionsCardProps {
  id: number, // only used to fetch description on click
  name: string,
  endDate: Date,
  points: number,
  minSpending: number,
  rate: number,
  isAutomatic?: boolean, //false by default
}

const PromotionsCard: React.FC<PromotionsCardProps> = ({
  id, // only used to fetch description on click
  name,
  endDate,
  points,
  minSpending,
  rate,
  isAutomatic, //false by default
}) => {
  id=0 //stop ts from complaining
  if (isAutomatic) {
    return (
      <div className="bg-gray-100 h-[3rem] w-[21rem] p-1 m-2 rounded-md">
        <p className="font-bold ml-2 text-sm">{name}</p>
        <p className="ml-2 text-gray-600 text-sm"> Gain </p>
        <p className="ml-2 text-gray-600 text-sm">{"Active until "+endDate.toISOString().slice(0,10)}</p>
      </div>
    )
  } else {
    return (
      <div className="h-[3rem] w-[21rem] p-1 m-2 rounded-md">
        <p className="font-bold ml-2 text-sm">{name}</p>
        <p className="ml-2 text-gray-600 text-sm">{"Expires at "+endDate.toISOString().slice(0,10)}</p>
      </div>
    )
  }
  
}

export default PromotionsCard;
