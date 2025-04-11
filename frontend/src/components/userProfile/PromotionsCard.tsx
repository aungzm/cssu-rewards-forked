import React from "react";


interface PromotionsCardProps {
  id: number, // only used to fetch description on click
  name: string,
  endTime: string,
  points: number,
  minSpending: number,
  rate: number,  //this is the additional rate, the default rate is 0.04
  isAutomatic?: boolean, //false by default
}

const PromotionsCard: React.FC<PromotionsCardProps> = ({
  id, // only used to fetch description on click
  name,
  endTime,
  points,
  minSpending, // in terms of dollar
  rate,
  isAutomatic, //false by default
}) => {
  let bonus = `Gain ${(rate?"+"+Math.round(rate*100/0.04)+"% points":"")}`;
  bonus+=`${(rate && points?" and ":" ")}`;
  bonus+=`${(points ? points+" extra points":" ")}`;
  bonus+= `${(minSpending ? " by spending $"+minSpending:" for any purchase")}`;
  if (isAutomatic) {
    return (
      <div key={id as React.Key} className="bg-gray-100 w-[21rem] dark:bg-gray-800 dark:text-gray-100 p-1 m-2 rounded-md">
        <p className="font-bold ml-2 text-sm">{name}</p>
        <p className="ml-2 text-gray-600 text-xs italic whitespace-nowrap text-ellipsis overflow-hidden dark:text-gray-100"> {bonus}</p>
        <p className="ml-2 text-gray-600 text-xs mb-2 dark:text-gray-100">{"Active until "+endTime.slice(0,10)}</p>
      </div>
    )
  } else {
    return (
      <div key={id as React.Key} className="bg-gray-100 w-[21rem] dark:bg-gray-800 dark:text-gray-100 p-1 m-2 rounded-md">
        <p className="font-bold ml-2 text-sm">{name}</p>
        <p className="ml-2 text-gray-600 text-xs italic whitespace-nowrap text-ellipsis overflow-hidden dark:text-gray-100"> {bonus}</p>
        <p className="ml-2 text-gray-600 text-xs mb-2 dark:text-gray-100">{"Expires at "+endTime.slice(0,10)}</p>
      </div>
    )
  }
  
}

export default PromotionsCard;
