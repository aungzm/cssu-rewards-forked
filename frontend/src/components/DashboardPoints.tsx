import React from "react";
import {useUser} from "../context/UserContext";


const DashboardPoints =  React.memo(() =>{

    const user = useUser();
    let points = user?.userData?.points || 0;
    let formattedPoints = points.toLocaleString();

    return <div className="flex flex-col items-center justify-center bg-white shadow-md rounded-lg p-6 my-4 max-w-2xl">
        
        <h1 className="text-3xl text-[#002A5C] font-bold"> {formattedPoints}</h1>
        <p className="text-gray-500"> Available Points</p>
        <div className="flex flex-row my-4">
            <button className="bg-white text-[#0063C6] font-medium border border-[#0063C6] rounded-sm px-4 py-2 hover:bg-blue-100" onClick={() => alert("Sending Points")}> Send Points </button>
            <button className="mx-4 bg-[#0063C6] text-white font-medium border border-[#0063C6] rounded-sm px-4 py-2 hover:bg-blue-500" onClick={()=> alert("Redeeming Points")}> Redeem Points </button>
        </div>


    </div>
    
});

export default DashboardPoints;