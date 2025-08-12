export interface Category {
  productCount: number;
  _id: string;
  name: string;
  status: "show" | "hidden";
  createdAt: string;
  __v?: number;
}