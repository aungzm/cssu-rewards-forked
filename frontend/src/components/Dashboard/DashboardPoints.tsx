import React from "react";
import {useUser} from "../../context/UserContext";
import { useNavigate  } from "react-router-dom";


const DashboardPoints =  React.memo(() =>{
    const navigate = useNavigate();

    const user = useUser();
    const points = user?.userData?.points || 0;
    const formattedPoints = points.toLocaleString();

    return <div className="flex flex-col items-center justify-center bg-white shadow-md rounded-lg p-6 my-4 mr-8 dark:bg-slate-600">
        
        <h1 className="text-5xl text-[#002A5C] font-bold dark:text-blue-500"> {formattedPoints}</h1>
        <p className="text-gray-500 text-xl dark:text-white"> Available Points</p>
        
        <div className="flex flex-row my-4">
            <button  onClick={() => navigate("/transfer-points")} className="bg-white text-[#0063C6] font-xl border border-[#0063C6] rounded-sm px-4 py-2 hover:bg-blue-100 dark:bg-gray-400 dark:border-none dark:text-white dark:hover:bg-gray-500"> Send Points </button>
            <button onClick={() => navigate("/redeem-points")} className="mx-4 bg-[#0063C6] text-white font-xl border border-[#0063C6] rounded-sm px-4 py-2 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 dark:border-none"> Redeem Points </button>
        </div>


    </div>
    
});

export default DashboardPoints;