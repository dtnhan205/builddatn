"use client";
import { useEffect, useState, useCallback } from "react";
import styles from "./category.module.css";
import type { Category } from "@/app/components/category_interface";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faEye, faEyeSlash, faCheck, faTimes, faPlus, faRedo } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

interface Product {
  _id: string;
  name: string;
  status: string;
  active: boolean;
  option?: { value: string; stock: number }[];
}

export default function Category() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState<{ id: string; name: string; action: "ẩn" | "hiển thị" } | null>(null);
  const [showStockWarning, setShowStockWarning] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "show" | "hidden">("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(9);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);

    const fetchCategories = async () => {
      try {
        const res = await fetch("https://api-zeal.onrender.com/api/categories", {
          headers: {
            "Content-Type": "application/json",
            ...(storedToken && { Authorization: `Bearer ${storedToken}` }),
          },
          cache: "no-store",
        });
        if (!res.ok) {
          if (res.status === 401) {
            toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            localStorage.removeItem("token");
            router.push("/login");
            return;
          }
          throw new Error(`Không thể tải danh mục: ${res.status}`);
        }
        const data: Category[] = await res.json();
        setCategories(data);
      } catch (error: any) {
        toast.error(error.message || "Đã xảy ra lỗi khi tải danh sách danh mục.");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [router]);

  const checkCategoryCanHide = useCallback(async (categoryId: string): Promise<boolean> => {
    if (!token) {
      toast.error("Vui lòng đăng nhập lại!");
      router.push("/login");
      return false;
    }
    try {
      const res = await fetch(`https://api-zeal.onrender.com/api/products?id_category=${categoryId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Không thể kiểm tra sản phẩm của danh mục");
      const products: Product[] = await res.json();

      if (!products || products.length === 0) return true;

      const allStockZero = products.every(
        (product) =>
          Array.isArray(product.option) && product.option.every((opt) => Number(opt.stock) === 0)
      );
      if (allStockZero) return true;

      toast.error("Không thể ẩn danh mục vì vẫn còn sản phẩm có tồn kho!");
      return false;
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi kiểm tra danh mục.");
      return false;
    }
  }, [token, router]);

  const handleToggleVisibility = useCallback(async (id: string) => {
    if (!token) {
      toast.error("Vui lòng đăng nhập để thực hiện thao tác này!");
      router.push("/login");
      return;
    }
    const category = categories.find((cat) => cat._id === id);
    if (!category) {
      toast.error("Không tìm thấy danh mục!");
      return;
    }

    setShowConfirmPopup({
      id,
      name: category.name,
      action: category.status === "show" ? "ẩn" : "hiển thị",
    });
  }, [categories, token]);

  const confirmToggleVisibility = useCallback(async () => {
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
          toast.error(result.message || `Không thể ${action} danh mục "${name}"`);
        }
        return;
      }
      setCategories((prev) => prev.map((cat) => (cat._id === id ? result.category : cat)));
      toast.success(`Danh mục "${name}" đã được ${result.category.status === "show" ? "hiển thị" : "ẩn"} thành công!`);
    } catch (error: any) {
      toast.error(error.message || `Không thể ${action} danh mục "${name}"`);
    } finally {
      setShowConfirmPopup(null);
    }
  }, [showConfirmPopup, token, router]);

  const handleEdit = useCallback((id: string) => {
    const category = categories.find((cat) => cat._id === id);
    if (category) {
      setEditingCategory(category);
    }
  }, [categories]);

  const handleUpdate = useCallback(async (id: string, updatedName: string) => {
    if (!token) {
      toast.error("Vui lòng đăng nhập để thực hiện thao tác này!");
      router.push("/login");
      return;
    }
    if (!updatedName.trim()) {
      toast.error("Tên danh mục không được để trống!");
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
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        localStorage.removeItem("token");
        setToken(null);
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Cập nhật thất bại");
      }
      const { category } = await res.json();
      setCategories((prev) => prev.map((cat) => (cat._id === id ? category : cat)));
      setEditingCategory(null);
      toast.success("Cập nhật danh mục thành công!");
    } catch (error: any) {
      toast.error(`Cập nhật thất bại: ${error.message}`);
    }
  }, [token, router]);

  const filteredCategories = categories
    .filter((cat) => statusFilter === "all" ? true : cat.status === statusFilter)
    .filter((cat) => cat.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCategories = filteredCategories.slice(indexOfFirstItem, indexOfLastItem);

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
          <Link href="/admin/add_category" className={styles.addProductBtn}>
            <FontAwesomeIcon icon={faPlus} />
          </Link>
        </div>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.productTable}><thead className={styles.productTableThead}><tr><th>Tên Danh Mục</th><th>Trạng Thái</th><th>Hành Động</th></tr></thead><tbody>{currentCategories.length === 0 ? (<tr><td colSpan={4} className={styles.emptyState}><h3>Không có danh mục</h3><p>Vui lòng thêm danh mục mới hoặc điều chỉnh bộ lọc/tìm kiếm.</p></td></tr>) : (currentCategories.map((category) => (<tr key={category._id} className={styles.productRow}><td>{editingCategory?._id === category._id ? (<input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, name: e.target.value })
                  }
                  className={styles.searchInput}
                  aria-label="Chỉnh sửa tên danh mục"
                />) : (category.name)}</td><td>{category.status === "show" ? "Hiển thị" : "Ẩn"}</td><td className={styles.actionButtons}>{editingCategory?._id === category._id ? (<><button
                    className={styles.editBtn}
                    onClick={() => handleUpdate(category._id, editingCategory.name)}
                    title="Lưu"
                    aria-label="Lưu thay đổi danh mục"
                  ><FontAwesomeIcon icon={faCheck} /></button><button
                    className={styles.toggleStatusBtn}
                    onClick={() => setEditingCategory(null)}
                    title="Hủy"
                    aria-label="Hủy chỉnh sửa danh mục"
                  ><FontAwesomeIcon icon={faTimes} /></button></>) : (<><button
                    className={styles.editBtn}
                    onClick={() => handleEdit(category._id)}
                    title="Chỉnh sửa"
                    aria-label="Chỉnh sửa danh mục"
                  ><FontAwesomeIcon icon={faEdit} /></button><button
                    className={styles.toggleStatusBtn}
                    onClick={() => handleToggleVisibility(category._id)}
                    title={category.status === "show" ? "Ẩn danh mục" : "Hiển thị danh mục"}
                    aria-label={category.status === "show" ? "Ẩn danh mục" : "Hiển thị danh mục"}
                  ><FontAwesomeIcon icon={category.status === "show" ? faEyeSlash : faEye} /></button></>)}</td></tr>)))}</tbody></table>
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
                    >1</button>
                    <div
                      className={styles.ellipsis}
                      onClick={() => handlePageChange(Math.max(1, currentPage - 3))}
                      title="Trang trước đó"
                    >...</div>
                  </>
                )}
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    className={`${styles.pageLink} ${currentPage === page ? styles.pageLinkActive : ""}`}
                    onClick={() => handlePageChange(page)}
                    disabled={loading}
                    title={`Trang ${page}`}
                  >{page}</button>
                ))}
                {showNextEllipsis && (
                  <>
                    <div
                      className={styles.ellipsis}
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 3))}
                      title="Trang tiếp theo"
                    >...</div>
                    <button
                      className={`${styles.pageLink} ${styles.firstLastPage}`}
                      onClick={() => handlePageChange(totalPages)}
                      disabled={loading}
                      title="Trang cuối cùng"
                    >{totalPages}</button>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}
      {showConfirmPopup && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Xác nhận</h2>
            <p>
              Bạn có chắc chắn muốn {showConfirmPopup.action} danh mục "{showConfirmPopup.name}" không?
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
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Cảnh báo</h2>
            <p>
              Không thể ẩn danh mục "<b>{showStockWarning}</b>" vì vẫn còn sản phẩm có tồn kho!
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
    </div>
  );
}