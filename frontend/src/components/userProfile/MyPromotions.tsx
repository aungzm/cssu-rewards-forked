import React, {useState,useEffect} from "react";
import PromotionsCard from "./PromotionsCard";
import { fetchWithAuth } from "../../utils/authHelper";
import { API_BASE_URL } from "../../utils/auth";

interface PromotionParams {
  id: number
  name: string
  amount: number
  endDate: Date
  minSpending: number
  rate: number
  type: string
}
interface GetPromotionsResponse {
  data: PromotionParams[]
  count: number
}

const MyPromotions: React.FC = () => {
  const [autoPromotions, setAutoPromotions] = useState({} as GetPromotionsResponse);
  const [oneTimePromotions, setOneTimePromotions] = useState({} as GetPromotionsResponse);
  useEffect(()=> {
    fetchWithAuth(`${API_BASE_URL}/promotions?type=automatic&page=1&size=2`).then(res=>res.json()).then(setAutoPromotions);
    fetchWithAuth(`${API_BASE_URL}/promotions?type=one-time&page=1&size=2`).then(res=>res.json()).then(setOneTimePromotions);
  }, [])
  // const dataLoader = ()=> {
  //   fetchWithAuth(`${API_BASE_URL}/promotions?type=automatic&page=1&size=2`).then(res=>res.json()).then(setAutoPromotions);
  //   fetchWithAuth(`${API_BASE_URL}/promotions?type=one-time&page=1&size=2`).then(res=>res.json()).then(setOneTimePromotions);
  //   return {auto: autoPromotions,oneTime: oneTimePromotions};
  // }
  // const {auto,oneTime} = dataLoader();
  console.log(autoPromotions)
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
        {/** Add auto promotions here using map */}
        
        {autoPromotions.data.map((promotion )=> {
          return (
          <PromotionsCard
            id={promotion.id}
            name={promotion.name}
            endDate={promotion.endDate}
            points={promotion.amount}
            minSpending={promotion.minSpending}
            rate= {promotion.rate}
            isAutomatic={true}
          />)
        })}

      </div>
      <div className="flex flex-col items-center justify-evenly">
        <div className="flex items-center gap-14"> 
          <p className="whitespace-nowrap italic font-bold">One-time Promotions </p> 
          <p className=" text-xs text-gray-500">These promotions can <br></br> only be used once</p>
        </div>
        <div className="flex flex-col justify-evenly">
          {/** Add one time promotions here using map */}
          {oneTimePromotions.data.map((promotion )=> {
          return (
          <PromotionsCard
            id={promotion.id}
            name={promotion.name}
            endDate={promotion.endDate}
            points={promotion.amount}
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