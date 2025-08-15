"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import styles from "./coupon.module.css";
import type { Coupon } from "@/app/components/coupon_interface";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrash,
  faPlus,
  faTimes,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import ToastNotification from "../../user/ToastNotification/ToastNotification";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type FormData = Omit<Coupon, "_id" | "usedCount"> & { _id?: string; usedCount?: number };

interface Notification {
  show: boolean;
  message: string;
  type: "success" | "error";
}

// Component client-side sử dụng useSearchParams (nếu có)
function CouponsContent() {
  const searchParams = useSearchParams();
  const searchQueryFromUrl = searchParams.get("search") || ""; // Ví dụ: lấy tham số search từ URL
  const statusFilterFromUrl = (searchParams.get("status") as "all" | "active" | "inactive") || "all";

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification>({ show: false, message: "", type: "success" });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 1,
  });
  const [searchQuery, setSearchQuery] = useState(searchQueryFromUrl);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(statusFilterFromUrl);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCouponId, setDeleteCouponId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    code: "",
    discountType: "percentage",
    discountValue: 0,
    minOrderValue: 0,
    expiryDate: "",
    usageLimit: null,
    isActive: true,
    usedCount: 0,
  });
  const router = useRouter();

  // Check authorization
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      setNotification({
        show: true,
        message: "Bạn không có quyền truy cập. Vui lòng đăng nhập với tài khoản admin.",
        type: "error",
      });
      setTimeout(() => router.push("/user/login"), 3000);
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  // Fetch coupons
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchCoupons = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No token found");
        }

        const queryParams = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
          ...(searchQuery && { code: searchQuery }),
          ...(statusFilter !== "all" && { isActive: statusFilter === "active" ? "true" : "false" }),
        });

        const response = await fetch(
          `https://api-zeal.onrender.com/api/coupons?${queryParams}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            next: { revalidate: 3600 }, // Sửa từ cache: "no-store" sang ISR
          }
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error("Phiên đăng nhập hết hạn");
          }
          throw new Error("Failed to fetch coupons");
        }

        const data = await response.json();
        console.log("API Response:", data);
        // Log coupons with missing usedCount
        data.coupons.forEach((coupon: Coupon, index: number) => {
          if (coupon.usedCount === null || coupon.usedCount === undefined) {
            console.warn(`Coupon ${coupon.code} (index ${index}) has missing or undefined usedCount`);
          }
        });
        setCoupons(data.coupons || []);
        setFilteredCoupons(data.coupons || []);
        setPagination(data.pagination || pagination);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message === "Phiên đăng nhập hết hạn"
              ? "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!"
              : "Lỗi khi tải dữ liệu khuyến mãi!"
            : "Đã xảy ra lỗi không xác định";
        setNotification({ show: true, message: errorMessage, type: "error" });
        setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
        if (err instanceof Error && err.message === "Phiên đăng nhập hết hạn") {
          localStorage.clear();
          setTimeout(() => router.push("/user/login"), 3000);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, [isAuthorized, pagination.page, pagination.limit, searchQuery, statusFilter]);

  // Handle client-side filtering
  useEffect(() => {
    let filtered = coupons;

    if (searchQuery) {
      filtered = filtered.filter((coupon) =>
        coupon.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((coupon) =>
        statusFilter === "active" ? coupon.isActive : !coupon.isActive
      );
    }

    setFilteredCoupons(filtered);
    setPagination((prev) => ({
      ...prev,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / prev.limit),
      page: 1,
    }));
  }, [coupons, searchQuery, statusFilter]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found");
      }

      const url = formData._id
        ? `https://api-zeal.onrender.com/api/coupons/${formData._id}`
        : `https://api-zeal.onrender.com/api/coupons`;
      const method = formData._id ? "PUT" : "POST";

      const bodyData = formData._id
        ? {
            discountType: formData.discountType,
            discountValue: formData.discountValue,
            minOrderValue: formData.minOrderValue,
            expiryDate: formData.expiryDate || undefined,
            usageLimit: formData.usageLimit || null,
            isActive: formData.isActive,
            usedCount: formData.usedCount ?? 0,
          }
        : {
            ...formData,
            expiryDate: formData.expiryDate || undefined,
            usageLimit: formData.usageLimit || null,
            usedCount: 0,
          };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
        cache: "no-store", // Giữ no-store vì đây là thao tác tạo/cập nhật
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Lỗi khi lưu mã giảm giá!");
      }

      setShowModal(false);
      setFormData({
        code: "",
        discountType: "percentage",
        discountValue: 0,
        minOrderValue: 0,
        expiryDate: "",
        usageLimit: null,
        isActive: true,
        usedCount: 0,
      });
      setNotification({
        show: true,
        message: formData._id ? "Cập nhật mã giảm giá thành công!" : "Thêm mã giảm giá thành công!",
        type: "success",
      });
      setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
      setPagination((prev) => ({ ...prev, page: 1 }));
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message === "Phiên đăng nhập hết hạn"
            ? "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!"
            : err.message || "Lỗi khi lưu mã giảm giá!"
          : "Đã xảy ra lỗi không xác định";
      setNotification({ show: true, message: errorMessage, type: "error" });
      setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
      if (err instanceof Error && err.message === "Phiên đăng nhập hết hạn") {
        localStorage.clear();
        setTimeout(() => router.push("/user/login"), 3000);
      }
    }
  };

  // Edit coupon
  const handleEdit = (coupon: Coupon) => {
    setFormData({
      _id: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderValue: coupon.minOrderValue,
      expiryDate: coupon.expiryDate
        ? new Date(coupon.expiryDate).toISOString().split("T")[0]
        : "",
      usageLimit: coupon.usageLimit,
      isActive: coupon.isActive,
      usedCount: coupon.usedCount ?? 0,
    });
    setShowModal(true);
  };

  // Confirm delete coupon
  const confirmDelete = (id: string) => {
    setDeleteCouponId(id);
    setShowDeleteModal(true);
  };

  // Handle delete coupon
  const handleDelete = async () => {
    if (!deleteCouponId) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found");
      }

      const response = await fetch(`https://api-zeal.onrender.com/api/coupons/${deleteCouponId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store", // Giữ no-store vì đây là thao tác xóa
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Lỗi khi xóa mã giảm giá!");
      }

      setShowDeleteModal(false);
      setDeleteCouponId(null);
      setNotification({ show: true, message: "Xóa mã giảm giá thành công!", type: "success" });
      setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
      setPagination((prev) => ({ ...prev, page: 1 }));
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message === "Phiên đăng nhập hết hạn"
            ? "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!"
            : err.message || "Lỗi khi xóa mã giảm giá!"
          : "Đã xảy ra lỗi không xác định";
      setNotification({ show: true, message: errorMessage, type: "error" });
      setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
      if (err instanceof Error && err.message === "Phiên đăng nhập hết hạn") {
        localStorage.clear();
        setTimeout(() => router.push("/user/login"), 3000);
      }
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  // Pagination info
  const getPaginationInfo = () => {
    const visiblePages: number[] = [];
    let showPrevEllipsis = false;
    let showNextEllipsis = false;

    if (pagination.totalPages <= 3) {
      for (let i = 1; i <= pagination.totalPages; i++) {
        visiblePages.push(i);
      }
    } else {
      if (pagination.page === 1) {
        visiblePages.push(1, 2, 3);
        showNextEllipsis = pagination.totalPages > 3;
      } else if (pagination.page === pagination.totalPages) {
        visiblePages.push(pagination.totalPages - 2, pagination.totalPages - 1, pagination.totalPages);
        showPrevEllipsis = pagination.totalPages > 3;
      } else {
        visiblePages.push(pagination.page - 1, pagination.page, pagination.page + 1);
        showPrevEllipsis = pagination.page > 2;
        showNextEllipsis = pagination.page < pagination.totalPages - 1;
      }
    }

    return { visiblePages, showPrevEllipsis, showNextEllipsis };
  };

  if (loading) {
    return (
      <div className={styles.productManagementContainer}>
        <div className={styles.errorContainer}>
          <div className={styles.processingIndicator}>
            <FontAwesomeIcon icon={faCheck} spin />
            <p>Đang tải mã giảm giá...</p>
          </div>
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
        <h1>QUẢN LÝ MÃ GIẢM GIÁ</h1>
        <div className={styles.filterContainer}>
          <input
            type="text"
            placeholder="Tìm kiếm mã giảm giá theo mã..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            aria-label="Tìm kiếm mã giảm giá"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className={styles.categorySelect}
            aria-label="Lọc theo trạng thái mã giảm giá"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </select>
          <button
            className={styles.addProductBtn}
            onClick={() => setShowModal(true)}
            aria-label="Thêm mã giảm giá mới"
          >
            Thêm mã giảm giá
          </button>
        </div>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.productTable}>
          <thead className={styles.productTableThead}>
            <tr>
              <th>STT</th>
              <th>Mã giảm giá</th>
              <th>Loại giảm giá</th>
              <th>Giá trị giảm</th>
              <th>Đơn hàng tối thiểu</th>
              <th>Ngày hết hạn</th>
              <th>Số lượt sử dụng</th>
              <th>Số lượt đã dùng</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredCoupons.length > 0 ? (
              filteredCoupons
                .slice(
                  (pagination.page - 1) * pagination.limit,
                  pagination.page * pagination.limit
                )
                .map((coupon, index) => (
                  <tr key={coupon._id} className={styles.productRow}>
                    <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                    <td>{coupon.code}</td>
                    <td>{coupon.discountType === "percentage" ? "Phần trăm" : "Cố định"}</td>
                    <td>
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}%`
                        : `${coupon.discountValue.toLocaleString()} VNĐ`}
                    </td>
                    <td>{(coupon.minOrderValue || 0).toLocaleString()} VNĐ</td>
                    <td>
                      {coupon.expiryDate
                        ? new Date(coupon.expiryDate).toLocaleDateString("vi-VN")
                        : "Không có"}
                    </td>
                    <td>{coupon.usageLimit ?? "Không giới hạn"}</td>
                    <td>{coupon.usedCount ?? 0}</td>
                    <td>
                      <span
                        className={
                          coupon.isActive ? styles.statusActive : styles.statusInactive
                        }
                      >
                        {coupon.isActive ? "Hoạt động" : "Không hoạt động"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.editBtn}
                          onClick={() => handleEdit(coupon)}
                          title="Sửa mã giảm giá"
                          aria-label={`Sửa mã giảm giá ${coupon.code}`}
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan={10} className={styles.emptyState}>
                  <h3>Không có mã giảm giá</h3>
                  <p>Chưa có mã giảm giá nào phù hợp với bộ lọc.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pagination.totalPages > 1 && (
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
                      aria-label="Trang đầu tiên"
                    >
                      1
                    </button>
                    <div
                      className={styles.ellipsis}
                      onClick={() => handlePageChange(Math.max(1, pagination.page - 3))}
                      title="Trang trước đó"
                      role="button"
                      aria-label="Trang trước đó"
                    >
                      ...
                    </div>
                  </>
                )}
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    className={`${styles.pageLink} ${
                      pagination.page === page ? styles.pageLinkActive : ""
                    }`}
                    onClick={() => handlePageChange(page)}
                    disabled={loading}
                    title={`Trang ${page}`}
                    aria-label={`Trang ${page}`}
                  >
                    {page}
                  </button>
                ))}
                {showNextEllipsis && (
                  <>
                    <div
                      className={styles.ellipsis}
                      onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 3))}
                      title="Trang tiếp theo"
                      role="button"
                      aria-label="Trang tiếp theo"
                    >
                      ...
                    </div>
                    <button
                      className={`${styles.pageLink} ${styles.firstLastPage}`}
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={loading}
                      title="Trang cuối cùng"
                      aria-label="Trang cuối cùng"
                    >
                      {pagination.totalPages}
                    </button>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button
              className={styles.closePopupBtn}
              onClick={() => {
                setShowModal(false);
                setFormData({
                  code: "",
                  discountType: "percentage",
                  discountValue: 0,
                  minOrderValue: 0,
                  expiryDate: "",
                  usageLimit: null,
                  isActive: true,
                  usedCount: 0,
                });
              }}
              title="Đóng"
              aria-label="Đóng form mã giảm giá"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2 className={styles.modalContentTitle}>
              {formData._id ? "Sửa mã giảm giá" : "Thêm mã giảm giá"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Mã giảm giá:</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className={styles.formInput}
                  required
                  disabled={!!formData._id}
                  aria-label="Mã giảm giá"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Loại giảm giá:</label>
                <select
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({ ...formData, discountType: e.target.value as "percentage" | "fixed" })
                  }
                  className={styles.categorySelect}
                  required
                  disabled={!!formData._id}
                  aria-label="Loại giảm giá"
                >
                  <option value="percentage">Phần trăm</option>
                  <option value="fixed">Cố định</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Giá trị giảm (% hoặc VNĐ):</label>
                <input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({ ...formData, discountValue: Number(e.target.value) })
                  }
                  className={styles.formInput}
                  required
                  min="0"
                  disabled={!!formData._id}
                  aria-label="Giá trị giảm"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Đơn hàng tối thiểu (VNĐ):</label>
                <input
                  type="number"
                  value={formData.minOrderValue}
                  onChange={(e) =>
                    setFormData({ ...formData, minOrderValue: Number(e.target.value) })
                  }
                  className={styles.formInput}
                  min="0"
                  aria-label="Đơn hàng tối thiểu"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Ngày hết hạn:</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expiryDate: e.target.value })
                  }
                  className={styles.formInput}
                  aria-label="Ngày hết hạn"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Số lần sử dụng:</label>
                <input
                  type="number"
                  value={formData.usageLimit ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      usageLimit: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className={styles.formInput}
                  min="0"
                  aria-label="Số lần sử dụng"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Số lượt đã dùng:</label>
                <input
                  type="number"
                  value={formData.usedCount ?? 0}
                  className={styles.formInput}
                  disabled
                  aria-label="Số lượt đã dùng"
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    aria-label="Trạng thái mã giảm giá"
                  />
                  <span>Hoạt động</span>
                </label>
              </div>
              <div className={styles.modalActions}>
                <button
                  type="submit"
                  className={styles.confirmBtn}
                  aria-label={formData._id ? "Cập nhật mã giảm giá" : "Thêm mã giảm giá"}
                >
                  <FontAwesomeIcon icon={formData._id ? faEdit : faPlus} />
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => {
                    setShowModal(false);
                    setFormData({
                      code: "",
                      discountType: "percentage",
                      discountValue: 0,
                      minOrderValue: 0,
                      expiryDate: "",
                      usageLimit: null,
                      isActive: true,
                      usedCount: 0,
                    });
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
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button
              className={styles.closePopupBtn}
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteCouponId(null);
              }}
              title="Đóng"
              aria-label="Đóng xác nhận xóa mã giảm giá"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2 className={styles.modalContentTitle}>Xác Nhận Xóa</h2>
            <div className={styles.popupDetails}>
              <p>Bạn có chắc muốn xóa mã giảm giá này?</p>
              <div className={styles.modalActions}>
                <button
                  className={styles.confirmBtn}
                  onClick={handleDelete}
                  aria-label="Xác nhận xóa mã giảm giá"
                >
                  <FontAwesomeIcon icon={faCheck} />
                </button>
                <button
                  className={styles.cancelBtn}
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteCouponId(null);
                  }}
                  aria-label="Hủy xóa mã giảm giá"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Component chính bọc trong Suspense
export default function CouponPage() {
  return (
    <Suspense fallback={<div className="loading">Đang tải...</div>}>
      <CouponsContent />
    </Suspense>
  );
}