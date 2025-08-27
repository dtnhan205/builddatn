"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Product } from "./product_interface";

// Biến môi trường
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api-zeal.onrender.com";
const ERROR_IMAGE_URL = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
const TIMEOUT_DURATION = 10000;

// Hàm tiện ích: Lấy URL hình ảnh (tái sử dụng từ DetailPage)
const getImageUrl = (image: string): string => {
  if (!image || typeof image !== "string" || image.trim() === "") {
    console.warn("Invalid image URL detected, using fallback:", ERROR_IMAGE_URL);
    return ERROR_IMAGE_URL;
  }
  try {
    new URL(image); // Kiểm tra xem image đã là URL đầy đủ chưa
    return image;
  } catch (e) {
    // Nếu không phải URL đầy đủ, ghép với API_BASE_URL
    const cleanImage = image.startsWith("/") ? image.substring(1) : image;
    const fullUrl = `${API_BASE_URL}/${cleanImage}`;
    console.log("Constructed image URL:", fullUrl);
    return fullUrl;
  }
};

// Hàm API: Gửi yêu cầu đến API với xử lý timeout (tái sử dụng từ DetailPage)
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

  try {
    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Lỗi HTTP: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yêu cầu bị timeout");
    }
    throw error;
  }
};

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cacheBuster, setCacheBuster] = useState("");
  const router = useRouter();

  // Tạo cacheBuster sau khi hydration
  useEffect(() => {
    setCacheBuster(`t=${Date.now()}`);
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      try {
        const data = await apiRequest("/api/products/active");
        if (Array.isArray(data)) {
          // Validate and filter products to match Product interface
          const validProducts = data.filter(
            (product): product is Product =>
              product &&
              typeof product.name === "string" &&
              Array.isArray(product.images) &&
              Array.isArray(product.option)
          );
          setAllProducts(validProducts);
          console.log("Fetched products:", validProducts);
        } else if (Array.isArray(data.products)) {
          const validProducts = data.products.filter(
            (product: { name: any; images: any; option: any; }): product is Product =>
              product &&
              typeof product.name === "string" &&
              Array.isArray(product.images) &&
              Array.isArray(product.option)
          );
          setAllProducts(validProducts);
          console.log("Fetched products from data.products:", validProducts);
        } else {
          setAllProducts([]);
          console.error("Unexpected API response format:", data);
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setAllProducts([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    console.log("allProducts:", allProducts);
    if (!query) {
      setSuggestions([]);
      return;
    }
    const filtered = allProducts.filter((product) => {
      if (!product.name || typeof product.name !== "string") {
        console.warn("Invalid product name:", product);
        return false;
      }
      return product.name.toLowerCase().includes(query.toLowerCase());
    });
    console.log("suggestions:", filtered);
    setSuggestions(filtered);
  }, [query, allProducts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) {
      router.push(`/user/product?query=${encodeURIComponent(query)}`);
    }
  };

  const handleSelect = (productId: string) => {
    setShowSuggestions(false);
    setQuery("");
    router.push(`/user/detail/${productId}`);
  };

  return (
    <div style={{ position: "relative" }}>
      <form className="formtimkiem" onSubmit={handleSubmit} autoComplete="off">
        <input
          type="text"
          name="query"
          placeholder="Tìm kiếm sản phẩm..."
          className="search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        />
        <button type="submit" className="search-button">
          <i className="fa-solid fa-magnifying-glass"></i>
        </button>
      </form>
      {isLoading ? (
        <div style={{ padding: "12px 16px", color: "#888", textAlign: "center" }}>
          Đang tải sản phẩm...
        </div>
      ) : showSuggestions && suggestions.length > 0 ? (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e0e0e0",
            zIndex: 9999,
            maxHeight: 320,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            borderRadius: 8,
            marginTop: 4,
            padding: "4px 0",
            minWidth: 320,
          }}
        >
          {suggestions.map((item) => {
            console.log("SearchBar product image:", item.images);
            return (
              <div
                key={item.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f5f5f5",
                  transition: "background 0.2s",
                }}
                onMouseDown={() => handleSelect(item.slug)}
                onMouseOver={(e) => (e.currentTarget.style.background = "#f6f8fa")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Image
                  src={
                    item.images && item.images.length > 0 && typeof item.images[0] === "string"
                      ? `${getImageUrl(item.images[0])}?${cacheBuster}`
                      : ERROR_IMAGE_URL
                  }
                  onError={(e) => {
                    console.error(`Image for ${item.name || "product"} failed to load, switching to fallback`);
                    e.currentTarget.src = ERROR_IMAGE_URL;
                  }}
                  alt={item.name || "Sản phẩm"}
                  width={44}
                  height={44}
                  quality={100}
                  style={{ objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }}
                />
                <div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#222" }}>
                    {item.name || "Unknown Product"}
                  </span>
                  <br />
                  <span style={{ fontSize: 14, color: "#c00", fontWeight: 500 }}>
                    {item.option && item.option.length > 0
                      ? item.option[0].discount_price
                        ? item.option[0].discount_price.toLocaleString("vi-VN") + "₫"
                        : item.option[0].price.toLocaleString("vi-VN") + "₫"
                      : "N/A"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        query && (
          <div style={{ padding: "12px 16px", color: "#888", textAlign: "center" }}>
            Không tìm thấy sản phẩm
          </div>
        )
      )}
    </div>
  );
}