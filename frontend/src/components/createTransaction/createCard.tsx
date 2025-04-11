import React, { useState, useRef, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/authHelper';
import { API_BASE_URL } from '../../utils/auth';
import { ScanLine, X, CheckCircle } from "lucide-react";
import jsQR from "jsqr";

type CreateCardProps = {
    type: string;
    user: {
        id: number;
        points: number;
    }
}

interface RedemptionResponse {
    id: number;
    utorid: string;
    type: string;
    processedBy: string | null;
    amount: number;
    remark: string;
    createdBy: string;
}

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
}

const Toast: React.FC<ToastProps & { onClose: () => void }> = ({ message, type, visible, onClose }) => {
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [visible, onClose]);

    if (!visible) return null;

    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

    return (
        <div className={`fixed bottom-4 right-4 ${bgColor} text-white p-3 rounded-md shadow-lg flex items-center z-50`}>
            {type === 'success' && <CheckCircle size={20} className="mr-2" />}
            {type === 'error' && <X size={20} className="mr-2" />}
            <span>{message}</span>
        </div>
    );
};

const CreateCard: React.FC<CreateCardProps> = ({ type, user }) => {
    const [recipientId, setRecipientId] = useState<number | null>(null);
    const [amount, setAmount] = useState<number | null>(null);
    const [remarks, setRemarks] = useState<string>("");
    const [showQRModal, setShowQRModal] = useState<boolean>(false);
    const [redemptionData, setRedemptionData] = useState<RedemptionResponse | null>(null);
    
    // QR Scanner States
    const [showScanModal, setShowScanModal] = useState<boolean>(false);
    const [scanning, setScanning] = useState<boolean>(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scannerIntervalRef = useRef<number | null>(null);
    
    // Toast States
    const [toast, setToast] = useState<ToastProps>({
        message: '',
        type: 'info',
        visible: false
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({
            message,
            type,
            visible: true
        });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };

    const handleSubmit = async () => {
        if (type === "transfer" && recipientId !== null && recipientId <= 0) {
            showToast("Please enter a valid recipient ID", "error");
            return;
        }

        if (amount !== null && amount <= 0) {
            showToast("Please enter a positive amount", "error");
            return;
        }

        if (amount !== null && amount > user.points) {
            showToast("You do not have enough points", "error");
            return;
        }

        if (type === "transfer" && recipientId === user.id) {
            showToast("You cannot transfer points to yourself", "error");
            return;
        }

        const url = type === "transfer" ? `${API_BASE_URL}/users/${recipientId}/transactions` 
            : `${API_BASE_URL}/users/me/transactions`;

        try {
            const response = await fetchWithAuth(url, {
                method: "POST",
                body: JSON.stringify({
                    amount,
                    remarks,
                    type,
                }),
            });
            
            if (!response.ok) {
                showToast("Transaction creation failed", "error");
                throw new Error("Network response was not ok");
            }
            
            const data = await response.json();
            console.log(data);
            
            if (type === "redemption") {
                // Store the redemption data and show QR modal
                setRedemptionData(data);
                setShowQRModal(true);
                showToast("Redemption created successfully!", "success");
            } else {
                showToast("Transaction created successfully!", "success");
                resetForm();
            }
        } catch (error) {
            console.error("Error creating transaction:", error);
            showToast("Failed to create transaction. Please try again.", "error");
        }
    };

    const resetForm = () => {
        setRecipientId(null);
        setAmount(null);
        setRemarks("");
    };

    const closeModal = () => {
        setShowQRModal(false);
        resetForm();
    };

    const generateQRCodeUrl = (redemptionId: number) => {
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(redemptionId)}`;
    };

    // QR Scanner Functions
    const startScanner = async () => {
        try {
            setShowScanModal(true);
            setScanning(true);
            setScanResult(null);
            
            // Access the camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                
                // Start scanning for QR codes
                scannerIntervalRef.current = window.setInterval(() => {
                    scanQRCode();
                }, 100);
            }
            
        } catch (error) {
            console.error("Error accessing camera:", error);
            showToast("Could not access camera. Please check permissions.", "error");
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
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        
        setShowScanModal(false);
        setScanResult(null);
    };

    const scanQRCode = () => {
        if (!canvasRef.current || !videoRef.current || !videoRef.current.videoWidth) return;
        
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) return;
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get the image data from canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
            // Use jsQR to detect QR codes in the image
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
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
        
        // Check if the result is a valid ID (number)
        if (/^\d+$/.test(result)) {
            const numericId = parseInt(result, 10);
            setRecipientId(numericId);
            stopScanner();
            showToast("Recipient ID scanned successfully", "success");
        } else if (result.startsWith("RECIPIENT:")) {
            const id = result.replace("RECIPIENT:", "");
            
            if (/^\d+$/.test(id)) {
                setRecipientId(parseInt(id, 10));
                stopScanner();
                showToast("Recipient ID scanned successfully", "success");
            }
        } else {
            showToast("Invalid QR code format. Please scan a valid ID.", "error");
        }
    };
    
    // Clean up on component unmount
    useEffect(() => {
        return () => {
            if (scannerIntervalRef.current) {
                clearInterval(scannerIntervalRef.current);
            }
            
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <>
            <div className='container bg-white shadow-md rounded-lg p-6 sm:w-2/3 md:w-1/3 lg-1/3 flex flex-col dark:text-white dark:bg-slate-600'>
                <h1 className='text-2xl font-bold text-[#002A5C] dark:text-white'>Create {type} Transaction</h1>
                {type === "transfer" && (
                    <p className='text-gray-500 mb-4 dark:text-gray-200'>
                        Transfer points to another user.
                    </p>
                )}

                {type === "redemption" && (
                    <p className='text-gray-500 mb-4 dark:text-gray-200'>
                        Redeem your points.
                    </p>
                )}

                <div className='flex flex-col'>
                    <div className='flex flex-row bg-gray-100 p-4 rounded-md mb-4 border justify-between w-full dark:bg-slate-500 dark:border-none'>
                        <p className='text-lg dark:text-white'>Available Points: </p>
                        <p className='text-lg font-semibold text-[#002A5C] dark:text-white'>{user.points}</p>
                    </div>

                    {type === "transfer" && (
                        <>
                            <label className='mb-2 '>
                                Recipient ID
                            </label>
                            <div className="flex items-center w-full mb-4 ">
                                <input 
                                    type="number" 
                                    id="userId" 
                                    value={recipientId || ""}
                                    onChange={(e) => setRecipientId(Number(e.target.value))}
                                    placeholder='Enter recipient ID'
                                    className='border border-gray-300 rounded p-2 w-full dark:bg-slate-500 dark:border-none' 
                                />
                                <button 
                                    onClick={startScanner} 
                                    disabled={scanning}
                                    className="ml-2 text-gray-500 dark:text-white hover:text-blue-500 dark:hover:text-blue-500"
                                >
                                    <ScanLine size={20} />
                                </button>
                            </div>
                        </>
                    )}

                    <label className='mb-2'>
                        Amount
                    </label>
                    <input
                        type="number"
                        id="amount"
                        value={amount || ""}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder='Enter amount'
                        className='border border-gray-300 rounded p-2 mb-4 w-full dark:bg-slate-500 dark:border-none dark:text-white' 
                    />

                    <label className='mb-2'>
                        Notes (Optional)
                    </label>

                    <textarea
                        id="remarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className='border border-gray-300 rounded p-2 mb-4 w-full dark:bg-slate-500 dark:border-none dark:text-white'
                        rows={1}
                        placeholder='Add any notes here'
                    />
                    
                    <button
                        className='bg-blue-500 hover:bg-blue-700 text-white rounded p-2 w-full dark:bg-blue-500 dark:hover:bg-blue-600'
                        onClick={handleSubmit}
                    >
                        {type === "transfer" && <p>Transfer Points</p>}
                        {type === "redemption" && <p>Redeem Points</p>}
                    </button>
                </div>
            </div>

            {/* QR Code Modal for Redemption */}
            {showQRModal && redemptionData && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Redemption QR Code</h3>
                            <button 
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex flex-col items-center">
                            <img 
                                src={generateQRCodeUrl(redemptionData.id)} 
                                alt="QR Code for Redemption" 
                                className="mb-4 border border-gray-200 rounded"
                            />
                            <div className="text-center mb-4">
                                <p className="font-bold">Redemption ID: {redemptionData.id}</p>
                                <p>Amount: {redemptionData.amount} points</p>
                                {redemptionData.utorid && <p>User: {redemptionData.utorid}</p>}
                            </div>
                            <button 
                                onClick={closeModal}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Scanner Modal */}
            {showScanModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75">
                    <div className="bg-white rounded-lg overflow-hidden w-full max-w-md">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-bold">Scan Recipient QR Code</h3>
                            <button onClick={stopScanner} className="text-gray-500 hover:text-gray-700">
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

            {/* Toast Notification */}
            <Toast 
                message={toast.message} 
                type={toast.type} 
                visible={toast.visible} 
                onClose={hideToast} 
            />
        </>
    );
};

export default CreateCard;