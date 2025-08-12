"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./customer.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash, faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";
import ToastNotification from "../../user/ToastNotification/ToastNotification";

interface Customer {
  _id: string;
  username: string;
  phone: string;
  email: string;
  address: string;
  birthday: string | null;
  listOrder: any[];
  status: string;
  role: string;
  createdAt: string;
}

interface Notification {
  show: boolean;
  message: string;
  type: "success" | "error";
}

export default function Customer() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmUpdateModalOpen, setIsConfirmUpdateModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification>({ show: false, message: "", type: "success" });
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"user" | "admin">("user");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const customersPerPage = 9;
  const router = useRouter();

  // Debounce search input
  const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Check admin privileges
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

  // Fetch customers
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No token found");
        }

        const res = await fetch("https://api-zeal.onrender.com/api/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (res.status === 401 || res.status === 403) {
          throw new Error("Phiên đăng nhập hết hạn");
        }

        if (!res.ok) {
          throw new Error("Lỗi khi tải dữ liệu khách hàng");
        }

        const data = await res.json();
        setCustomers(data);
        setFilteredCustomers(
          data.filter(
            (customer: Customer) =>
              customer.role === roleFilter &&
              (statusFilter === "all" || customer.status === statusFilter) &&
              (customer.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                customer.phone.includes(searchQuery) ||
                customer.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
                customer.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                new Date(customer.createdAt).toLocaleDateString("vi-VN").includes(searchQuery.toLowerCase()))
          )
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message === "Phiên đăng nhập hết hạn"
              ? "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!"
              : err.message || "Lỗi khi tải dữ liệu khách hàng!"
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

    fetchCustomers();
  }, [isAuthorized, router]);

  // Handle search, role, and status filter
  const filterCustomers = useCallback(
    (query: string, role: "user" | "admin", status: "all" | "active" | "inactive") => {
      const filtered = customers.filter(
        (customer) =>
          customer.role === role &&
          (status === "all" || customer.status === status) &&
          (customer.username.toLowerCase().includes(query.toLowerCase()) ||
            customer.email.toLowerCase().includes(query.toLowerCase()) ||
            customer.phone.includes(query) ||
            customer.status.toLowerCase().includes(query.toLowerCase()) ||
            customer.address.toLowerCase().includes(query.toLowerCase()) ||
            new Date(customer.createdAt).toLocaleDateString("vi-VN").includes(query.toLowerCase()))
      );
      setFilteredCustomers(filtered);
      setCurrentPage(1);
    },
    [customers]
  );

  const debouncedFilter = useMemo(
    () => debounce((query: string, role: "user" | "admin", status: "all" | "active" | "inactive") => {
      filterCustomers(query, role, status);
    }, 300),
    [filterCustomers]
  );

  useEffect(() => {
    debouncedFilter(searchQuery, roleFilter, statusFilter);
  }, [searchQuery, roleFilter, statusFilter, debouncedFilter]);

  // Toggle role filter
  const toggleRoleFilter = () => {
    setRoleFilter((prev) => (prev === "user" ? "admin" : "user"));
  };

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);
  const indexOfLastCustomer = currentPage * customersPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstCustomer, indexOfLastCustomer);

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

  // Edit customer
  const openModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  // Confirm update
  const confirmUpdate = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsModalOpen(false);
    setIsConfirmUpdateModalOpen(true);
  };

  // Update customer info
  const updateCustomerInfo = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!selectedCustomer) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found");
      }

      const res = await fetch(
        `https://api-zeal.onrender.com/api/users/update/${selectedCustomer._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: selectedCustomer.status,
            role: selectedCustomer.role,
          }),
        }
      );

      if (res.status === 401 || res.status === 403) {
        throw new Error("Phiên đăng nhập hết hạn");
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Cập nhật thất bại");
      }

      const updatedCustomer = await res.json();
      setCustomers((prev) =>
        prev.map((c) => (c._id === updatedCustomer._id ? updatedCustomer : c))
      );
      setFilteredCustomers((prev) =>
        prev.map((c) => (c._id === updatedCustomer._id ? updatedCustomer : c))
      );
      setIsConfirmUpdateModalOpen(false);
      setSelectedCustomer(null);
      setNotification({
        show: true,
        message: "Cập nhật thông tin khách hàng thành công!",
        type: "success",
      });
      setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message === "Phiên đăng nhập hết hạn"
            ? "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!"
            : err.message || "Có lỗi xảy ra khi cập nhật!"
          : "Đã xảy ra lỗi không xác định";
      setNotification({ show: true, message: errorMessage, type: "error" });
      setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
      if (err instanceof Error && err.message === "Phiên đăng nhập hết hạn") {
        localStorage.clear();
        setTimeout(() => router.push("/user/login"), 3000);
      }
    }
  };

  // Confirm delete
  const confirmDelete = (id: string) => {
    setDeleteCustomerId(id);
    setIsConfirmDeleteModalOpen(true);
  };

  // Delete customer
  const deleteCustomer = async () => {
    if (!deleteCustomerId) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found");
      }

      const res = await fetch(`https://api-zeal.onrender.com/api/users/${deleteCustomerId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error("Phiên đăng nhập hết hạn");
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Xóa thất bại");
      }

      setCustomers((prev) => prev.filter((c) => c._id !== deleteCustomerId));
      setFilteredCustomers((prev) => prev.filter((c) => c._id !== deleteCustomerId));
      setIsConfirmDeleteModalOpen(false);
      setDeleteCustomerId(null);
      setNotification({
        show: true,
        message: "Xóa khách hàng/quản trị viên thành công!",
        type: "success",
      });
      setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
      setCurrentPage(1);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message === "Phiên đăng nhập hết hạn"
            ? "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!"
            : err.message || "Có lỗi xảy ra khi xóa!"
          : "Đã xảy ra lỗi không xác định";
      setNotification({ show: true, message: errorMessage, type: "error" });
      setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
      if (err instanceof Error && err.message === "Phiên đăng nhập hết hạn") {
        localStorage.clear();
        setTimeout(() => router.push("/user/login"), 3000);
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.productManagementContainer}>
        <div className={styles.errorContainer}>
          <div className={styles.processingIndicator}>
            <FontAwesomeIcon icon={faCheck} spin />
            <p>Đang tải dữ liệu khách hàng...</p>
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
        <h1>{roleFilter === "user" ? "QUẢN LÝ KHÁCH HÀNG" : "QUẢN LÝ QUẢN TRỊ VIÊN"}</h1>
        <div className={styles.filterContainer}>
          <input
            type="text"
            placeholder={`Tìm kiếm ${roleFilter === "user" ? "khách hàng" : "quản trị viên"} theo tên, email, số điện thoại, địa chỉ...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            aria-label={`Tìm kiếm ${roleFilter === "user" ? "khách hàng" : "quản trị viên"}`}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className={styles.categorySelect}
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Khóa tài khoản</option>
          </select>
          <button
            type="button"
            onClick={toggleRoleFilter}
            className={styles.toggleRoleBtn}
            aria-label={`Chuyển sang xem ${roleFilter === "user" ? "quản trị viên" : "khách hàng"}`}
          >
            {roleFilter === "user" ? "Xem Quản Trị Viên" : "Xem Khách Hàng"}
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.productTable}>
          <thead className={styles.productTableThead}>
            <tr>
              <th>STT</th>
              <th>Tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Trạng thái</th>
              <th>Vai trò</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {currentCustomers.length > 0 ? (
              currentCustomers.map((customer, index) => (
                <tr key={customer._id} className={styles.productRow}>
                  <td>{indexOfFirstCustomer + index + 1}</td>
                  <td>{customer.username}</td>
                  <td>{customer.email}</td>
                  <td>{customer.phone}</td>
                  <td>
                    <span
                      className={
                        customer.status === "active" ? styles.statusActive : styles.statusInactive
                      }
                    >
                      {customer.status === "active" ? "Hoạt động" : "Khóa tài khoản"}
                    </span>
                  </td>
                  <td>{customer.role === "user" ? "Khách hàng" : "Quản trị viên"}</td>
                  <td>{new Date(customer.createdAt).toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" })}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => openModal(customer)}
                        title="Sửa thông tin"
                        aria-label={`Sửa thông tin ${customer.username}`}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => confirmDelete(customer._id)}
                        title="Xóa khách hàng"
                        aria-label={`Xóa ${customer.username}`}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  <h3>Không có {roleFilter === "user" ? "khách hàng" : "quản trị viên"}</h3>
                  <p>Chưa có {roleFilter === "user" ? "khách hàng" : "quản trị viên"} nào phù hợp với bộ lọc.</p>
                </td>
              </tr>
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
                      type="button"
                      className={`${styles.pageLink} ${styles.firstLastPage}`}
                      onClick={() => handlePageChange(1)}
                      title="Trang đầu tiên"
                      aria-label="Trang đầu tiên"
                    >
                      1
                    </button>
                    <div
                      className={styles.ellipsis}
                      onClick={() => handlePageChange(Math.max(1, currentPage - 3))}
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
                    type="button"
                    key={page}
                    className={`${styles.pageLink} ${
                      currentPage === page ? styles.pageLinkActive : ""
                    }`}
                    onClick={() => handlePageChange(page)}
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
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 3))}
                      title="Trang tiếp theo"
                      role="button"
                      aria-label="Trang tiếp theo"
                    >
                      ...
                    </div>
                    <button
                      type="button"
                      className={`${styles.pageLink} ${styles.firstLastPage}`}
                      onClick={() => handlePageChange(totalPages)}
                      title="Trang cuối cùng"
                      aria-label="Trang cuối cùng"
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

      {isModalOpen && selectedCustomer && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button
              className={styles.closePopupBtn}
              onClick={() => setIsModalOpen(false)}
              title="Đóng"
              aria-label="Đóng form chỉnh sửa"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2 className={styles.modalContentTitle}>
              Chỉnh sửa thông tin {roleFilter === "user" ? "khách hàng" : "quản trị viên"}
            </h2>
            <form>
              <div className={styles.formGroup}>
                <label>Trạng thái:</label>
                <select
                  value={selectedCustomer.status}
                  onChange={(e) =>
                    setSelectedCustomer({ ...selectedCustomer, status: e.target.value })
                  }
                  className={styles.categorySelect}
                  aria-label="Trạng thái khách hàng"
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Khóa tài khoản</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Vai trò:</label>
                <select
                  value={selectedCustomer.role}
                  onChange={(e) =>
                    setSelectedCustomer({ ...selectedCustomer, role: e.target.value })
                  }
                  className={styles.categorySelect}
                  aria-label="Vai trò khách hàng"
                >
                  <option value="user">Khách hàng</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.confirmBtn}
                  onClick={confirmUpdate}
                  title="Lưu"
                  aria-label="Lưu thông tin khách hàng"
                >
                  <FontAwesomeIcon icon={faEdit} />
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsModalOpen(false)}
                  title="Hủy"
                  aria-label="Hủy chỉnh sửa"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConfirmUpdateModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button
              className={styles.closePopupBtn}
              onClick={() => {
                setIsConfirmUpdateModalOpen(false);
                setIsModalOpen(true);
              }}
              title="Đóng"
              aria-label="Đóng xác nhận cập nhật"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2 className={styles.modalContentTitle}>Xác Nhận Cập Nhật</h2>
            <div className={styles.popupDetails}>
              <p>Bạn có chắc muốn cập nhật thông tin {roleFilter === "user" ? "khách hàng" : "quản trị viên"} này?</p>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.confirmBtn}
                  onClick={updateCustomerInfo}
                  title="Xác nhận cập nhật"
                  aria-label="Xác nhận cập nhật thông tin"
                >
                  <FontAwesomeIcon icon={faCheck} />
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => {
                    setIsConfirmUpdateModalOpen(false);
                    setIsModalOpen(true);
                  }}
                  title="Hủy"
                  aria-label="Hủy cập nhật"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isConfirmDeleteModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button
              className={styles.closePopupBtn}
              onClick={() => {
                setIsConfirmDeleteModalOpen(false);
                setDeleteCustomerId(null);
              }}
              title="Đóng"
              aria-label="Đóng xác nhận xóa"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2 className={styles.modalContentTitle}>Xác Nhận Xóa</h2>
            <div className={styles.popupDetails}>
              <p>Bạn có chắc muốn xóa {roleFilter === "user" ? "khách hàng" : "quản trị viên"} này?</p>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.confirmBtn}
                  onClick={deleteCustomer}
                  title="Xác nhận xóa"
                  aria-label="Xác nhận xóa khách hàng"
                >
                  <FontAwesomeIcon icon={faCheck} />
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => {
                    setIsConfirmDeleteModalOpen(false);
                    setDeleteCustomerId(null);
                  }}
                  title="Hủy"
                  aria-label="Hủy xóa khách hàng"
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