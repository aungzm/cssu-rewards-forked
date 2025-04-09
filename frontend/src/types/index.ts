export interface UserData {
  id: number;
  utorid: string;
  name: string;
  email: string;
  birthday: string;
  role: "REGULAR" | "CASHIER" | "MANAGER" | "SUPERUSER";
  points: number;
  createdAt: string;
  lastLogin: string;
  verified: boolean;
  avatarUrl?: string; // optional, nice!
}

export interface UserContextType {
  userData: UserData | null;
  isLoading: boolean;
  error: string | null;
  signout: () => void;
  refetchUser: () => Promise<void>;
}
