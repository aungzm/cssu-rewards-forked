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

export interface CreateUserResponse {
    id: number;
    utorid: string;
    name: string;
    email: string;
    verified: boolean;
    expiresAt: string;
    resetToken: string; 
}

export interface UserContextType {
  userData: UserData | null;
  isLoading: boolean;
  error: string | null;
  signout: () => void;
  refetchUser: () => Promise<void>;
}

export interface Promotion {
  id: number;
  name: string;
  description: string;
  type: "automatic" | "one-time";
  rate: number;
  points: number;
  endTime: string;
  minSpending?: number | null;
  startTime: string;
}

export interface EventDetails {
    id: number;
    name: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
    capacity: number | null; // null means unlimited capacity
    pointsRemain?: number | null;
    pointsAwarded?: number;
    published?: boolean;
    organizers: Organizer[];
    guests?: Guest[];
    isGuest: boolean;
}

export interface Organizer {
    id: number;
    utorid: string;
    name: string;
}

export interface Guest {

    id: number;
    utorid: string;
    name: string;
}