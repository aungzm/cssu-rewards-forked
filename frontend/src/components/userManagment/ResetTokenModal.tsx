import React from "react";
import { X } from "lucide-react";
import { CreateUserResponse } from "../../types";

interface ResetTokenModalProps {
    isOpen: boolean;
    onClose: () => void;
    userData: Partial<CreateUserResponse>;
}

const ResetTokenModal: React.FC<ResetTokenModalProps> = ({
    isOpen,
    onClose,
    userData,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-10 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black opacity-50"
                onClick={onClose}
            ></div>
            {/* Modal Content */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        User Reset Token Information
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                        <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">User ID:</p>
                        <p className="font-medium dark:text-white">{userData.id}</p>
                    </div>

                    <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">UTORid:</p>
                        <p className="font-medium dark:text-white">{userData.utorid}</p>
                    </div>

                    <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Name:</p>
                        <p className="font-medium dark:text-white">{userData.name}</p>
                    </div>

                    <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Email:</p>
                        <p className="font-medium dark:text-white">{userData.email}</p>
                    </div>

                    <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Verification Status:
                        </p>
                        <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                userData.verified
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            }`}
                        >
                            {userData.verified ? "Verified" : "Not Verified"}
                        </span>
                    </div>

                    <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Token Expiration:
                        </p>
                        <p className="font-medium dark:text-white">
                            {userData.expiresAt
                                ? new Date(userData.expiresAt).toLocaleString()
                                : "N/A"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Reset Token:
                        </p>
                        <code className="block p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono overflow-x-auto">
                            {userData.resetToken}
                        </code>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetTokenModal;
