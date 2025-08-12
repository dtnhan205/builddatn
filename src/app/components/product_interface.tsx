

// Product interfaces
export interface Product {
  products: string;
  _id: string;
  name: string;
  slug: string;
  status: string;
  view: number;
  id_brand: string;
  id_category: string;
  images: string[];
  short_description: string;
  description: string;
  option: {
    stock: number;
    value: string;
    price: number;
    discount_price?: number;
    _id: string;
  }[];
  createdAt: string;
  updatedAt: string;
  // Thêm các trường dưới đây để không bị báo đỏ
  stock?: number;
  price?: number;
  brandName?: string;
}
