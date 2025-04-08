import React from "react";
import {useUser} from "../../context/UserContext";


const DashboardPoints =  React.memo(() =>{

    const user = useUser();
    const points = user?.userData?.points || 0;
    const formattedPoints = points.toLocaleString();

    return <div className="flex flex-col items-center justify-center bg-white shadow-md rounded-lg p-6 my-4 mr-8 ">
        
        <h1 className="text-5xl text-[#002A5C] font-bold"> {formattedPoints}</h1>
        <p className="text-gray-500 text-xl"> Available Points</p>
        
        <div className="flex flex-row my-4">
            <button className="bg-white text-[#0063C6] font-xl border border-[#0063C6] rounded-sm px-4 py-2 hover:bg-blue-100"> Send Points </button>
            <button className="mx-4 bg-[#0063C6] text-white font-xl border border-[#0063C6] rounded-sm px-4 py-2 hover:bg-blue-500"> Redeem Points </button>
        </div>


    </div>
    
});

export default DashboardPoints;