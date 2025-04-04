import React from "react";
import PromotionsCard from "./PromotionsCard";
import { fetchWithAuth } from "../../utils/authHelper";
import { API_BASE_URL } from "../../utils/auth";

const MyPromotions: React.FC = () => {
  return (
    <div className="rounded-md bg-white row flex flex-col p-1 m-2 mb-0 drop-shadow-lg h-[25rem] w-[24rem]">
      <div className="flex justify-between border-b">
        <span className="m-2 mb-0">Your Promotions</span>
        <a className="m-2 mb-0" href={`${API_BASE_URL}/promotions/me`}>View All</a> {/**Doesn't exist yet */}
      </div>
      <div className="flex flex-col items-center">
        <div className="flex items-start gap-2 items-center"> 
          <p className="whitespace-nowrap italic font-bold">Automatic Promotions </p> 
          <p className=" text-xs text-gray-500">Gain extra points throughout <br></br> the entire promotion period</p>
        </div>
        <PromotionsCard 
          id={1}
          name="asd"
          points={69}
          endDate={new Date(Date.now()+1000*3600*48)}
          minSpending={0}
          rate={0}
          isAutomatic={true}
        />
        <PromotionsCard 
          id={1}
          name="asd"
          points={69}
          endDate={new Date(Date.now()+1000*3600*48)}
          minSpending={0}
          rate={0}
          isAutomatic={true}
        />

      </div>
      <div className="flex flex-col items-center justify-evenly">
        <div className="flex items-center gap-14"> 
          <p className="whitespace-nowrap italic font-bold">One-time Promotions </p> 
          <p className=" text-xs text-gray-500">These promotions can <br></br> only be used once</p>
        </div>
        <div className="flex flex-col justify-evenly">
          <PromotionsCard 
            id={1}
            name="asd"
            points={69}
            endDate={new Date(Date.now()+1000*3600*48)}
            minSpending={0}
            rate={0}
            isAutomatic={false}
          />
          <PromotionsCard 
            id={1}
            name="asd"
            points={69}
            endDate={new Date(Date.now()+1000*3600*48)}
            minSpending={0}
            rate={0}
            isAutomatic={false}
          />
        </div>
        
        

      </div>
    </div>
  )
}

export default MyPromotions;