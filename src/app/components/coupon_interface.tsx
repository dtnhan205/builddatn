export interface User {
  _id: string;
  username: string;
  email: string;
  role?: string; // Optional nếu cần
}

export interface Coupon {
  description: string;
  _id: string;
  code: string;
  discountType: "percentage" | "fixed"; // Ràng buộc cụ thể thay vì string
  discountValue: number;
  minOrderValue: number;
  expiryDate: string | null; // Cho phép null để khớp với FormData
  usageLimit: number | null;
  usedCount?: number;
  isActive: boolean;
  userId?: User | null; // Sửa từ any thành User | null
  orderId?: string | null; // Nếu cần, sửa từ any thành type cụ thể
  isBirthdayCoupon?: boolean | null; // Nếu cần, sửa từ any thành type cụ thể
}