import { QRCodeSVG } from "qrcode.react";
import { FaLongArrowAltLeft } from "react-icons/fa";


const RedemptionCodeModal = (props : {redemption: any, isOpen: boolean, onClose: Function}) => {
    
    const { redemption, isOpen, onClose } = props;

    return ( isOpen ?
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex justify-center items-center">
            <div className="relative flex flex-col bg-white shadow-md rounded-lg p-4 max-w-2xl ">

                {/* Modal Header */}
                <div className="absolte top-2 left-2 flex flex-row text-blue-500 hover:text-blue-700 gap-1"
                onClick={() => onClose()}>
        
                    <FaLongArrowAltLeft className="mt-1"/>
                    <button> Back </button>
                </div>

                {/* Main Modal Content*/}
                <div className="flex flex-col justify-center items-center pt-2 gap-2">
                    <p className="font-normal text-[#002A5C]"> Your QR Code </p>
                    <p className='text-gray-500 text-sm'> Show this to complete your redemption </p>
                    
                    <QRCodeSVG value={"TODO"} />

                    <p className='font-normal text-[#002A5C] text-sm'> Notes: {redemption.remark} </p>
                    <p className='text-gray-500 text-sm'> Redemption Cost: {redemption.amount} </p>
                    
                    {redemption.operatorId !== null && (
                        <p className='text-gray-500 text-sm'>Redemption Completed </p>
                    )}
                    {redemption.operatorId === null && (
                        <p className='text-gray-500 text-sm'>Redemption Pending </p>
                    )}


                </div>
            </div>
        </div>
    : "");
}

export default RedemptionCodeModal;