

async function DashboardPoints() {

    let points = 20;
    const url = "http://localhost:3000/users/me";

    try {
        await fetch(url, {method: "GET"})
    
    } catch (error) {
        console.log("Error fetching data:", error);
        return 
    }


        // get/users/me


    <div className="dashboard-points">

        
        <h1> {points} Points</h1>
        <p> Available Points</p>
        <div className="buttons">
            <button onClick={() => alert("Sending Points")}> Send Points </button>
            <button className="redeem" onClick={()=> alert("Redeeming Points")}> Redeem Points </button>
        </div>


    </div>
    return (<></>);
}

export default DashboardPoints;