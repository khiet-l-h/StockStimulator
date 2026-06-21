export interface User {
  id: string;
  email: string;
  is_active: boolean;
}

export interface MeResponse extends User {
  /** Decimal serialises as a string from the Python backend */
  cash_balance: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}
