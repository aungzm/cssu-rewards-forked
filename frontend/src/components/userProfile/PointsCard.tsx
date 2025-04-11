import React from "react";
import { useNavigate } from "react-router-dom";

interface PointsCardProps {
  points: number
}

const PointsCard: React.FC<PointsCardProps> = ({
  points,
}) => {
  const navigate = useNavigate();
  return (
  <div className="rounded-md bg-white justify-self-end flex flex-col drop-shadow-lg w-full 
  items-center p-1 m-2 drop-shadow-lg items-center h-[12rem] dark:bg-gray-700 dark:text-gray-100 mr-0">
    <p> You have </p>
    <p className="text-6xl text-[#002A5C] font-bold dark:text-gray-100"> {points}</p>
    <p> available points</p>
    <div className="flex justify-evenly w-full mt-4">
      <button className="w-[8rem] p-2 border-solid border border-[#00329E] rounded-md text-[#00329E] dark:text-gray-100" onClick={() => navigate("/transfer-points")}>Send Points</button>
      <button className="w-[8rem] p-2 rounded-md bg-[#00329E] text-white" onClick={() => navigate("/redeem-points")}>Redeem Points</button>
    </div>
    
  </div>
  )
}

export default PointsCard