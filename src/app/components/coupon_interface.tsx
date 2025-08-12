export interface Coupon {
  _id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  expiryDate: string;
  usageLimit: number | null;
  usedCount?: number; // có thể có hoặc không
  isActive: boolean;
}