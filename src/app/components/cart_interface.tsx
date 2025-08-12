import { Product } from "./product_interface";

export interface CartItem {
  optionId: string; 
  product: Product;
  option: {
    stock: number;
    _id: string;
    value: string;
    price: number;
    discount_price?: number;
  };
  quantity: number;
}

export interface Cart {
  _id: string;
  items: CartItem[];
}
