"use client";
import { useEffect, useState } from "react";
import styles from "./product.module.css";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faEye, faEyeSlash, faPlus, faCheck, faTimes, faRedo } from '@fortawesome/free-solid-svg-icons';
import ToastNotification from "../../user/ToastNotification/ToastNotification";

interface Option {
  _id: string;
  value: string;
  price: number;
  stock: number;
  discount_price?: number;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  status: "show" | "hidden";
  active: boolean;
  view: number;
  id_brand: string;
  id_category: string | { _id: string; status: string };
  images: string[];
  short_description: string;
  description: string;
  option: Option[];
  createdAt: string;
  updatedAt: string;
}

interface Category {
  _id: string;
  name: string;
  status: "show" | "hidden";
  createdAt?: string;
}

interface Brand {
  _id: string;
  name: string;
  status: "show" | "hidden";
}

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);
  const [toggleSlug, setToggleSlug] = useState<string | null>(null);
  const [toggleMessage, setToggleMessage] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  // New state for selected brand
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const productsPerPage = 9;

  const router = useRouter();

  const normalizeImageUrl = (path: string): string => {
    if (path.startsWith("http")) return path;
    return `https://api-zeal.onrender.com${path.startsWith("/") ? "" : "/"}${path}`;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "admin") {
      showNotification("Bạn cần quyền admin để truy cập trang này.", "error");
      router.push("/user/login");
    }
  }, [router]);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
      }

      const res = await fetch("https://api-zeal.onrender.com/api/categories", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) {
        showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        router.push("/user/login");
        return [];
      }

      if (!res.ok) {
        throw new Error(`Lỗi API: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu danh mục không phải mảng.");
      }

      const normalizedCategories: Category[] = data.map((cat: any) => {
        const categoryId = typeof cat._id === "object" && cat._id.$oid ? cat._id.$oid : cat._id;
        return {
          _id: categoryId,
          name: cat.name || "Danh mục không tên",
          status: cat.status || "hidden",
          createdAt: cat.createdAt?.$date || cat.createdAt,
        };
      });

      setCategories(normalizedCategories);
      return normalizedCategories;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
      showNotification(`Không thể tải danh mục: ${errorMessage}`, "error");
      setError(`Không thể tải danh mục: ${errorMessage}`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
      }

      const res = await fetch("https://api-zeal.onrender.com/api/brands", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) {
        showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        router.push("/user/login");
        return;
      }

      if (!res.ok) {
        throw new Error(`Lỗi API: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu thương hiệu không hợp lệ, không phải là mảng");
      }

      const normalizedBrands: Brand[] = data.map((brand: any) => ({
        _id: typeof brand._id === "object" && brand._id.$oid ? brand._id.$oid : brand._id,
        name: brand.name || "Thương hiệu không tên",
        status: brand.status || "hidden",
      }));

      setBrands(normalizedBrands);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
      showNotification(`Không thể tải thương hiệu: ${errorMessage}`, "error");
      setError(`Không thể tải thương hiệu: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (loadedCategories: Category[]) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
      }

      const res = await fetch("https://api-zeal.onrender.com/api/products?status=all", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) {
        showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        router.push("/user/login");
        return;
      }

      if (!res.ok) {
        throw new Error(`Lỗi API: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu sản phẩm không hợp lệ, không phải là mảng");
      }

      const normalizedProducts: Product[] = data.map((prod: any) => {
        let id_category: string;
        if (prod.id_category && typeof prod.id_category === "object" && prod.id_category._id) {
          id_category = prod.id_category._id;
        } else if (typeof prod.id_category === "string" && prod.id_category) {
          id_category = prod.id_category;
        } else if (prod.id_category && typeof prod.id_category === "object" && prod.id_category.$oid) {
          id_category = prod.id_category.$oid;
        } else {
          id_category = "";
          showNotification(`Sản phẩm ${prod.name} có id_category không hợp lệ`, "error");
        }

        if (id_category && !loadedCategories.find((cat) => cat._id === id_category)) {
          showNotification(`Sản phẩm ${prod.name} có id_category không tồn tại trong danh mục`, "error");
        }

        return {
          _id: typeof prod._id === "object" && prod._id.$oid ? prod._id.$oid : prod._id,
          name: prod.name || "Sản phẩm không tên",
          slug: prod.slug || "",
          status: prod.status || "hidden",
          active: prod.active !== undefined ? prod.active : true,
          view: prod.view || 0,
          id_brand: typeof prod.id_brand === "object" && prod.id_brand.$oid ? prod.id_brand.$oid : prod.id_brand || "",
          id_category,
          images: Array.isArray(prod.images) ? prod.images : [],
          short_description: prod.short_description || "",
          description: prod.description || "",
          option: Array.isArray(prod.option)
            ? prod.option.map((opt: any) => ({
                _id: typeof opt._id === "object" && opt._id.$oid ? opt._id.$oid : opt._id,
                value: opt.value || "",
                price: opt.price || 0,
                stock: opt.stock || 0,
                discount_price: opt.discount_price,
              }))
            : [],
          createdAt: prod.createdAt?.$date || prod.createdAt || new Date().toISOString(),
          updatedAt: prod.updatedAt?.$date || prod.updatedAt || new Date().toISOString(),
        };
      });

      setProducts(normalizedProducts);
      setFilteredProducts(normalizedProducts);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
      showNotification(`Không thể tải sản phẩm: ${errorMessage}`, "error");
      setError(`Không thể tải sản phẩm: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const loadedCategories = await fetchCategories();
      if (loadedCategories.length === 0) {
        showNotification("Không có danh mục nào được tải. Vui lòng kiểm tra API.", "error");
        return;
      }

      await fetchBrands();
      await fetchProducts(loadedCategories);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
      showNotification("Đã xảy ra lỗi khi tải dữ liệu", "error");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Updated filtering logic to include brand
  useEffect(() => {
    const filtered = products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || product.id_category === selectedCategory;
      const matchesStatus = selectedStatus === "all" || product.status === selectedStatus;
      const matchesBrand = selectedBrand === "all" || product.id_brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesStatus && matchesBrand;
    });
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedStatus, selectedBrand, products]);

  const confirmToggleStatus = (slug: string) => {
    const product = products.find((p) => p.slug === slug);
    if (product) {
      if (product.status === "show") {
        const hasStock = product.option.some((opt) => opt.stock > 0);
        setToggleMessage(
          hasStock
            ? "Sản phẩm này còn tồn kho. Bạn có chắc chắn muốn ẩn?"
            : "Bạn có chắc chắn muốn ẩn sản phẩm này?"
        );
      } else {
        setToggleMessage("Bạn có chắc chắn muốn hiển thị sản phẩm này?");
      }
      setToggleSlug(slug);
      setIsTogglingStatus(true);
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleSlug) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
      }

      const response = await fetch(
        `https://api-zeal.onrender.com/api/products/${toggleSlug}/toggle-visibility`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 401 || response.status === 403) {
        showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        router.push("/user/login");
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lỗi HTTP: ${response.status} - ${errorText}`);
      }

      const { product }: { product: Product } = await response.json();
      setProducts(
        products.map((p) => (p.slug === toggleSlug ? { ...p, status: product.status } : p))
      );
      setFilteredProducts(
        filteredProducts.map((p) =>
          p.slug === toggleSlug ? { ...p, status: product.status } : p
        )
      );
      setIsTogglingStatus(false);
      setToggleSlug(null);
      setToggleMessage("");
      showNotification(
        `Sản phẩm đã được ${product.status === "show" ? "hiển thị" : "ẩn"}`,
        "success"
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
      showNotification("Đã xảy ra lỗi khi thay đổi trạng thái sản phẩm", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
  };

  const closePopup = () => {
    setSelectedProduct(null);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closePopup();
    }
  };

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedProduct(null);
    }
  };

  const getPaginationInfo = () => {
    const visiblePages: number[] = [];
    let showPrevEllipsis = false;
    let showNextEllipsis = false;

    if (totalPages <= 3) {
      for (let i = 1; i <= totalPages; i++) {
        visiblePages.push(i);
      }
    } else {
      if (currentPage === 1) {
        visiblePages.push(1, 2, 3);
        showNextEllipsis = totalPages > 3;
      } else if (currentPage === totalPages) {
        visiblePages.push(totalPages - 2, totalPages - 1, totalPages);
        showPrevEllipsis = totalPages > 3;
      } else {
        visiblePages.push(currentPage - 1, currentPage, currentPage + 1);
        showPrevEllipsis = currentPage > 2;
        showNextEllipsis = currentPage < totalPages - 1;
      }
    }

    return { visiblePages, showPrevEllipsis, showNextEllipsis };
  };

  if (loading && products.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.processingIndicator}>
          <FontAwesomeIcon icon={faRedo} spin />
          <p>Đang tải danh sách sản phẩm...</p>
        </div>
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
        <button className={styles.retryButton} onClick={fetchData} title="Thử lại">
          <FontAwesomeIcon icon={faRedo} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.productManagementContainer}>
      <Head>
        <title>Quản Lý Sản Phẩm</title>
      </Head>
      {notification && (
        <ToastNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {loading && products.length > 0 && (
        <div className={styles.processingIndicator}>
          <FontAwesomeIcon icon={faRedo} spin /> Đang xử lý...
        </div>
      )}
      <div className={styles.titleContainer}>
        <h1>QUẢN LÝ SẢN PHẨM</h1>
        <div className={styles.filterContainer}>
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm hoặc danh mục..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.categorySelect}
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
           <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className={styles.categorySelect}
          >
            <option value="all">Tất cả thương hiệu</option>
            {brands.map((brand) => (
              <option key={brand._id} value={brand._id}>
                {brand.name}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={styles.categorySelect}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="show">Hiển thị</option>
            <option value="hidden">Ẩn</option>
          </select>
          {/* New brand filter dropdown */}
         
          <Link href="/admin/add_product" className={styles.addProductBtn} title="Thêm sản phẩm">
            <FontAwesomeIcon icon={faPlus} />
          </Link>
        </div>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.productTable}>
          <thead className={styles.productTableThead}>
            <tr>
              <th>Ảnh</th>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Brand</th>
              <th>Kích hoạt</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.length > 0 ? (
              currentProducts.map((product) => (
                <tr 
                  key={product._id} 
                  className={styles.productRow} 
                  onClick={() => handleViewDetails(product)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <img
                      src={normalizeImageUrl(product.images[0])}
                      alt={product.name}
                      width={50}
                      height={50}
                      className={styles.productTableImage}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                      }}
                    />
                  </td>
                  <td>{product.name}</td>
                  <td>{categories.find((cat) => cat._id === product.id_category)?.name || "Chưa phân loại"}</td>
                  <td>{brands.find((brand) => brand._id === product.id_brand)?.name || "Chưa phân loại"}</td>
                  <td>{product.active ? "Có" : "Không"}</td>
                  <td>{product.status === "show" ? "Hiển thị" : "Ẩn"}</td>
                  <td className={styles.actionButtons}>
                    <button
                      className={styles.editBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/edit_product/${product.slug}`);
                      }}
                      disabled={loading}
                      title="Sửa sản phẩm"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      className={styles.toggleStatusBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmToggleStatus(product.slug);
                      }}
                      disabled={loading}
                      title={product.status === "show" ? "Ẩn sản phẩm" : "Hiển thị sản phẩm"}
                    >
                      <FontAwesomeIcon icon={product.status === "show" ? faEyeSlash : faEye} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  <h3>Không có sản phẩm</h3>
                  <p>Vui lòng thêm sản phẩm mới hoặc điều chỉnh bộ lọc/tìm kiếm.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedProduct && (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
          <div className={styles.modalContent}>
            <div className={styles.productDetails}>
              <h3>Chi tiết sản phẩm</h3>
              <button className={styles.closeBtn} onClick={closePopup} title="Đóng">
                <FontAwesomeIcon icon={faTimes} />
              </button>
              <div className={styles.detailsContainer}>
                <div className={styles.detailsSection}>
                  <h4>Thông tin cơ bản</h4>
                  <div className={styles.detailsGrid}>
                    <p><strong>Tên sản phẩm:</strong> {selectedProduct.name}</p>
                    <p><strong>Slug:</strong> {selectedProduct.slug}</p>
                    <p><strong>Danh mục:</strong> {categories.find((cat) => cat._id === selectedProduct.id_category)?.name || "Chưa phân loại"}</p>
                    <p><strong>Thương hiệu:</strong> {brands.find((brand) => brand._id === selectedProduct.id_brand)?.name || "Chưa phân loại"}</p>
                    <p><strong>Kích hoạt:</strong> {selectedProduct.active ? "Có" : "Không"}</p>
                    <p><strong>Trạng thái:</strong> {selectedProduct.status === "show" ? "Hiển thị" : "Ẩn"}</p>
                    <p><strong>Lượt xem:</strong> {selectedProduct.view}</p>
                    <p><strong>Ngày tạo:</strong> {new Date(selectedProduct.createdAt).toLocaleString()}</p>
                    <p><strong>Ngày cập nhật:</strong> {new Date(selectedProduct.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className={styles.detailsSection}>
                  <h4>Mô tả sản phẩm</h4>
                  <p><strong>Mô tả ngắn:</strong> {selectedProduct.short_description}</p>
                  <br />
                  <h4><strong>Mô tả chi tiết:</strong></h4>
                  <div className={styles.descriptionContent} dangerouslySetInnerHTML={{ __html: selectedProduct.description }} />
                </div>
                <div className={styles.detailsSection}>
                  <h4>Tùy chọn sản phẩm</h4>
                  <table className={styles.optionsTable}>
                    <thead>
                      <tr>
                        <th>Kích thước</th>
                        <th>Giá</th>
                        <th>Giá khuyến mãi</th>
                        <th>Tồn kho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduct.option.length > 0 ? (
                        selectedProduct.option.map((opt, index) => (
                          <tr key={index}>
                            <td>{opt.value}</td>
                            <td>{opt.price.toLocaleString()}₫</td>
                            <td>{opt.discount_price ? opt.discount_price.toLocaleString() + "₫" : "Không có"}</td>
                            <td>{opt.stock}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center">Không có tùy chọn nào</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className={styles.detailsSection}>
                  <h4>Hình ảnh sản phẩm</h4>
                  <div className={styles.imageGallery}>
                    {selectedProduct.images.length > 0 ? (
                      selectedProduct.images.map((img, index) => (
                        <img
                          key={index}
                          src={normalizeImageUrl(img)}
                          alt={`${selectedProduct.name} hình ${index + 1}`}
                          width={120}
                          height={120}
                          className={styles.detailImage}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                          }}
                        />
                      ))
                    ) : (
                      <p>Không có hình ảnh</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          {(() => {
            const { visiblePages, showPrevEllipsis, showNextEllipsis } = getPaginationInfo();
            return (
              <>
                {showPrevEllipsis && (
                  <>
                    <button
                      className={`${styles.pageLink} ${styles.firstLastPage}`}
                      onClick={() => handlePageChange(1)}
                      disabled={loading}
                      title="Trang đầu tiên"
                    >
                      1
                    </button>
                    <div
                      className={styles.ellipsis}
                      onClick={() => handlePageChange(Math.max(1, currentPage - 3))}
                      title="Trang trước đó"
                    >
                      ...
                    </div>
                  </>
                )}
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    className={`${styles.pageLink} ${
                      currentPage === page ? styles.pageLinkActive : ""
                    }`}
                    onClick={() => handlePageChange(page)}
                    disabled={loading}
                    title={`Trang ${page}`}
                  >
                    {page}
                  </button>
                ))}
                {showNextEllipsis && (
                  <>
                    <div
                      className={styles.ellipsis}
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 3))}
                      title="Trang tiếp theo"
                    >
                      ...
                    </div>
                    <button
                      className={`${styles.pageLink} ${styles.firstLastPage}`}
                      onClick={() => handlePageChange(totalPages)}
                      disabled={loading}
                      title="Trang cuối cùng"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}
      {isTogglingStatus && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalConfirm}>
            <h2>Xác nhận thay đổi trạng thái</h2>
            <p>{toggleMessage}</p>
            <div className={styles.modalActions}>
              <button className={styles.confirmBtn} onClick={handleToggleStatus} title="Xác nhận">
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setIsTogglingStatus(false);
                  setToggleSlug(null);
                  setToggleMessage("");
                }}
                title="Hủy"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}