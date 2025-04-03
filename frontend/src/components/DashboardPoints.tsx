import React from "react";
import {useUser} from "../context/UserContext";


const DashboardPoints =  React.memo(() =>{

    const user = useUser();
    let points = user?.userData?.points || 0;

    return <div className="dashboard-points">
        
        <h1> {points} Points</h1>
        <p> Available Points</p>
        <div className="buttons">
            <button onClick={() => alert("Sending Points")}> Send Points </button>
            <button className="redeem" onClick={()=> alert("Redeeming Points")}> Redeem Points </button>
        </div>


    </div>
    
});

export default DashboardPoints;