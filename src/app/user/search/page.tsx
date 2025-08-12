"use client";
import styles from "./search.module.css"; // Import CSS Module
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Product } from "@/app/components/product_interface";

const formatPrice = (price: number | undefined | null): string => {
  if (typeof price !== "number" || isNaN(price)) return "0đ";
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
};
const getImageUrl = (image: string): string => {
  if (!image) return "/images/placeholder.png";
  return `https://api-zeal.onrender.com/images/${image}`;
};

export default function SearchPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Fetch all products
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("https://api-zeal.onrender.com/api/products");
        if (!response.ok) {
          throw new Error(`Lỗi tải sản phẩm: ${response.status}`);
        }
        const data: Product[] = await response.json();
        setProducts(data);
        setFilteredProducts(data); // Hiển thị tất cả sản phẩm ban đầu
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Không thể tải sản phẩm. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Lọc sản phẩm dựa trên từ khóa tìm kiếm
  useEffect(() => {
    const keyword = searchParams.get("query") || ""; // Lấy từ khóa từ URL
    if (!keyword) {
      setFilteredProducts(products); // Nếu không có từ khóa, hiển thị tất cả sản phẩm
      return;
    }

    const lowerCaseKeyword = keyword.toLowerCase();
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(lowerCaseKeyword) ||
        product.description?.toLowerCase().includes(lowerCaseKeyword)
    );
    setFilteredProducts(filtered);
  }, [searchParams, products]);

  return (
    <div>
      <section className={styles.searchBanner}>
        <img src="/images/productBanner.png" alt="Banner" className={styles["banner-image"]} />
      </section>
      <h1 className={styles["search-main-title"]}>Kết quả tìm kiếm</h1>
      <div className={styles.searchContainerBox}>
        <section className={styles.searchContainer}>
          {error ? (
            <p className={styles["no-products"]}>{error}</p>
          ) : isLoading ? (
            <p className={styles["no-products"]}>Đang tải sản phẩm...</p>
          ) : filteredProducts.length > 0 ? (
            <div className={styles.searchGrid}>
              {filteredProducts.map((product) => (
                <Link
                  href={`/user/detail/${product._id}`}
                  key={product._id}
                  className={`${styles.searchItem} ${styles["search-link"]}`}
                >
                  <div>
                    <Image
                      src={
                        product.images && product.images.length > 0
                          ? `https://api-zeal.onrender.com/images/${product.images[0]}`
                          : "https://via.placeholder.com/300x200?text=No+Image"
                      }
                      alt={product.name}
                      width={300}
                      height={200}
                      className={styles["search-image"]}
                    />
                    <div>
                      <h4 className={styles["search-item-name"]}>{product.name}</h4>
                      <div className={styles["search-card"]}>
                        <p className={styles.searchPrice}>{formatPrice(product.price)}</p>
                        <span title="Thêm vào Giỏ Hàng" className={styles.cartIcon}>
                          <i className="fas fa-shopping-cart"></i>
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className={styles["no-products"]}>Không tìm thấy sản phẩm nào phù hợp.</p>
          )}
        </section>
      </div>
    </div>
  );
}