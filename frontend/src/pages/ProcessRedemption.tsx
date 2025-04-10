import React, { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "../utils/auth";
import { fetchWithAuth } from "../utils/authHelper";
import Navbar from "../components/Navbar";
import { ScanLine, X, CheckCircle } from "lucide-react";
import jsQR from "jsqr";

const ProcessRedemption: React.FC = () => {
  const [redemptionId, setRedemptionId] = useState<string>("");
  const [showScanModal, setShowScanModal] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerIntervalRef = useRef<number | null>(null);

  const handleSubmit = async () => {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/transactions/${redemptionId}/processed`,
        {
          method: "PATCH",
          body: JSON.stringify({
            processed: true,
          }),
        }
      );
      if (!response.ok) {
        alert("Redemption request not found");
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      console.log(data);
      setSuccess(true);
      // Clear the input so that the user can type a new one.
      setRedemptionId("");
    } catch (error) {
      console.error("Error processing redemption:", error);
    }
  };

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

        // Start scanning for QR codes
        scannerIntervalRef.current = window.setInterval(() => {
          scanQRCode();
        }, 100); // Scan every 100ms for better responsiveness
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert(
        "Could not access camera. Please make sure camera permissions are granted."
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

    // Check if the result starts with REDEMPTION: prefix
    if (result.startsWith("REDEMPTION:")) {
      const id = result.replace("REDEMPTION:", "");

      // Check if the ID is a valid integer
      if (/^\d+$/.test(id)) {
        setRedemptionId(id);
        stopScanner();
      }
    } else if (/^\d+$/.test(result)) {
      // If it's just a number with no prefix, also accept it
      setRedemptionId(result);
      stopScanner();
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
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

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
            <p className="text-gray-500">
              Verify and Complete Redemption Request
            </p>
          </div>
          {/* Main Content */}
          <div className="w-full bg-white border border-gray-300 shadow-md p-4">
            <h2
              className="text-xl font-bold mb-6"
              style={{ color: "#002A5C" }}
            >
              Redemption ID
            </h2>
            <label className="text-md font-bold mb-2 block">
              Redemption ID
            </label>
            <div className="flex  flex-row">
            <div className="flex items-center w-full max-w-md border border-gray-300 rounded-lg p-2 mb-4">
              <input
                type="text"
                value={redemptionId}
                onChange={(e) => {
                  setRedemptionId(e.target.value);
                  if (success) setSuccess(false);
                }}
                placeholder="Enter Redemption ID"
                className="outline-none flex-1"
              />
              <button onClick={startScanner} className="text-gray-400" disabled={scanning}>
                <ScanLine className="cursor-pointer hover:text-blue-500" />
              </button>
              {/* Show the CheckCircle (success) icon when processed */}
            
            </div>
            { success && (<div className="mt-2 ml-4">
              <div className="flex items-center justify-center mb-4">
                <CheckCircle size={24} className="text-green-500" />
                <span className="ml-2 font-medium text-green-500">
                  Redemption Processed Successfully
                </span>
              </div>
              </div>
            )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Enter the Redemption ID from the QR Code to process the redemption
              request.
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

      {/* QR Scanner Modal */}
      {showScanModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75">
          <div className="bg-white rounded-lg overflow-hidden w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">Scan QR Code</h3>
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
                  Detected:{" "}
                  <span className="text-blue-600">{scanResult}</span>
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
    </>
  );
};

export default ProcessRedemption;
