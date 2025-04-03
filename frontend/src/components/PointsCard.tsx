import React from "react";

interface PointsCardProps {
  points: number
}

const PointsCard: React.FC<PointsCardProps> = ({
  points,
}) => {
  return (
  <div className="rounded-md bg-white justify-self-end flex flex-col drop-shadow-lg 
  items-center p-1 m-2 drop-shadow-lg items-center h-[12rem] w-[24rem]">
    <p> You have </p>
    <p className="text-6xl text-[#002A5C] font-bold"> {points}</p>
    <p> available points</p>
    <div className="flex justify-evenly w-full">
      <button className="w-32 p-2 border-solid border border-[#00329E] rounded-md text-[#00329E]">Send Points</button>
      <button className="w-32 p-2 rounded-md bg-[#00329E] text-white">Redeem Points</button>
    </div>
    
  </div>
  )
}

export default PointsCard