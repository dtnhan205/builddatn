"use client"; // Chạy phía client để dùng localStorage và fetch API

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import styles from "./wishlist.module.css";
import { useRouter } from "next/navigation";
import ToastNotification from "../ToastNotification/ToastNotification";

// Interface sản phẩm yêu thích, dựa trên API documentation
interface Product {
  _id: string;
  name: string;
  images: string[];
  id_category: { status: string };
  slug: string;
  short_description: string;
  status?: string;
  active?: boolean;
  isActive?: boolean;
  price?: number;
  option?: { discount_price?: number; price?: number; stock?: number }[];
}

// Hook toast message
const useToast = () => {
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const TOAST_DURATION = 3000;

  const showToast = useCallback((type: "success" | "error" | "warning", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), TOAST_DURATION);
  }, []);

  return { message, showToast, hideToast: () => setMessage(null) };
};

// Hàm trả về URL hình ảnh đầy đủ, sử dụng ảnh lỗi nếu không hợp lệ
const getImageUrl = (filename?: string): string => {
  if (!filename || typeof filename !== "string" || filename.trim() === "") {
    console.warn("Invalid image URL detected, using fallback:", "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg");
    return "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
  }
  try {
    new URL(filename);
    return filename;
  } catch (e) {
    console.warn("Invalid URL format for image:", filename, "using fallback:", "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg");
    return "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
  }
};

// Hàm giới hạn số từ của mô tả ngắn
const truncateDescription = (description: string, wordLimit: number = 20) => {
  const words = description.split(" ");
  if (words.length > wordLimit) {
    return words.slice(0, wordLimit).join(" ") + "...";
  }
  return description;
};

// Trang danh sách yêu thích của người dùng
export default function WishlistPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { message, showToast, hideToast } = useToast();

  // Lấy token từ localStorage
  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  // Hàm chuyển hướng đến trang chi tiết
  const navigateToDetail = (slug: string) => {
    router.push(`/user/detail/${slug}`);
  };

  // Fetch danh sách sản phẩm active từ /api/products/active
  useEffect(() => {
    const fetchActiveProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch("https://api-zeal.onrender.com/api/products/active", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Lỗi tải sản phẩm: ${response.status}`);
        }
        const data: Product[] = await response.json();
        console.log("Dữ liệu active products:", data); // Debug dữ liệu từ API
        setProducts(data);
      } catch (err) {
        console.error("Lỗi khi tải sản phẩm active:", err);
        showToast("error", "Không thể tải danh sách sản phẩm.");
      } finally {
        setLoading(false);
      }
    };

    fetchActiveProducts();
  }, []);

  // Fetch danh sách yêu thích từ /api/users/favorite-products
  useEffect(() => {
    const fetchFavoriteProducts = async () => {
      const token = getToken();
      if (!token) {
        setFavoriteProducts([]);
        localStorage.removeItem("favoriteProducts");
        return;
      }
      try {
        const response = await fetch("https://api-zeal.onrender.com/api/users/favorite-products", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
            setFavoriteProducts([]);
            showToast("error", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
            return;
          } else if (response.status === 400) {
            setFavoriteProducts([]);
            showToast("error", "User ID không hợp lệ!");
            return;
          } else if (response.status === 404) {
            setFavoriteProducts([]);
            showToast("error", "Không tìm thấy người dùng!");
            return;
          } else if (response.status === 500) {
            setFavoriteProducts([]);
            showToast("error", "Lỗi server. Vui lòng thử lại sau!");
            return;
          }
          throw new Error(`Lỗi tải danh sách yêu thích: ${response.status}`);
        }
        const data = await response.json();
        const newFavorites: string[] = data.favoriteProducts.map((item: any) => item._id);
        setFavoriteProducts(newFavorites);
        localStorage.setItem("favoriteProducts", JSON.stringify(newFavorites));
      } catch (err) {
        console.error("Lỗi khi lấy danh sách yêu thích:", err);
        const savedFavorites = localStorage.getItem("favoriteProducts");
        if (savedFavorites) {
          setFavoriteProducts(JSON.parse(savedFavorites));
        } else {
          setFavoriteProducts([]);
        }
      }
    };

    fetchFavoriteProducts();
  }, []);

  // Xóa sản phẩm khỏi danh sách yêu thích
  const removeFromWishlist = async (productId: string) => {
    const token = getToken();
    if (!token) {
      showToast("error", "Vui lòng đăng nhập để xóa sản phẩm!");
      setTimeout(() => {
        router.push("/user/login");
      }, 3000);
      return;
    }

    try {
      await axios.delete(
        `https://api-zeal.onrender.com/api/users/favorite-products/${productId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setFavoriteProducts((prev) => prev.filter((id) => id !== productId));
      showToast("success", "Đã xóa sản phẩm khỏi danh sách yêu thích!");
    } catch (err) {
      showToast("error", "Không thể xóa sản phẩm khỏi danh sách yêu thích!");
      console.error("Lỗi xóa sản phẩm:", err);
    }
  };

  // UI hiển thị
  if (loading) return <div className="text-center py-10">Đang tải...</div>;

  const wishlistProducts = products.filter((product) =>
    favoriteProducts.includes(product._id)
  );

  return (
    <div className={styles.container}>
      <h1 className={styles["wishlist-title"]}>Danh sách yêu thích</h1>

      {wishlistProducts.length === 0 ? (
        <p className="text-center py-10">Bạn chưa thêm sản phẩm nào vào danh sách yêu thích.</p>
      ) : (
        <ul className={styles.productList}>
          {wishlistProducts.map((product) => (
            <li key={product._id} className={styles.productItem}>
              <button onClick={() => navigateToDetail(product.slug)} className={styles.productImageButton}>
                <img
                  src={getImageUrl(product.images[0])}
                  alt={product.name}
                  className={styles.productImage}
                  onError={(e) => {
                    console.log(`Image load failed for ${product.name}, switched to 404 fallback`);
                    (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                  }}
                />
              </button>
              <div className={styles.productDetails}>
                <button onClick={() => navigateToDetail(product.slug)} className={styles.productNameButton}>
                  <h2>{product.name}</h2>
                </button>
                <p className={styles.productDescription}>
                  {truncateDescription(product.short_description || "Không có mô tả", 20)}
                </p>
                <div className={styles.buttonGroup}>
                  <button onClick={() => navigateToDetail(product.slug)} className={styles.detailButton}>
                    Xem chi tiết
                  </button>
                  <button
                    onClick={() => removeFromWishlist(product._id)}
                    className={styles.removeButton}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {message && (
        <ToastNotification
          message={message.text}
          type={message.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}