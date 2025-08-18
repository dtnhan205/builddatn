"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import Link from "next/link";
import { Category } from "../../components/category_interface";
import { Brand } from "../../components/Brand_interface";
import { Product } from "../../components/product_interface";
import ToastNotification from "../ToastNotification/ToastNotification";
import ScrollInView from "../../components/ScrollInView";
import "../payment-done/paydone.css";


const API_BASE_URL: string = "https://api-zeal.onrender.com";
const ERROR_IMAGE_URL: string = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";

const formatPrice = (price: string | number): string =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(price) || 0);

const getImageUrl = (image: string): string => {
  if (!image || typeof image !== "string" || image.trim() === "") {
    console.warn("Invalid image URL detected, using fallback:", ERROR_IMAGE_URL);
    return ERROR_IMAGE_URL;
  }
  try {
    new URL(image);
    return image;
  } catch (e) {
    console.warn("Invalid URL format for image:", image, "using fallback:", ERROR_IMAGE_URL);
    return ERROR_IMAGE_URL;
  }
};

const getProductPrice = (product: Product): number => {
  if (product.option && product.option.length > 0) {
    return product.option[0].discount_price || product.option[0].price;
  }
  return 0;
};

const getProductStock = (product: Product): number => {
  if (product.option && product.option.length > 0) {
    return product.option.reduce((total, opt) => total + opt.stock, 0);
  }
  return 0;
};

const getTopStockProducts = (products: Product[], count: number): Product[] => {
  const validProducts = products.filter(
    product =>
      product.stock !== undefined &&
      product.stock !== null &&
      !isNaN(product.stock) &&
      product.stock > 0
  );
  return validProducts.sort((a, b) => (b.stock || 0) - (a.stock || 0)).slice(0, count);
};

const SuccessPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [bestSellingProducts, setBestSellingProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheBuster, setCacheBuster] = useState<string>("");

  const orderId = searchParams.get("orderId") || "#DH123456";
  const date = searchParams.get("date") || "14/08/2025";
  const total = searchParams.get("total") || "1250000";
  const paymentMethod = searchParams.get("paymentMethod") || "cod";

  useEffect(() => {
    setCacheBuster(`t=${Date.now()}`);
  }, []);

  useEffect(() => {
    const createConfetti = () => {
      const colors = ["#4CAF50", "#2196F3", "#FFC107", "#FF5722", "#9C27B0", "#E91E63"];
      const container = document.querySelector(".confetti-container");
      if (container) {
        for (let i = 0; i < 25; i++) {
          const confetti = document.createElement("div");
          confetti.classList.add("confetti");
          const size = Math.random() * 10 + 5;
          const color = colors[Math.floor(Math.random() * colors.length)];
          const left = Math.random() * 100;
          const duration = Math.random() * 3 + 2;
          const delay = Math.random() * 5;

          confetti.style.width = `${size}px`;
          confetti.style.height = `${size}px`;
          confetti.style.backgroundColor = color;
          confetti.style.left = `${left}%`;
          confetti.style.animationDuration = `${duration}s`;
          confetti.style.animationDelay = `${delay}s`;

          if (Math.random() > 0.5) confetti.style.borderRadius = "50%";

          container.appendChild(confetti);
        }
      }
    };

    setTimeout(createConfetti, 500);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsProductsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/products/active`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Lỗi tải sản phẩm: ${response.status}`);
        }
        const data: Product[] = await response.json();
        const processedProducts = data.map(product => {
          const validImages = (product.images || []).filter(img => typeof img === "string" && img.trim() !== "").map(img => getImageUrl(img));
          return {
            ...product,
            price: getProductPrice(product),
            stock: getProductStock(product),
            images: validImages.length > 0 ? validImages : [ERROR_IMAGE_URL],
          };
        });
        setProducts(processedProducts);
        setBestSellingProducts(getTopStockProducts(processedProducts, 5));
      } catch (error) {
        console.error("Lỗi khi tải sản phẩm:", error);
        setError("Không thể tải sản phẩm. Vui lòng thử lại sau.");
      } finally {
        setIsProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const paymentMethodText = paymentMethod === "cod"
    ? "Thanh toán khi nhận hàng"
    : "Chuyển khoản ngân hàng";

  const handleContinue = () => {
    setIsLoading(true);
    setTimeout(() => {
      router.push("/user");
    }, 1500);
  };

  return (
    <div className="success-container">
      <div className="success-card">
        <div className="success-icon">
          <div className="circle">
            <div className="checkmark"></div>
          </div>
        </div>
        <h1>Thanh Toán Thành Công!</h1>
        <p className="message">Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đã được xử lý thành công.</p>
        <div className="order-details">
          <div className="detail"><span className="label">Mã đơn hàng:</span><span className="value">{orderId}</span></div>
          <div className="detail"><span className="label">Ngày:</span><span className="value">{date}</span></div>
          <div className="detail"><span className="label">Tổng tiền:</span><span className="value">{formatPrice(total)}</span></div>
          <div className="detail"><span className="label">Phương thức:</span><span className="value">{paymentMethodText}</span></div>
        </div>
        <button
          className="continue-btn"
          id="continue-btn"
          onClick={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin /> Đang chuyển hướng...
            </>
          ) : (
            "Tiếp Tục Mua Sắm"
          )}
        </button>
        <div className="confetti-container"></div>
      </div>

      <ScrollInView>
        <div className="best-selling-products">
          <h3 className="slider-title">Có thể bạn sẽ thích</h3>
          <div className="best-selling-grid">
            {isProductsLoading ? (
              <p className="no-products">Đang tải sản phẩm...</p>
            ) : error ? (
              <p className="no-products">{error}</p>
            ) : bestSellingProducts.length > 0 ? (
              bestSellingProducts.map(product => (
                <Link
                  href={`/user/detail/${product.slug}`}
                  key={product._id}
                  className="best-selling-link"
                >
                  <div className="best-selling-card">
                    <div className="best-selling-badge">Sale</div>
                    <div className="best-selling-image">
                      <Image
                        src={
                          product.images?.[0]
                            ? `${getImageUrl(product.images[0])}?${cacheBuster}`
                            : ERROR_IMAGE_URL
                        }
                        alt={product?.name || "Sản phẩm"}
                        width={200}
                        height={200}
                        quality={100}
                        className="best-selling-product-image"
                        onError={(e) => {
                          console.log(`Best Selling ${product.name} image load failed, switched to 404 fallback`);
                          (e.target as HTMLImageElement).src = ERROR_IMAGE_URL;
                        }}
                      />
                    </div>
                    <div className="best-selling-details">
                      <h3 className="best-selling-product-name">
                        {product?.name || "Tên sản phẩm"}
                      </h3>
                      <p className="best-selling-price">{formatPrice(product?.price ?? 0)}</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="no-products">Không có sản phẩm nào.</p>
            )}
          </div>
        </div>
      </ScrollInView>
    </div>
  );
};

export default SuccessPage;