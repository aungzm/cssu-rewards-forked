import React from "react";


interface PromotionsCardProps {
  id: number, // only used to fetch description on click
  name: string,
  endDate: Date,
  points: number,
  minSpending: number,
  rate: number,  //this is the additional rate, the default rate is 0.04
  isAutomatic?: boolean, //false by default
}

const PromotionsCard: React.FC<PromotionsCardProps> = ({
  id, // only used to fetch description on click
  name,
  endDate,
  points,
  minSpending, // in terms of dollar
  rate,
  isAutomatic, //false by default
}) => {
  id=0 //stop ts from complaining
  let bonus = `Gain ${(rate?"+"+Math.round(rate*100/0.04)+"% points":"")}`;
  bonus+=`${(rate && points?" and ":" ")}`;
  bonus+=`${(points ? points+" extra points":" ")}`;
  bonus+= `${(minSpending ? " by spending $"+minSpending:" for any purchase")}`;
  if (isAutomatic) {
    return (
      <div className="bg-gray-100 h-[3.5rem] w-[21rem] p-1 m-2 rounded-md">
        <p className="font-bold ml-2 text-sm">{name}</p>
        <p className="ml-2 text-gray-600 text-xs italic"> {bonus}</p>
        <p className="ml-2 text-gray-600 text-xs">{"Active until "+endDate.toISOString().slice(0,10)}</p>
      </div>
    )
  } else {
    return (
      <div className="bg-gray-100 h-[3.5rem] w-[21rem] p-1 m-2 rounded-md">
        <p className="font-bold ml-2 text-sm">{name}</p>
        <p className="ml-2 text-gray-600 text-xs italic"> {bonus}</p>
        <p className="ml-2 text-gray-600 text-xs">{"Expires at "+endDate.toISOString().slice(0,10)}</p>
      </div>
    )
  }
  
}

export default PromotionsCard;
