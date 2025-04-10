import React, {useState} from "react";
import { API_BASE_URL } from "../utils/auth";
import { fetchWithAuth } from "../utils/authHelper";
import Navbar from "../components/Navbar";


const ProcessRedemption: React.FC = () => {

    const [redemptionId, setRedemptionId] = useState<string>("");

    const handleSubmit = async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/transactions/${redemptionId}/processed`, {
                method: "PATCH",
                body: JSON.stringify({
                    processed: true,
                }),
            });
            if (!response.ok) {
                alert("Redemption request not found");
                throw new Error("Network response was not ok");
            }
            const data = await response.json();
            alert("Redemption request processed successfully");
            console.log(data);
        } catch (error) {
            console.error("Error processing redemption:", error);
        }
    }

    return (
        <>
        <Navbar activeLink="dashboard" />

        <div className="bg-gray-100 min-h-screen flex flex-col items-center">
            <div className="flex flex-col items-start w-2/3 mt-4">
                {/* Header */}
                <div className="w-full max-w-md mb-4">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: "#002A5C" }}>
                        Process Redemption Request
                    </h2>
                    <p className="text-gray-500">Verify and Complete Redemption Request</p>
                </div>

                {/* Main Content */}
                <div className="w-full bg-white border border-gray-300 shadow-md p-4">
                    <h2 className="text-xl font-bold mb-6" style={{ color: "#002A5C" }}>
                        Redemption ID
                    </h2>

                    <label className="text-md font-bold mb-2 block">Redemption ID</label>
                    <input
                        type="text"
                        value={redemptionId}
                        onChange={(e) => setRedemptionId(e.target.value)}
                        placeholder="Enter Redemption ID"
                        className="w-full max-w-md border border-gray-300 rounded-lg p-2 mb-4"
                    />
                    <p className="text-sm text-gray-500 mb-4">
                        Enter the Redemption ID from the QR Code to process the redemption request.
                    </p>

                    <button
                        onClick={handleSubmit}
                        className="bg-blue-500 hover:bg-blue-700 text-white rounded p-2"
                    >
                        Process Redemption
                    </button>
                </div>
            </div>
        </div>
        </>
    )
}

export default ProcessRedemption;