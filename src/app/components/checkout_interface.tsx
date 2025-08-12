import { Cart } from "./cart_interface";

export interface FormData {
  fullName: string;
  addressLine: string;
  ward: string;
  district: string;
  cityOrProvince: string;
  sdt: string;
  note: string;
  paymentMethod: "bank" | "cod" | "vnpay" | "momo";
}

export interface UserInfo {
  username: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  cityOrProvince: string;
  addresses?: Array<{
    fullName: string;
    sdt: string;
    addressLine: string;
    ward: string;
    district: string;
    cityOrProvince: string;
  }>;
  temporaryAddress1?: {
    addressLine: string;
    ward: string;
    district: string;
    cityOrProvince: string;
  };
  temporaryAddress2?: {
    addressLine: string;
    ward: string;
    district: string;
    cityOrProvince: string;
  };
}

export interface CheckoutData {
  order: any;
  cart: Cart;
  couponCode?: string;
  subtotal: number;
  discount: number;
  total: number;
  userId: string;
}