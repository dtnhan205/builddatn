"use client";
import { useEffect, useState, useCallback } from "react";
import styles from "./category.module.css";
import type { Category } from "@/app/components/category_interface";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faEye,
  faEyeSlash,
  faCheck,
  faTimes,
  faPlus,
  faRedo,
} from "@fortawesome/free-solid-svg-icons";
import ToastNotification from "../../user/ToastNotification/ToastNotification";

interface Product {
  products: string;
  _id: string;
  name: string;
  slug: string;
  status: string;
  view: number;
  id_brand: string;
  id_category: string | { _id: string; status: string };
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
  stock?: number;
  price?: number;
  brandName?: string;
}

export default function Category() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [updateError, setUpdateError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState<
    { id: string; name: string; action: "ẩn" | "hiển thị" } | null
  >(null);
  const [showStockWarning, setShowStockWarning] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "show" | "hidden">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(9);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const router = useRouter();
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ show: true, message, type });
  };

  // Hàm fetch danh mục và sản phẩm, đếm số sản phẩm cho từng danh mục
  const fetchCategoriesAndProducts = useCallback(
    async (
      setCategories: (cats: Category[]) => void,
      setLoading: (loading: boolean) => void,
      router: any,
      showNotification: (message: string, type: "success" | "error") => void,
      token: string | null
    ) => {
      setLoading(true);
      try {
        const categoryRes = await fetch(
          "https://api-zeal.onrender.com/api/categories",
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            cache: "no-store",
          }
        );
        if (!categoryRes.ok) {
          if (categoryRes.status === 401) {
            showNotification("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "error");
            localStorage.removeItem("token");
            router.push("/login");
            return;
          }
          throw new Error(`Không thể tải danh mục: ${categoryRes.status}`);
        }
        const categoriesData: Category[] = await categoryRes.json();

        const validCategories = categoriesData.filter((cat) => {
          if (!cat.name || typeof cat.name !== "string") {
            console.warn(`Invalid category detected: _id=${cat._id}, name=${cat.name}`);
            return false;
          }
          return true;
        });

        const productRes = await fetch(
          "https://api-zeal.onrender.com/api/products",
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            cache: "no-store",
          }
        );
        if (!productRes.ok) {
          throw new Error(`Không thể tải sản phẩm: ${productRes.status}`);
        }
        const products: Product[] = await productRes.json();

        const updatedCategories = validCategories.map((category) => {
          const productCount = products.filter((product) => {
            let prodCatId = "";
            if (typeof product.id_category === "object" && product.id_category !== null) {
              prodCatId = product.id_category._id;
            } else {
              prodCatId = product.id_category as string;
            }
            return String(prodCatId) === String(category._id);
          }).length;
          return { ...category, productCount };
        });

        setCategories(updatedCategories);
        if (validCategories.length < categoriesData.length) {
          showNotification(
            "Một số danh mục không hợp lệ đã bị lọc bỏ do thiếu tên.",
            "error"
          );
        }
      } catch (error: any) {
        showNotification(
          error.message || "Đã xảy ra lỗi khi tải danh sách danh mục hoặc sản phẩm.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);
    fetchCategoriesAndProducts(setCategories, setLoading, router, showNotification, storedToken);
  }, [router, fetchCategoriesAndProducts]);

  const checkCategoryCanHide = useCallback(
    async (categoryId: string): Promise<boolean> => {
      if (!token) {
        showNotification("Vui lòng đăng nhập lại!", "error");
        router.push("/login");
        return false;
      }
      try {
        const res = await fetch(
          `https://api-zeal.onrender.com/api/products?id_category=${categoryId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!res.ok) throw new Error("Không thể kiểm tra sản phẩm của danh mục");
        const products: Product[] = await res.json();

        if (!products || products.length === 0) return true;

        const allStockZero = products.every(
          (product) =>
            Array.isArray(product.option) &&
            product.option.every((opt) => Number(opt.stock) === 0)
        );
        if (allStockZero) return true;

        showNotification("Không thể ẩn danh mục vì vẫn còn sản phẩm có tồn kho!", "error");
        return false;
      } catch (error: any) {
        showNotification(error.message || "Lỗi khi kiểm tra danh mục.", "error");
        return false;
      }
    },
    [token, router]
  );

  const handleToggleVisibility = useCallback(
    async (id: string) => {
      if (!token) {
        showNotification("Vui lòng đăng nhập để thực hiện thao tác này!", "error");
        router.push("/login");
        return;
      }
      const category = categories.find((cat) => cat._id === id);
      if (!category) {
        showNotification("Không tìm thấy danh mục!", "error");
        return;
      }

      setShowConfirmPopup({
        id,
        name: category.name,
        action: category.status === "show" ? "ẩn" : "hiển thị",
      });
    },
    [categories, token]
  );

  const confirmToggleVisibility = useCallback(
    async () => {
      if (!showConfirmPopup || !token) return;
      const { id, name, action } = showConfirmPopup;
      try {
        const res = await fetch(
          `https://api-zeal.onrender.com/api/categories/${id}/toggle-visibility`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const result = await res.json();
        if (!res.ok) {
          if (res.status === 400) {
            setShowStockWarning(name);
          } else {
            showNotification(result.message || `Không thể ${action} danh mục "${name}"`, "error");
          }
          return;
        }
        setCategories((prev) =>
          prev.map((cat) =>
            cat._id === id ? { ...cat, status: result.category.status } : cat
          )
        );
        showNotification(
          `Danh mục "${name}" đã được ${
            result.category.status === "show" ? "hiển thị" : "ẩn"
          } thành công!`,
          "success"
        );
      } catch (error: any) {
        showNotification(error.message || `Không thể ${action} danh mục "${name}"`, "error");
      } finally {
        setShowConfirmPopup(null);
      }
    },
    [showConfirmPopup, token]
  );

  const handleEdit = useCallback(
    (id: string) => {
      const category = categories.find((cat) => cat._id === id);
      if (category) {
        setEditingCategory(category);
        setUpdateError("");
      }
    },
    [categories]
  );

  const handleUpdate = useCallback(
    async (id: string, updatedName: string) => {
      if (!token) {
        showNotification("Vui lòng đăng nhập để thực hiện thao tác này!", "error");
        router.push("/login");
        return;
      }
      if (!updatedName.trim()) {
        showNotification("Tên danh mục không được để trống!", "error");
        setUpdateError("Tên danh mục không được để trống!");
        return;
      }
      try {
        const res = await fetch(`https://api-zeal.onrender.com/api/categories/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: updatedName }),
        });
        if (res.status === 401) {
          showNotification("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "error");
          localStorage.removeItem("token");
          setToken(null);
          router.push("/login");
          return;
        }
        if (!res.ok) {
          const errorData = await res.json();
          if (errorData.code === 11000) {
            setUpdateError("Đã có một danh mục trùng tên!");
            throw new Error("Đã có một danh mục trùng tên!");
          }
          throw new Error(errorData.message || "Cập nhật thất bại");
        }
        const { category } = await res.json();
        setCategories((prev) =>
          prev.map((cat) => (cat._id === id ? category : cat))
        );
        setEditingCategory(null);
        setUpdateError("");
        showNotification("Cập nhật danh mục thành công!", "success");
      } catch (error: any) {
        showNotification(`Cập nhật thất bại: ${error.message}`, "error");
        setUpdateError(error.message || "Cập nhật thất bại");
      }
    },
    [token, router]
  );

  const handleAddCategory = useCallback(
    async () => {
      if (!token) {
        showNotification("Vui lòng đăng nhập để thực hiện thao tác này!", "error");
        router.push("/login");
        return;
      }
      if (!newCategoryName.trim()) {
        showNotification("Tên danh mục không được để trống!", "error");
        setAddError("Tên danh mục không được để trống!");
        return;
      }
      setAddLoading(true);
      setAddError("");
      try {
        const res = await fetch("https://api-zeal.onrender.com/api/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: newCategoryName }),
        });
        if (res.status === 401) {
          showNotification("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "error");
          localStorage.removeItem("token");
          setToken(null);
          router.push("/login");
          return;
        }
        if (!res.ok) {
          const errorData = await res.json();
          if (errorData.code === 11000) {
            throw new Error("Đã có một danh mục trùng tên!");
          }
          throw new Error(errorData.message || "Thêm danh mục thất bại");
        }
        const newCategory = await res.json();
        setCategories((prev) => [...prev, { ...newCategory, productCount: 0 }]);
        setNewCategoryName("");
        setShowAddPopup(false);
        showNotification("Thêm danh mục thành công!", "success");
        fetchCategoriesAndProducts(setCategories, setLoading, router, showNotification, token);
      } catch (error: any) {
        setAddError(error.message || "Đã xảy ra lỗi khi thêm danh mục.");
        showNotification(error.message || "Thêm danh mục thất bại", "error");
      } finally {
        setAddLoading(false);
      }
    },
    [token, router, newCategoryName, fetchCategoriesAndProducts]
  );

  const handleClosePopup = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowConfirmPopup(null);
      setShowStockWarning(null);
      setShowAddPopup(false);
      setNewCategoryName("");
      setAddError("");
    }
  }, []);

  const filteredCategories = categories
    .filter((cat) => (statusFilter === "all" ? true : cat.status === statusFilter))
    .filter((cat) => {
      if (!cat.name || typeof cat.name !== "string") {
        console.warn(`Skipping category with invalid name: _id=${cat._id}, name=${cat.name}`);
        return false;
      }
      return cat.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCategories = filteredCategories.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
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

  if (loading) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.processingIndicator}>
          <FontAwesomeIcon icon={faRedo} spin />
          <p>Đang tải danh sách danh mục...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.productManagementContainer}>
      {notification.show && (
        <ToastNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ show: false, message: "", type: "success" })}
        />
      )}
      <div className={styles.titleContainer}>
        <h1>Quản Lý Danh Mục</h1>
        <div className={styles.filterContainer}>
          <input
            type="text"
            placeholder="Tìm kiếm danh mục..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
            aria-label="Tìm kiếm danh mục"
          />
          <select
            className={styles.categorySelect}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "show" | "hidden");
              setCurrentPage(1);
            }}
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="show">Hiển thị</option>
            <option value="hidden">Ẩn</option>
          </select>
          <button
            className={styles.addProductBtn}
            onClick={() => setShowAddPopup(true)}
            title="Thêm danh mục"
            aria-label="Thêm danh mục"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.productTable}>
          <thead className={styles.productTableThead}>
            <tr>
              <th>Tên Danh Mục</th>
              <th>Số Sản Phẩm</th>
              <th>Trạng Thái</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {currentCategories.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyState}>
                  <h3>Không có danh mục</h3>
                  <p>Vui lòng thêm danh mục mới hoặc điều chỉnh bộ lọc/tìm kiếm.</p>
                </td>
              </tr>
            ) : (
              currentCategories.map((category) => (
                <tr key={category._id} className={styles.productRow}>
                  <td className={styles.editableCell}>
                    {editingCategory?._id === category._id ? (
                      <div className={styles.editingContainer}>
                        <div className={styles.formGroup}>
                          <input
                            type="text"
                            value={editingCategory.name}
                            onChange={(e) =>
                              setEditingCategory({ ...editingCategory, name: e.target.value })
                            }
                            className={styles.editInput}
                            aria-label="Chỉnh sửa tên danh mục"
                            autoFocus
                          />
                          {updateError && <div className={styles.errorMessage}>{updateError}</div>}
                        </div>
                      </div>
                    ) : (
                      <div className={styles.categoryName}>
                        {category.name || "Không có tên"}
                      </div>
                    )}
                  </td>
                  <td>{category.productCount ?? 0}</td>
                  <td>{category.status === "show" ? "Hiển thị" : "Ẩn"}</td>
                  <td className={styles.actionButtons}>
                    {editingCategory?._id === category._id ? (
                      <>
                        <button
                          className={styles.editBtn}
                          onClick={() => handleUpdate(category._id, editingCategory.name)}
                          title="Lưu"
                          aria-label="Lưu thay đổi danh mục"
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                        <button
                          className={styles.toggleStatusBtn}
                          onClick={() => {
                            setEditingCategory(null);
                            setUpdateError("");
                          }}
                          title="Hủy"
                          aria-label="Hủy chỉnh sửa danh mục"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={styles.editBtn}
                          onClick={() => handleEdit(category._id)}
                          title="Chỉnh sửa"
                          aria-label="Chỉnh sửa danh mục"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          className={styles.toggleStatusBtn}
                          onClick={() => handleToggleVisibility(category._id)}
                          title={category.status === "show" ? "Ẩn danh mục" : "Hiển thị danh mục"}
                          aria-label={category.status === "show" ? "Ẩn danh mục" : "Hiển thị danh mục"}
                        >
                          <FontAwesomeIcon icon={category.status === "show" ? faEyeSlash : faEye} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
      {showConfirmPopup && (
        <div className={styles.modalOverlay} onClick={handleClosePopup}>
          <div className={styles.modalContent}>
            <h2>Xác nhận</h2>
            <p>
              Bạn có chắc chắn muốn {showConfirmPopup.action} danh mục "
              {showConfirmPopup.name}" không?
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.confirmBtn}
                onClick={confirmToggleVisibility}
                aria-label="Xác nhận hành động"
              >
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowConfirmPopup(null)}
                aria-label="Hủy hành động"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        </div>
      )}
      {showStockWarning && (
        <div className={styles.modalOverlay} onClick={handleClosePopup}>
          <div className={styles.modalContent}>
            <h2>Cảnh báo</h2>
            <p>
              Không thể ẩn danh mục "<b>{showStockWarning}</b>" vì vẫn còn sản phẩm có
              tồn kho!
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowStockWarning(null)}
                aria-label="Đóng cảnh báo"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddPopup && (
        <div className={styles.modalOverlay} onClick={handleClosePopup}>
          <div className={styles.modalContent}>
            <h2>Thêm danh mục mới</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddCategory();
              }}
              className={styles.addCategoryForm}
            >
              <div className={styles.formGroup}>
                <label htmlFor="newCategoryName">Tên danh mục</label>
                <input
                  id="newCategoryName"
                  className={styles.newInput}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  disabled={addLoading}
                  placeholder="Nhập tên danh mục mới"
                  autoFocus
                />
              </div>
              {addError && <div className={styles.errorMessage}>{addError}</div>}
              <div className={styles.formButtons}>
                <button
                  type="submit"
                  className={styles.btnAdd}
                  disabled={addLoading}
                  aria-label="Thêm"
                >
                  <FontAwesomeIcon icon={faCheck} />
                </button>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => {
                    setShowAddPopup(false);
                    setNewCategoryName("");
                    setAddError("");
                  }}
                  aria-label="Hủy"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}