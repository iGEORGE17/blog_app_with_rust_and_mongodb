// types/auth.ts
export interface User {
  id: string;
  username: string;
  email: string;
  access_token?: string; // The JWT from your Rust/Go backend
  avatarUrl?: string;
}

export type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password?: string) => Promise<void>;
  logout: () => void;
};