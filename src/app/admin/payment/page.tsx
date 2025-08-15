"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./PaymentHistoryPage.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import ToastNotification from "../../user/ToastNotification/ToastNotification";

interface Payment {
  paymentCode: string;
  amount: number;
  transactionDate: string | null;
  bankUserName: string;
  description: string;
  status: "pending" | "success" | "expired";
  orderId: string;
}

const API_BASE_URL = "https://api-zeal.onrender.com";

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "success" | "expired">("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });
  const paymentsPerPage = 9;
  const router = useRouter();

  const statusMapping: { [key: string]: string } = {
    pending: "Chờ xử lý",
    success: "Thành công",
    expired: "Hết hạn",
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString || dateString.trim() === "") return "Chưa có";
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    console.warn("Invalid date from API:", dateString);
    return "Ngày không hợp lệ";
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
  };

  const getUserIdFromToken = (token: string | null): string | null => {
    if (!token) return null;
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const decoded = JSON.parse(jsonPayload);
      return decoded.id || decoded.sub || null;
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  };

  // Kiểm tra quyền admin
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      showNotification("Vui lòng đăng nhập với quyền admin!", "error");
      localStorage.clear();
      setTimeout(() => router.push("/user/login"), 1000);
      return;
    }
  }, [router]);

  // Lấy danh sách thanh toán
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");

        if (!token) {
          showNotification("Không tìm thấy token, vui lòng đăng nhập lại!", "error");
          setTimeout(() => router.push("/user/login"), 1000);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/payments/get-payments`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({}), // Lấy tất cả thanh toán
          cache: "no-store",
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `API Error: ${res.status}`);
        }

        const data = await res.json();
        if (!Array.isArray(data.data)) {
          throw new Error("Dữ liệu từ API không phải là mảng");
        }

        const validPayments = data.data.filter(
          (payment: Payment) =>
            payment.paymentCode &&
            payment.status &&
            payment.orderId &&
            ["pending", "success", "expired"].includes(payment.status)
        );
        setPayments(validPayments);
        setFilteredPayments(validPayments);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
        console.error("Lỗi khi lấy lịch sử thanh toán:", errorMessage);
        setError(`Không thể tải lịch sử thanh toán: ${errorMessage}`);
        showNotification(`Không thể tải lịch sử thanh toán: ${errorMessage}`, "error");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [router]);

  const filterPayments = useCallback(
    (query: string, status: "all" | "pending" | "success" | "expired") => {
      const filtered = payments.filter((payment) => {
        const searchLower = query.toLowerCase().trim();
        const paymentCode = payment.paymentCode?.toLowerCase() || "";
        const bankUserName = payment.bankUserName?.toLowerCase() || "";
        const orderId = payment.orderId?.toLowerCase() || "";
        const description = payment.description?.toLowerCase() || "";
        return (
          (status === "all" || payment.status === status) &&
          (paymentCode.includes(searchLower) ||
            bankUserName.includes(searchLower) ||
            orderId.includes(searchLower) ||
            description.includes(searchLower))
        );
      });
      setFilteredPayments(filtered);
      setCurrentPage(1);
    },
    [payments]
  );

  const debouncedFilter = useMemo(
    () =>
      (function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
        let timeout: NodeJS.Timeout;
        return (...args: Parameters<T>): void => {
          clearTimeout(timeout);
          timeout = setTimeout(() => func(...args), wait);
        };
      })(filterPayments, 300),
    [filterPayments]
  );

  useEffect(() => {
    debouncedFilter(searchQuery, statusFilter);
  }, [searchQuery, statusFilter, debouncedFilter]);

  const handlePaymentClick = (payment: Payment, e: React.MouseEvent) => {
    setSelectedPayment(payment);
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedPayment(null);
  };

  const totalPages = Math.ceil(filteredPayments.length / paymentsPerPage);
  const indexOfFirstPayment = (currentPage - 1) * paymentsPerPage;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (error) {
    return (
      <div className={styles.productManagementContainer}>
        <div className={styles.errorContainer}>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={styles.confirmBtn}
            aria-label="Thử lại"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.productManagementContainer}>
        <div className={styles.errorContainer}>
          <div className={styles.processingIndicator}>
            <FontAwesomeIcon icon={faChevronRight} spin />
            <p>Đang tải dữ liệu thanh toán...</p>
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
        <h1>LỊCH SỬ THANH TOÁN</h1>
        <div className={styles.filterContainer}>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã thanh toán, tên người chuyển, ID đơn hàng hoặc nội dung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            aria-label="Tìm kiếm thanh toán"
          />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "pending" | "success" | "expired")
            }
            className={styles.categorySelect}
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="success">Thành công</option>
            <option value="expired">Hết hạn</option>
          </select>
        </div>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.productTable}>
          <thead className={styles.productTableThead}>
            <tr>
              <th>STT</th>
              <th>Mã Thanh Toán</th>
              <th>Số Tiền</th>
              <th>Ngày Giao Dịch</th>
              <th>Tên Người Chuyển</th>
              <th>Nội Dung</th>
              <th>Trạng Thái</th>
              <th>ID Đơn Hàng</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  <h3>
                    {searchQuery || statusFilter !== "all"
                      ? "Không tìm thấy thanh toán"
                      : "Chưa có thanh toán"}
                  </h3>
                  <p>
                    {searchQuery || statusFilter !== "all"
                      ? "Không có thanh toán nào khớp với bộ lọc."
                      : "Hiện tại không có thanh toán nào để hiển thị."}
                  </p>
                </td>
              </tr>
            ) : (
              filteredPayments
                .slice(indexOfFirstPayment, indexOfFirstPayment + paymentsPerPage)
                .map((payment, index) => (
                  <tr
                    key={payment.paymentCode}
                    className={styles.productRow}
                    onClick={(e) => handlePaymentClick(payment, e)}
                  >
                    <td>{indexOfFirstPayment + index + 1}</td>
                    <td>{payment.paymentCode}</td>
                    <td>{payment.amount.toLocaleString("vi-VN")} VND</td>
                    <td>{formatDate(payment.transactionDate)}</td>
                    <td>{payment.bankUserName || "Không xác định"}</td>
                    <td className={styles.descriptionCell}>{payment.description || "N/A"}</td>
                    <td>
                      <span
                        className={
                          payment.status === "success"
                            ? styles.statusActive
                            : payment.status === "pending"
                            ? styles.statusPending
                            : styles.statusInactive
                        }
                      >
                        {statusMapping[payment.status] || payment.status}
                      </span>
                    </td>
                    <td>{payment.orderId ? payment.orderId.slice(0, 8) : "N/A"}</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className={styles.pagination}>
            {(() => {
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

              return (
                <>
                  <button
                    className={styles.pageLink}
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    title="Trang trước"
                  >
                    &lt;
                  </button>
                  {showPrevEllipsis && (
                    <>
                      <button
                        className={`${styles.pageLink} ${styles.firstLastPage}`}
                        onClick={() => goToPage(1)}
                        disabled={loading}
                        title="Trang đầu tiên"
                      >
                        1
                      </button>
                      <div
                        className={styles.ellipsis}
                        onClick={() => goToPage(Math.max(1, currentPage - 3))}
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
                      onClick={() => goToPage(page)}
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
                        onClick={() => goToPage(Math.min(totalPages, currentPage + 3))}
                        title="Trang tiếp theo"
                      >
                        ...
                      </div>
                      <button
                        className={`${styles.pageLink} ${styles.firstLastPage}`}
                        onClick={() => goToPage(totalPages)}
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
      </div>
      {showPopup && selectedPayment && (
        <div className={styles.modalOverlay} onClick={closePopup}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.closePopupBtn}
              onClick={closePopup}
              title="Đóng"
              aria-label="Đóng chi tiết thanh toán"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2>Chi Tiết Thanh Toán</h2>
            <dl className={styles.detailList}>
              <div className={styles.detailItem}>
                <dt>Mã Thanh Toán</dt>
                <dd>{selectedPayment.paymentCode}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>ID Đơn Hàng</dt>
                <dd>{selectedPayment.orderId ? selectedPayment.orderId.slice(0, 5) : "N/A"}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Ngày Giao Dịch</dt>
                <dd>{formatDate(selectedPayment.transactionDate)}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Số Tiền</dt>
                <dd className={styles.amount}>{selectedPayment.amount.toLocaleString()} VND</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Tên Người Chuyển</dt>
                <dd>{selectedPayment.bankUserName}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Nội Dung</dt>
                <dd className={styles.description}>{selectedPayment.description}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Trạng Thái</dt>
                <dd>
                  <span
                    className={
                      selectedPayment.status === "success"
                        ? styles.statusActive
                        : selectedPayment.status === "pending"
                        ? styles.statusPending
                        : styles.statusInactive
                    }
                  >
                    {statusMapping[selectedPayment.status] || selectedPayment.status}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}