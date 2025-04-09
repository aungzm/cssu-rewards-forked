import React, { useState, useEffect } from 'react';
import type { UserData } from '../../types';
import { fetchWithAuth } from '../../utils/authHelper';
import { API_BASE_URL } from '../../utils/auth';
import { User as UserIcon, X, Loader2 } from 'lucide-react';

interface DetailedUserData extends UserData {
  suspicious?: boolean;
  promotions?: Array<{
    id: number;
    name: string;
    minSpending?: number | null;
    rate?: number | null;
    points?: number | null;
  }>;
}

interface ViewUserInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData;
}

const ViewUserModal: React.FC<ViewUserInfoModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [detailedUser, setDetailedUser] = useState<DetailedUserData | null>(
    user as DetailedUserData,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (isOpen && user?.id) {
      const fetchUserDetails = async () => {
        setIsLoading(true);
        setError(null);
        setDetailedUser(null); 
        try {
          const response = await fetchWithAuth(
            `${API_BASE_URL}/users/${user.id}`,
          );
          if (!response.ok) {
            throw new Error(
              `Failed to fetch user details: ${response.status}`,
            );
          }
          const data: DetailedUserData = await response.json();
          console.log('Fetched user details:', data);
          setDetailedUser(data);
        } catch (err) {
          console.error('Error fetching user details:', err);
          setError(
            err instanceof Error ? err.message : 'Failed to load details',
          );
        } finally {
          setIsLoading(false);
        }
      };

      fetchUserDetails();
    } else {
      setDetailedUser(null);
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen, user?.id]); // Rerun when modal opens or user changes

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">User Info</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        {isLoading && (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        )}

        {error && (
          <div className="min-h-[200px] rounded border border-red-200 bg-red-50 p-4 text-center text-red-700">
            <p>Error loading details:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!isLoading && !error && detailedUser && (
          <div>
            {/* Header */}
            <div className="mb-6 flex items-center">
              <div className="mr-4 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                {detailedUser.avatarUrl ? (
                  <img
                    className="h-16 w-16 rounded-full"
                    src={detailedUser.avatarUrl}
                    alt={detailedUser.name}
                  />
                ) : (
                  <UserIcon size={40} />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Id: {detailedUser.id}</p>
                <p className="text-lg font-medium text-gray-900">
                  UtorId: {detailedUser.utorid}
                </p>
              </div>
            </div>

            {/* Basic Info Section */}
            <div className="mb-6">
              <h3 className="mb-3 border-b pb-2 text-base font-semibold text-gray-700">
                Basic Info
              </h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-gray-600">Points:</span>{' '}
                  {detailedUser.points}
                </p>
                <p>
                  <span className="font-medium text-gray-600">Verified:</span>{' '}
                  {detailedUser.verified ? 'True' : 'False'}
                </p>
                {/* Conditionally display fields based on availability (depends on fetching user's role) */}
                {detailedUser.suspicious && (
                  <p>
                    <span className="font-medium text-gray-600">Suspicious:</span>{' '}
                    {detailedUser.suspicious ? 'True' : 'False'}
                  </p>
                )}
                {detailedUser.email && (
                  <p>
                    <span className="font-medium text-gray-600">Email:</span>{' '}
                    {detailedUser.email}
                  </p>
                )}
                {detailedUser.birthday && (
                  <p>
                    <span className="font-medium text-gray-600">
                      Birthday:
                    </span>{' '}
                    {new Date(detailedUser.birthday).toLocaleDateString()}
                  </p>
                )}
                {detailedUser.createdAt && (
                  <p>
                    <span className="font-medium text-gray-600">Joined:</span>{' '}
                    {new Date(detailedUser.createdAt).toLocaleString()}
                  </p>
                )}
                {detailedUser.lastLogin && (
                  <p>
                    <span className="font-medium text-gray-600">
                      Last Login:
                    </span>{' '}
                    {new Date(detailedUser.lastLogin).toLocaleString()}
                  </p>
                )}
                
              </div>
            </div>

            {/* Available Promotions Section */}
            {detailedUser.promotions !== undefined && ( // Check if promotions field exists
              <div>
                <div className="mb-3 border-b pb-2 text-base font-semibold text-gray-700 justify-between flex items-center">
                  <h3>Available Promotions</h3> 
                  <h4><a href="promotions" className="cursor-pointer hover:text-blue-700">View All</a></h4>
                </div>
                {detailedUser.promotions &&
                detailedUser.promotions.length > 0 ? (
                  <div className="space-y-2">
                    {detailedUser.promotions.map((promo) => (
                      <div
                        key={promo.id}
                        className="rounded border border-gray-200 p-3 text-sm"
                      >
                        <p className="font-medium text-gray-800">
                          {promo.name}
                        </p>
                        {/* Display details based on what's available */}
                        {promo.points && (
                          <p className="text-xs text-gray-600">
                            Points: {promo.points}
                          </p>
                        )}
                        {promo.rate && (
                          <p className="text-xs text-gray-600">
                            Rate: {promo.rate * 100}%
                          </p>
                        )}
                        {promo.minSpending && (
                          <p className="text-xs text-gray-600">
                            Min Spend: ${promo.minSpending.toFixed(2)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No available promotions found for this user.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewUserModal;
