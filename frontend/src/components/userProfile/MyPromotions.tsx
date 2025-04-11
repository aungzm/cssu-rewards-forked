import React, {useState,useEffect} from "react";
import PromotionsCard from "./PromotionsCard";
import { fetchWithAuth } from "../../utils/authHelper";
import { API_BASE_URL } from "../../utils/auth";
import { useNavigate } from "react-router-dom";

interface PromotionParams {
  id: number
  name: string
  points: number
  endTime: string
  minSpending: number
  rate: number
  type: string
}
interface GetPromotionsResponse {
  results: PromotionParams[]
  count: number
}

const MyPromotions: React.FC = () => {
  const navigate = useNavigate();
  const [autoPromotions, setAutoPromotions] = useState<GetPromotionsResponse>({ 
    results: [], 
    count: 0 
  });
  const [oneTimePromotions, setOneTimePromotions] = useState<GetPromotionsResponse>({ 
    results: [], 
    count: 0 
  });
  useEffect(()=> {
    fetchWithAuth(`${API_BASE_URL}/promotions?type=automatic&page=1&limit=2`)
    .then(res=>res.json())
    .then(data=>{
      setAutoPromotions(data)
    });
    fetchWithAuth(`${API_BASE_URL}/promotions?type=one-time&page=1&limit=2`).then(res=>res.json()).then(setOneTimePromotions);
  }, [])
  return (
    <div className="rounded-md bg-white dark:bg-gray-700 dark:text-gray-100 row flex flex-col p-2 mb-2 drop-shadow-lg">
      <div className="flex justify-between border-b">
        <span className="m-2 mb-0">Your Promotions</span>
        <a className="m-2 mb-0 cursor-pointer" onClick={() => navigate('/promotions')}>View All</a> 
      </div>
      <div className="mt-2 flex flex-col items-center">
        <div className="flex items-start gap-2 items-center"> 
          <p className="whitespace-nowrap italic font-bold mt-2">Automatic Promotions </p> 
          {/* <p className=" text-xs text-gray-500">Gain extra points throughout <br></br> the entire promotion period</p> */}
        </div>
        {/** Add auto promotions here using map */}
        
        {autoPromotions.results.map((promotion )=> {
          return (
          <PromotionsCard
            id={promotion.id}
            name={promotion.name}
            endTime={promotion.endTime}
            points={promotion.points}
            minSpending={promotion.minSpending}
            rate= {promotion.rate}
            isAutomatic={true}
          />)
        })}

      </div>
      <div className="flex flex-col items-center justify-evenly">
        <div className="flex items-center gap-14"> 
          <p className="whitespace-nowrap italic font-bold mt-2">One-time Promotions </p> 
          {/* <p className=" text-xs text-gray-500">These promotions can <br></br> only be used once</p> */}
        </div>
        <div className="flex flex-col justify-evenly">
          {/** Add one time promotions here using map */}
          {oneTimePromotions.results.map((promotion )=> {
          return (
          <PromotionsCard
            id={promotion.id}
            name={promotion.name}
            endTime={promotion.endTime}
            points={promotion.points}
            minSpending={promotion.minSpending}
            rate= {promotion.rate}
            isAutomatic={false}
          />)
        })}
        </div>
        
        

      </div>
    </div>
  )
}

export default MyPromotions;