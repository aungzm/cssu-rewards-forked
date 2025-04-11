import React, { useState, useEffect, useRef } from "react";
import { UserType } from "../../pages/CreateTransaction";
import { API_BASE_URL } from "../../utils/auth";
import { fetchWithAuth } from "../../utils/authHelper";
import { ScanLine, X } from "lucide-react";
import jsQR from "jsqr";

interface TransactionInfoProps {
    user: UserType | null;
    creator: UserType | null;
}

const TransactionInfo: React.FC<TransactionInfoProps> = ({ user, creator }) => {
    const [type, setType] = useState("");
    const [spent, setSpent] = useState<number | "">("");
    const [amount, setAmount] = useState<number | "">("");
    const [relatedId, setRelatedId] = useState<number | "">("");
    const [remarks, setRemarks] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    // promotionIds for purchase transactions
    const [promotionIds, setPromotionIds] = useState<number[]>([]);
    const [promotionIdText, setPromotionIdText] = useState("");

    // QR Scanner states for Promotion IDs
    const [showScanModal, setShowScanModal] = useState<boolean>(false);
    const [scanning, setScanning] = useState<boolean>(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scannerIntervalRef = useRef<number | null>(null);

    // Handle toast display and auto-hide
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        if (showToast) {
            timer = setTimeout(() => {
                setShowToast(false);
            }, 3000); // Toast will disappear after 3 seconds
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [showToast]);

    const displayToast = (message: string, type: "success" | "error") => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
    };

    const handleSubmit = async () => {
        try {
            if (
                type === "purchase" &&
                user !== null &&
                spent !== "" &&
                spent > 0
            ) {
                const response = await fetchWithAuth(`${API_BASE_URL}/transactions`, {
                    method: "POST",
                    body: JSON.stringify({
                        utorid: user.utorid,
                        spent,
                        promotionIds, // Include scanned or entered promotion IDs
                        remark: remarks,
                        type,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Network response was not ok");
                } else {
                    displayToast("Transaction created successfully", "success");
                }
            } else if (
                type === "adjustment" &&
                user !== null &&
                amount !== "" &&
                relatedId !== ""
            ) {
                const response = await fetchWithAuth(`${API_BASE_URL}/transactions`, {
                    method: "POST",
                    body: JSON.stringify({
                        utorid: user.utorid,
                        amount,
                        relatedId,
                        remark: remarks,
                        type,
                    }),
                });
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                } else {
                    displayToast("Transaction created successfully", "success");
                }
            } else {
                displayToast(
                    "Please enter valid transaction information",
                    "error"
                );
            }
        } catch (error) {
            console.error("Error creating transaction:", error);
            displayToast("Error creating transaction", "error");
        }
    };

    // QR Scanner functions for Promotion IDs
    const startScanner = async () => {
        try {
            setShowScanModal(true);
            setScanning(true);
            setScanResult(null);

            // Access the camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                // Start scanning every 100ms for better responsiveness
                scannerIntervalRef.current = window.setInterval(() => {
                    scanQRCode();
                }, 100);
            }
        } catch (error) {
            console.error("Error accessing camera:", error);
            displayToast(
                "Could not access camera. Please check permissions.",
                "error"
            );
            setShowScanModal(false);
            setScanning(false);
        }
    };

    const stopScanner = () => {
        setScanning(false);

        // Stop the interval
        if (scannerIntervalRef.current) {
            clearInterval(scannerIntervalRef.current);
            scannerIntervalRef.current = null;
        }

        // Stop the video stream
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            const tracks = stream.getTracks();
            tracks.forEach((track) => track.stop());
            videoRef.current.srcObject = null;
        }

        setShowScanModal(false);
        setScanResult(null);
    };

    const scanQRCode = () => {
        if (
            !canvasRef.current ||
            !videoRef.current ||
            !videoRef.current.videoWidth
        )
            return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current video frame to the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get the image data from the canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
            // Use jsQR to detect QR codes in the image data
            const code = jsQR(
                imageData.data,
                imageData.width,
                imageData.height,
                { inversionAttempts: "dontInvert" }
            );
            if (code) {
                console.log("QR code detected:", code.data);
                handleQRCodeResult(code.data);
            }
        } catch (error) {
            console.error("Error scanning QR code:", error);
        }
    };

    const handleQRCodeResult = (result: string) => {
        setScanResult(result);
        // Extract all integers found in the scanned result.
        const matches = result.match(/\d+/g);
        if (matches && matches.length > 0) {
          const numbers = matches.map((m) => parseInt(m, 10));
          // Append the new numbers (ignoring duplicates)
          const newSet = new Set(promotionIds);
          numbers.forEach((num) => newSet.add(num));
          const newIds = Array.from(newSet);
          setPromotionIds(newIds);
          // Update the text input to reflect the new promotion IDs
          setPromotionIdText(newIds.join(", "));
          stopScanner();
          displayToast("Promotion IDs scanned successfully", "success");
        } else {
          displayToast(
            "Invalid QR code. Please scan a QR code with valid integers.",
            "error"
          );
        }
    };

    return (
        <div className="bg-white flex flex-col w-full mt-4 p-3 md:p-4 border border-gray-300 shadow-md rounded-lg relative">
            {/* Toast Notification */}
            {showToast && (
                <div
                    className={`fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-md transition-opacity duration-300 z-50 ${toastType === "success" ? "bg-green-500" : "bg-red-500"
                        } text-white ${showToast ? "opacity-100" : "opacity-0"}`}
                >
                    {toastMessage}
                </div>
            )}

            <h2
                className="text-xl md:text-2xl font-bold mb-4"
                style={{ color: "#002A5C" }}
            >
                Transaction Details
            </h2>

            {/* Type - Stacked on mobile */}
            <div className="flex flex-col md:flex-row items-start md:items-center w-full mb-4">
                <div className="w-full md:w-1/2 mb-3 md:mb-0 md:mr-2">
                    <label className="block mb-1 md:mb-0 md:mr-2">
                        Transaction Type
                    </label>
                    <select
                        className="border border-gray-300 rounded-md p-2 w-full"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                    >
                        <option value="">Select Type</option>
                        <option value="purchase">Purchase</option>
                        {creator &&
                            (creator.role === "MANAGER" ||
                                creator.role === "SUPERUSER") && (
                                <option value="adjustment">Adjustment</option>
                            )}
                    </select>
                </div>

                {/* Amount */}
                <div className="w-full md:w-1/2 mr-2">
                    <label className="block mb-1 md:mb-0">Amount</label>
                    <input
                        type="number"
                        className="border border-gray-300 rounded-md p-2 w-full"
                        value={type === "purchase" ? spent : amount}
                        onChange={(e) => {
                            if (type === "purchase") {
                                setSpent(e.target.value === "" ? "" : Number(e.target.value));
                            } else {
                                setAmount(e.target.value === "" ? "" : Number(e.target.value));
                            }
                        }}
                        placeholder="Enter transaction amount"
                    />
                </div>

                {/* Promotion Ids (for purchase) */}
                <div className="w-full md:w-1/2">
                    <div>
                        <label className="block mb-1 md:mb-0">Promotion Ids</label>
                        <div className="flex items-center">
                            <input
                                type="text"
                                className="border border-gray-300 rounded-md p-2 w-full"
                                value={promotionIdText}
                                onChange={(e) => {
                                    // Update the text input directly
                                    setPromotionIdText(e.target.value);

                                    // Process the text into numbers only on valid input
                                    const input = e.target.value;
                                    const numbers = input
                                        .split(",")
                                        .map((s) => parseInt(s.trim(), 10))
                                        .filter((n) => !isNaN(n));
                                    setPromotionIds(numbers);
                                }}
                                placeholder="Enter promotion IDs (comma separated)"
                            />
                            <button
                                onClick={startScanner}
                                disabled={scanning}
                                className="ml-2 text-gray-500 hover:text-blue-500"
                            >
                                <ScanLine size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Id (only for adjustment) */}
            {type === "adjustment" && (
                <div className="mb-4">
                    <label className="block mb-1">Related Transaction ID</label>
                    <input
                        className="border border-gray-300 rounded-md p-2 w-full"
                        type="number"
                        value={relatedId}
                        onChange={(e) =>
                            setRelatedId(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="Enter related transaction ID"
                    />
                </div>
            )}

            {/* Large Text Field */}
            <div className="mb-4">
                <label className="block mb-1">Notes (Optional)</label>
                <textarea
                    id="textField"
                    className="border border-gray-300 rounded-md p-2 w-full"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter details here..."
                    rows={3}
                />
            </div>

            {/* Summary */}
            <div className="bg-gray-100 flex flex-col w-full p-3 md:p-4 mb-4 border border-gray-300 rounded-lg">
                <h2
                    className="text-lg font-bold mb-3"
                    style={{ color: "#002A5C" }}
                >
                    Transaction Summary
                </h2>

                <div className="flex flex-row justify-between items-center w-full mb-3">
                    <p className="text-gray-500">User:</p>
                    {user ? (
                        <p className="text-gray-500 break-all">{user.utorid}</p>
                    ) : (
                        <p className="text-gray-500">Not selected</p>
                    )}
                </div>

                <div className="flex flex-row justify-between items-center w-full mb-3">
                    <p className="text-gray-500">Transaction Type:</p>
                    <p className="text-gray-500">{type || "Not selected"}</p>
                </div>

                {type === "purchase" && (
                    <div className="flex flex-row justify-between items-center w-full mb-3">
                        <p className="text-gray-500">Dollars Spent:</p>
                        <p className="text-gray-500">{spent || "0"}</p>
                    </div>
                )}

                {type === "adjustment" && (
                    <div className="flex flex-row justify-between items-center w-full mb-3">
                        <p className="text-gray-500">Related ID:</p>
                        <p className="text-gray-500">{relatedId || "Not set"}</p>
                    </div>
                )}

                <div className="flex flex-row justify-between items-center w-full mb-3">
                    <p className="text-gray-500">Total Points:</p>
                    {type === "adjustment" && (
                        <p className="text-gray-500">
                            {amount !== "" ? amount : 0} Points
                        </p>
                    )}
                    {type === "purchase" && (
                        <p className="text-gray-500">
                            {spent !== "" ? spent * 4 : 0} Points
                        </p>
                    )}
                    {!type && <p className="text-gray-500">0 Points</p>}
                </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center md:justify-end">
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white rounded p-2 px-4 w-full md:w-auto"
                    onClick={handleSubmit}
                >
                    Create Transaction
                </button>
            </div>

            {/* -------------------------------
          QR Scanner Modal for Promotion IDs
      ------------------------------- */}
            {showScanModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75">
                    <div className="bg-white rounded-lg overflow-hidden w-full max-w-md">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-bold">Scan Promotion QR Code</h3>
                            <button
                                onClick={stopScanner}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="relative bg-black">
                            <video
                                ref={videoRef}
                                className="w-full h-64 object-cover"
                                playsInline
                                muted
                            ></video>
                            <canvas
                                ref={canvasRef}
                                className="absolute top-0 left-0 invisible"
                            ></canvas>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-3/4 h-3/4 border-2 border-blue-500 opacity-70">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4">
                            {scanResult ? (
                                <p className="text-center text-sm font-medium mb-4">
                                    Detected: <span className="text-blue-600">{scanResult}</span>
                                </p>
                            ) : (
                                <p className="text-center text-sm text-gray-600 mb-4">
                                    Position the QR code within the frame
                                </p>
                            )}
                            <button
                                onClick={stopScanner}
                                className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionInfo;
