"use client";
import styles from "./productsale.module.css";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Category } from "@/app/components/category_interface";
import { Brand } from "@/app/components/Brand_interface";
import { Product } from "@/app/components/product_interface";
import ToastNotification from "../ToastNotification/ToastNotification";
import ScrollInView from "../../components/ScrollInView";

const API_BASE_URL: string = "https://api-zeal.onrender.com";
const ERROR_IMAGE_URL: string = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";

const PRICE_RANGES: { label: string; value: string }[] = [
  { label: "100.000đ - 300.000đ", value: "100-300" },
  { label: "300.000đ - 500.000đ", value: "300-500" },
  { label: "500.000đ trở lên", value: "500+" },
];

const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null || isNaN(price)) {
    return "0đ";
  }
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
};

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

// Cập nhật hàm getProductPrice để lấy giá sale nếu có
const getProductPrice = (product: Product): { originalPrice: number; salePrice: number | null; hasDiscount: boolean } => {
  if (product.option && product.option.length > 0) {
    const option = product.option[0];
    const originalPrice = option.price;
    const discountPrice = option.discount_price;
    
    if (discountPrice && discountPrice < originalPrice) {
      return {
        originalPrice,
        salePrice: discountPrice,
        hasDiscount: true
      };
    }
    
    return {
      originalPrice,
      salePrice: null,
      hasDiscount: false
    };
  }
  return {
    originalPrice: 0,
    salePrice: null,
    hasDiscount: false
  };
};

// Hàm tính phần trăm giảm giá
const calculateDiscountPercentage = (originalPrice: number, salePrice: number): number => {
  if (originalPrice <= 0 || salePrice <= 0 || salePrice >= originalPrice) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
};

// Hàm kiểm tra sản phẩm có discount không
const hasProductDiscount = (product: Product): boolean => {
  if (!product.option || product.option.length === 0) return false;
  
  return product.option.some(option => 
    option.discount_price && 
    option.discount_price < option.price
  );
};

const getProductStock = (product: Product): number => {
  if (product.option && product.option.length > 0) {
    return product.option.reduce((total, opt) => total + opt.stock, 0);
  }
  return 0;
};

const isCategory = (id_category: Category | string | null | undefined): id_category is Category => {
  return id_category != null && typeof id_category === "object" && "_id" in id_category;
};

const useToast = () => {
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const TOAST_DURATION: number = 3000;

  const showToast = useCallback((type: "success" | "error" | "warning", text: string): void => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), TOAST_DURATION);
  }, []);

  const hideToast = useCallback((): void => setMessage(null), []);

  return { message, showToast, hideToast };
};

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteProducts, setFavoriteProducts] = useState<string[]>([]);
  const [cacheBuster, setCacheBuster] = useState<string>("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("");
  const [addingToCart, setAddingToCart] = useState<boolean>(false);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);

  const productsPerPage: number = 9;
  const searchParams = useSearchParams();
  const searchQuery: string = searchParams.get("query")?.toLowerCase() || "";
  const { message, showToast, hideToast } = useToast();

  const apiRequest = async (url: string, options: RequestInit) => {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  };

  const addToCart = useCallback(
    async (product: Product) => {
      if (!product || !product.option?.length) {
        showToast("error", "Sản phẩm không có tùy chọn hợp lệ!");
        return;
      }

      const selectedOption = product.option[0];
      const quantity = 1;
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("token");

      if (selectedOption.stock < quantity) {
        showToast("error", "Số lượng vượt quá tồn kho!");
        return;
      }

      if (!userId || !token) {
        showToast("warning", "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!");
        setTimeout(() => {
          window.location.href = "/user/login";
        }, 2000);
        return;
      }

      setAddingToCart(true);
      try {
        await apiRequest(`${API_BASE_URL}/api/carts/add`, {
          method: "POST",
          body: JSON.stringify({
            userId,
            productId: product._id,
            optionIds: [selectedOption._id || selectedOption.value],
            quantity,
          }),
        });
        showToast("success", "Đã thêm sản phẩm vào giỏ hàng!");
      } catch (error) {
        console.error("Lỗi khi thêm vào giỏ hàng:", error);
        showToast(
          "error",
          `Lỗi: ${error instanceof Error ? error.message : "Không thể thêm vào giỏ hàng"}`
        );
      } finally {
        setAddingToCart(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    setCacheBuster(`t=${Date.now()}`);
  }, []);

  useEffect(() => {
    const savedFavorites = localStorage.getItem("favoriteProducts");
    if (savedFavorites) {
      setFavoriteProducts(JSON.parse(savedFavorites));
    }
  }, []);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/brands`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Lỗi tải thương hiệu: ${res.status}`);
        const data: Brand[] = await res.json();
        setBrands(data);
      } catch (err) {
        console.error("Lỗi khi tải thương hiệu:", err);
        setBrands([]);
      }
    };
    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/products/active`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Lỗi tải sản phẩm: ${response.status}`);
        }
        const data: Product[] = await response.json();
        
        // Lọc chỉ những sản phẩm có discount_price
        const saleProducts = data.filter(product => hasProductDiscount(product));
        
        const processedProducts = saleProducts.map(product => {
          const validImages = (product.images || []).filter(img => typeof img === "string" && img.trim() !== "").map(img => getImageUrl(img));
          const priceInfo = getProductPrice(product);
          
          return {
            ...product,
            price: priceInfo.salePrice || priceInfo.originalPrice, // Hiển thị giá sale
            originalPrice: priceInfo.originalPrice, // Giữ giá gốc
            salePrice: priceInfo.salePrice,
            hasDiscount: priceInfo.hasDiscount,
            stock: getProductStock(product),
            brandName: brands.find(b => b._id === product.id_brand)?.name || "",
            images: validImages.length > 0 ? validImages : [ERROR_IMAGE_URL],
          };
        });
        
        setProducts(processedProducts);
        setFilteredProducts(processedProducts);

        // Đếm tổng số hình ảnh hợp lệ
        const validImagesCount = processedProducts.reduce((acc, product) => {
          return acc + (product.images?.filter(img => img !== ERROR_IMAGE_URL).length || 0);
        }, 0);
        setTotalImages(validImagesCount + (processedProducts.length > 0 ? Math.min(processedProducts.length, 5) : 0));
      } catch (error) {
        console.error("Lỗi khi tải sản phẩm:", error);
        setError("Không thể tải sản phẩm. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };
    if (brands.length > 0) fetchProducts();
  }, [brands]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/categories`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Lỗi tải danh mục: ${res.status}`);
        }
        const data: Category[] = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("Lỗi khi tải danh mục:", err);
        setError("Không thể tải danh mục. Vui lòng thử lại sau.");
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchFavoriteProducts = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setFavoriteProducts([]);
        localStorage.removeItem("favoriteProducts");
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/favorite-products`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
      } catch (error) {
        console.error("Lỗi khi lấy danh sách yêu thích:", error);
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

  useEffect(() => {
    const categoryFromUrl = searchParams.get("category");
    if (!categoryFromUrl) {
      setActiveCategory(null);
      setFilteredProducts(products);
      setCurrentPage(1);
      return;
    }
    if (products.length === 0 || categories.length === 0) return;
    const decodedCategory = decodeURIComponent(categoryFromUrl);
    const foundCategory = categories.find(cat => cat.name === decodedCategory);
    if (foundCategory) {
      const filtered = products.filter(product => {
        if (!product.id_category) return false;
        if (typeof product.id_category === "string") {
          return product.id_category === foundCategory._id;
        }
        return isCategory(product.id_category) && (product.id_category as Category)._id === foundCategory._id;
      });
      setActiveCategory(decodedCategory);
      setFilteredProducts(filtered);
    } else if (decodedCategory === "Tất cả") {
      setActiveCategory(null);
      setFilteredProducts(products);
    } else {
      setActiveCategory(null);
      setFilteredProducts(products);
    }
    setCurrentPage(1);
  }, [searchParams, products, categories]);

  useEffect(() => {
    let filtered: Product[] = [...products];
    if (activeCategory) {
      const foundCategory = categories.find(cat => cat.name === activeCategory);
      if (foundCategory) {
        filtered = filtered.filter(product => {
          if (!product.id_category) return false;
          if (typeof product.id_category === "string") {
            return product.id_category === foundCategory._id;
          }
          return isCategory(product.id_category) && (product.id_category as Category)._id === foundCategory._id;
        });
      }
    }
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(product => selectedBrands.includes(product.brandName || ""));
    }
    if (selectedPriceRange) {
      filtered = filtered.filter(product => {
        const price = product.price || 0;
        if (selectedPriceRange === "100-300") return price >= 100000 && price <= 300000;
        if (selectedPriceRange === "300-500") return price > 300000 && price <= 500000;
        if (selectedPriceRange === "500+") return price > 500000;
        return true;
      });
    }
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchQuery)
      );
    }
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [products, activeCategory, selectedBrands, selectedPriceRange, searchQuery, categories]);

  const filterProducts = (categoryName: string): void => {
    if (activeCategory === categoryName) {
      setActiveCategory(null);
      setFilteredProducts(products);
    } else {
      const foundCategory = categories.find(cat => cat.name === categoryName);
      if (foundCategory) {
        const filtered = products.filter(product => {
          if (!product.id_category) return false;
          if (typeof product.id_category === "string") {
            return product.id_category === foundCategory._id;
          }
          return isCategory(product.id_category) && (product.id_category as Category)._id === foundCategory._id;
        });
        setFilteredProducts(filtered);
        setActiveCategory(categoryName);
      }
    }
    setCurrentPage(1);
  };

  const totalPages: number = Math.ceil(filteredProducts.length / productsPerPage);
  const indexOfLastProduct: number = currentPage * productsPerPage;
  const indexOfFirstProduct: number = indexOfLastProduct - productsPerPage;
  const currentProducts: Product[] = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [filteredProducts, currentPage, totalPages]);

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

  const bestSellingProducts: Product[] = getTopStockProducts(products, 5);

  const addToWishlist = useCallback(async (productId: string): Promise<void> => {
    const token = localStorage.getItem("token");
    if (!token) {
      showToast("error", "Vui lòng đăng nhập để thêm vào danh sách yêu thích!");
      return;
    }

    try {
      if (favoriteProducts.includes(productId)) {
        const response = await fetch(
          `${API_BASE_URL}/api/users/favorite-products/${productId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
            setFavoriteProducts([]);
            showToast("error", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
            return;
          } else if (response.status === 400) {
            showToast("error", "ProductId không hợp lệ!");
            return;
          } else if (response.status === 404) {
            showToast("error", "Không tìm thấy người dùng!");
            return;
          } else if (response.status === 500) {
            showToast("error", "Lỗi server. Vui lòng thử lại sau!");
            return;
          }
          throw new Error("Không thể xóa khỏi danh sách yêu thích!");
        }
        const data = await response.json();
        const updatedFavorites: string[] = favoriteProducts.filter(id => id !== productId);
        setFavoriteProducts(updatedFavorites);
        localStorage.setItem("favoriteProducts", JSON.stringify(updatedFavorites));
        showToast("success", data.message || "Đã xóa khỏi danh sách yêu thích!");
      } else {
        const response = await fetch(`${API_BASE_URL}/api/users/favorite-products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId }),
        });
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
            setFavoriteProducts([]);
            showToast("error", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
            return;
          } else if (response.status === 400) {
            showToast("error", "ProductId không hợp lệ!");
            return;
          } else if (response.status === 404) {
            showToast("error", "Không tìm thấy người dùng!");
            return;
          } else if (response.status === 500) {
            showToast("error", "Lỗi server. Vui lòng thử lại sau!");
            return;
          }
          throw new Error("Không thể thêm vào danh sách yêu thích!");
        }
        const data = await response.json();
        const updatedFavorites: string[] = [...favoriteProducts, productId];
        setFavoriteProducts(updatedFavorites);
        localStorage.setItem("favoriteProducts", JSON.stringify(updatedFavorites));
        showToast("success", data.message || "Đã thêm vào danh sách yêu thích!");
      }
    } catch (error) {
      console.error("Lỗi khi quản lý danh sách yêu thích:", error);
      showToast("error", "Lỗi khi cập nhật danh sách yêu thích!");
    }
  }, [favoriteProducts, showToast]);

  const isProductInWishlist = (productId: string): boolean => {
    return favoriteProducts.includes(productId);
  };

  const getPageNumbers = () => {
    const maxPagesToShow = 5;
    const pages: (number | string)[] = [];
    const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push("...");
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  const handleImageLoad = (src: string) => {
    if (src && src !== ERROR_IMAGE_URL) {
      setImagesLoaded((prev) => {
        const newCount = prev + 1;
        if (newCount >= totalImages && !allImagesLoaded) {
          setAllImagesLoaded(true);
          setTimeout(() => {
            setIsLoading(false);
          }, 2000);
        }
        return newCount;
      });
    }
  };

  return (
    <div>
      {isLoading && (
        <div className={styles.loaderContainer}>
          <div className={styles.loader}></div>
        </div>
      )}
      <ScrollInView>
        <section className={styles.productBanner}>
          <img
            src="/images/productBanner.png"
            alt="Banner"
            className={styles["banner-image"]}
            onLoad={() => handleImageLoad("/images/productBanner.png")}
            onError={(e) => {
              (e.target as HTMLImageElement).src = ERROR_IMAGE_URL;
              console.log("Banner image load failed, switched to 404 fallback");
            }}
          />
        </section>
      </ScrollInView>
      <ScrollInView>
        <h1 className={styles["product-main-title"]}>Sản phẩm đang Sale</h1>
      </ScrollInView>

      <ScrollInView>
        <div className={styles.containerBox}>
          <aside className={styles.productSidebar}>
            <h3 className={styles["sidebar-title"]}>DANH MỤC SẢN PHẨM</h3>
            <hr />
            <ul className={styles["menu-list"]}>
              {categories.length > 0 ? (
                categories
                  .filter(category => category.status === "show")
                  .map(category => (
                    <li
                      key={category._id}
                      className={styles["menu-list-item"]}
                      onClick={() => filterProducts(category.name)}
                    >
                      <span
                        className={`${styles.filterOption} ${
                          activeCategory === category.name ? styles.active : ""
                        }`}
                      >
                        {category.name}
                      </span>
                    </li>
                  ))
              ) : (
                <li className={styles["no-products"]}>Không có danh mục nào.</li>
              )}
            </ul>

            <h3 className={styles["sidebar-title"]}>THƯƠNG HIỆU</h3>
            <hr />
            <ul className={styles.filterList}>
              {brands
                .filter(brand => brand.status === "show")
                .map(brand => (
                  <li key={brand._id} className={styles.filterItem}>
                    <span
                      className={`${styles.filterOption} ${
                        selectedBrands.includes(brand.name) ? styles.active : ""
                      }`}
                      onClick={() =>
                        setSelectedBrands(prev =>
                          prev.includes(brand.name)
                            ? prev.filter(b => b !== brand.name)
                            : [...prev, brand.name]
                        )
                      }
                    >
                      {brand.name}
                    </span>
                  </li>
                ))}
            </ul>

            <h3 className={styles["sidebar-title"]}>PHÂN KHÚC SẢN PHẨM</h3>
            <hr />
            <ul className={styles.filterList}>
              {PRICE_RANGES.map(range => (
                <li key={range.value} className={styles.filterItem}>
                  <span
                    className={`${styles.filterOption} ${
                      selectedPriceRange === range.value ? styles.active : ""
                    }`}
                    onClick={() =>
                      setSelectedPriceRange(selectedPriceRange === range.value ? "" : range.value)
                    }
                  >
                    {range.label}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
          <section className={styles.productContainer}>
            {error ? (
              <p className={styles["no-products"]}>{error}</p>
            ) : isLoading ? (
              <p className={styles["no-products"]}>Đang tải sản phẩm...</p>
            ) : currentProducts.length > 0 ? (
              <div className={styles.productGrid}>
                {currentProducts.map(product => {
                  const priceInfo = getProductPrice(product);
                  const discountPercentage = priceInfo.hasDiscount && priceInfo.salePrice 
                    ? calculateDiscountPercentage(priceInfo.originalPrice, priceInfo.salePrice)
                    : 0;
                    
                  return (
                    <Link
                      href={`/user/detail/${product.slug}`}
                      key={product._id}
                      className={`${styles.productItem} ${styles["product-link"]}`}
                    >
                      <div style={{ position: 'relative' }}>
                        {/* Sale Badge */}
                        {priceInfo.hasDiscount && discountPercentage > 0 && (
                          <div 
                            style={{
                              position: 'absolute',
                              top: '10px',
                              left: '10px',
                              background: '#ff4444',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              zIndex: 1
                            }}
                          >
                            -{discountPercentage}%
                          </div>
                        )}
                        
                        <Image
                          src={
                            product.images && product.images.length > 0
                              ? `${getImageUrl(product.images[0])}?${cacheBuster}`
                              : ERROR_IMAGE_URL
                          }
                          alt={product?.name || "Sản phẩm"}
                          width={300}
                          height={200}
                          quality={100}
                          className={styles["product-image"]}
                          onLoad={() => handleImageLoad(product.images?.[0] || "")}
                          onError={(e) => {
                            console.log(`Image load failed for ${product.name}, switched to 404 fallback`);
                            (e.target as HTMLImageElement).src = ERROR_IMAGE_URL;
                          }}
                        />
                        <div className={styles["product-details"]}>
                          <h4 className={styles["product-item-name"]}>{product?.name || "Tên sản phẩm"}</h4>
                          <div className={styles["product-card"]}>
                            <div className={styles["price-section"]}>
                              {/* Giá sale */}
                              <p className={styles.price}>{formatPrice(priceInfo.salePrice || priceInfo.originalPrice)}</p>
                              {/* Giá gốc bị gạch nếu có sale */}
                              {priceInfo.hasDiscount && priceInfo.salePrice && (
                                <p 
                                  className={styles["original-price"]}
                                  style={{
                                    textDecoration: 'line-through',
                                    color: '#999',
                                    fontSize: '14px',
                                    marginTop: '4px'
                                  }}
                                >
                                  {formatPrice(priceInfo.originalPrice)}
                                </p>
                              )}
                            </div>
                            <div className={styles.actionIcons}>
                              <span
                                title={
                                  isProductInWishlist(product._id)
                                    ? "Xóa khỏi danh sách yêu thích"
                                    : "Thêm vào danh sách yêu thích"
                                }
                                className={`${styles.wishlistIcon} ${
                                  isProductInWishlist(product._id) ? styles.favorited : ""
                                }`}
                                onClick={e => {
                                  e.preventDefault();
                                  addToWishlist(product._id);
                                }}
                              >
                                <i className="fas fa-heart"></i>
                              </span>
                              <span
                                title="Thêm vào Giỏ Hàng"
                                className={`${styles.cartIcon} ${addingToCart ? styles.disabled : ""}`}
                                onClick={e => {
                                  e.preventDefault();
                                  if (!addingToCart) addToCart(product);
                                }}
                              >
                                <i className="fas fa-shopping-cart"></i>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className={styles["no-products"]}>
                {searchQuery
                  ? `Không tìm thấy sản phẩm sale với từ khóa "${searchQuery}"`
                  : activeCategory
                  ? `Không tìm thấy sản phẩm sale trong danh mục "${activeCategory}"`
                  : "Hiện tại không có sản phẩm nào đang sale."}
              </p>
            )}
            {totalPages > 1 && (
              <div className={styles.productPagination}>
                <button
                  type="button"
                  title="Trang trước"
                  className={`${styles["page-btn"]} ${currentPage === 1 ? styles.disabled : ""}`}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
                  <span className="sr-only">Trang trước</span>
                </button>
                {getPageNumbers().map((page, index) => (
                  <span key={index}>
                    {typeof page === "string" ? (
                      <span className={styles.ellipsis}>...</span>
                    ) : (
                      <button
                        type="button"
                        className={`${styles["page-btn"]} ${page === currentPage ? styles.active : ""}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                        <span className="sr-only">Trang {page}</span>
                      </button>
                    )}
                  </span>
                ))}
                <button
                  type="button"
                  title="Trang sau"
                  className={`${styles["page-btn"]} ${currentPage === totalPages ? styles.disabled : ""}`}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
                  <span className="sr-only">Trang sau</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </ScrollInView>

      <ScrollInView>
        <div className={styles["best-selling-products"]}>
          <h3 className={styles["slider-title"]}>Có thể bạn sẽ thích</h3>
          <div className={styles["best-selling-grid"]}>
            {bestSellingProducts.length > 0 ? (
              bestSellingProducts.map(product => {
                const priceInfo = getProductPrice(product);
                const discountPercentage = priceInfo.hasDiscount && priceInfo.salePrice 
                  ? calculateDiscountPercentage(priceInfo.originalPrice, priceInfo.salePrice)
                  : 0;
                  
                return (
                  <Link
                    href={`/user/detail/${product.slug}`}
                    key={product._id}
                    className={styles["best-selling-link"]}
                  >
                    <div className={styles["best-selling-card"]} style={{ position: 'relative' }}>
                      {/* Sale Badge cho best selling */}
                      {priceInfo.hasDiscount && discountPercentage > 0 ? (
                        <div className={styles["best-selling-badge"]}>Sale -{discountPercentage}%</div>
                      ) : (
                        <div className={styles["best-selling-badge"]}>Hot</div>
                      )}
                      <div className={styles["best-selling-image"]}>
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
                          className={styles["best-selling-product-image"]}
                          onLoad={() => handleImageLoad(product.images?.[0] || "")}
                          onError={(e) => {
                            console.log(`Best Selling ${product.name} image load failed, switched to 404 fallback`);
                            (e.target as HTMLImageElement).src = ERROR_IMAGE_URL;
                          }}
                        />
                      </div>
                      <div className={styles["best-selling-details"]}>
                        <h3 className={styles["best-selling-product-name"]}>
                          {product?.name || "Tên sản phẩm"}
                        </h3>
                        <div className={styles["best-selling-price-section"]}>
                          <p className={styles["best-selling-price"]}>
                            {formatPrice(priceInfo.salePrice || priceInfo.originalPrice)}
                          </p>
                          {priceInfo.hasDiscount && priceInfo.salePrice && (
                            <p 
                              style={{
                                textDecoration: 'line-through',
                                color: '#999',
                                fontSize: '12px',
                                marginTop: '2px'
                              }}
                            >
                              {formatPrice(priceInfo.originalPrice)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className={styles["no-products"]}>Không có sản phẩm nào.</p>
            )}
          </div>
        </div>
      </ScrollInView>
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