export interface User {
  _id: string;
  username: string;
  email: string;
  phone: string;
  address: {
    addressLine: string;
    ward: string;
    district: string;
    cityOrProvince: string;
  };
  status: string;
  listOrder: any[];
  birthday: string | null;
  googleId?: string;
  role?: string;
}

export interface Option {
  code: number;
  name: string;
}