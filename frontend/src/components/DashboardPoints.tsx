import {useUser} from "../context/UserContext";


async function DashboardPoints() {

    const user = useUser();
    let points = user?.userData?.points || 0;

    <div className="dashboard-points">
        
        <h2> {points} Points</h2>
        <p> Available Points</p>
        <div className="buttons">
            <button onClick={() => alert("Sending Points")}> Send Points </button>
            <button className="redeem" onClick={()=> alert("Redeeming Points")}> Redeem Points </button>
        </div>


    </div>
    return (<></>);
}

export default DashboardPoints;