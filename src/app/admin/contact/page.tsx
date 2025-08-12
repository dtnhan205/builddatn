"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./contactAdmin.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faChevronRight, faEye } from "@fortawesome/free-solid-svg-icons";
import ToastNotification from "../../user/ToastNotification/ToastNotification";

interface Contact {
  _id: string;
  fullName: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: "Chưa xử lý" | "Đã xử lý";
}

const API_BASE_URL = "https://api-zeal.onrender.com";

export default function ContactAdmin() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState<{
    show: boolean;
    contactId: string | null;
  }>({ show: false, contactId: null });
  const [searchName, setSearchName] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Chưa xử lý" | "Đã xử lý">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });
  const itemsPerPage = 10;
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const statusMapping: { [key: string]: string } = {
    "Chưa xử lý": "Chưa xử lý",
    "Đã xử lý": "Đã xử lý",
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
  };

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (!token || role !== "admin") {
      showNotification("Không tìm thấy token hoặc không có quyền admin.", "error");
      setTimeout(() => router.push("/user/login"), 1000);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(`${API_BASE_URL}/api/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Lỗi khi tải danh sách liên hệ: ${res.status} ${errorText}`);
        }
        const data = await res.json();
        if (!data.contacts || !Array.isArray(data.contacts)) {
          throw new Error("Dữ liệu trả về không hợp lệ từ API.");
        }
        const validContacts = data.contacts.filter(
          (contact: Contact) => contact._id && contact.fullName && contact.email
        );
        setContacts(validContacts);
        setFilteredContacts(validContacts);
      } catch (error: any) {
        console.error("Fetch error:", error.message);
        setError(error.message || "Không thể tải dữ liệu.");
        showNotification(`Lỗi khi tải dữ liệu: ${error.message}`, "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router, token]);

  const filterContacts = useCallback(
    (query: string, status: "all" | "Chưa xử lý" | "Đã xử lý") => {
      let filtered = [...contacts];
      if (query.trim()) {
        filtered = filtered.filter((c) =>
          c.fullName.toLowerCase().includes(query.toLowerCase())
        );
      }
      if (status !== "all") {
        filtered = filtered.filter((c) => c.status === status);
      }
      setFilteredContacts(filtered);
      setCurrentPage(1);
    },
    [contacts]
  );

  const debouncedFilter = useMemo(
    () =>
      (function debounce<T extends (...args: any[]) => void>(
        func: T,
        wait: number
      ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => func(...args), wait);
        };
      })(filterContacts, 300),
    [filterContacts]
  );

  useEffect(() => {
    debouncedFilter(searchName, statusFilter);
  }, [searchName, statusFilter, debouncedFilter]);

  const handleStatusChange = (id: string, newStatus: "Chưa xử lý" | "Đã xử lý") => {
    if (newStatus === "Đã xử lý") {
      setShowConfirmPopup({ show: true, contactId: id });
    }
  };

  const confirmStatusChange = async (id: string) => {
    if (!token) {
      showNotification("Không tìm thấy token.", "error");
      router.push("/user/login");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/contacts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "Đã xử lý" }),
      });
      if (res.status === 401 || res.status === 403) {
        showNotification("Phiên đăng nhập hết hạn.", "error");
        localStorage.clear();
        router.push("/user/login");
        return;
      }
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Thay đổi trạng thái thất bại: ${errorText}`);
      }
      setContacts((prev) =>
        prev.map((c) => (c._id === id ? { ...c, status: "Đã xử lý" } : c))
      );
      setFilteredContacts((prev) =>
        prev.map((c) => (c._id === id ? { ...c, status: "Đã xử lý" } : c))
      );
      showNotification("Đã cập nhật trạng thái thành Đã xử lý!", "success");
    } catch (error: any) {
      showNotification(`Lỗi khi thay đổi trạng thái: ${error.message}`, "error");
    } finally {
      setShowConfirmPopup({ show: false, contactId: null });
    }
  };

  const handleContactClick = (contact: Contact, e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).tagName === "SELECT" ||
      (e.target as HTMLElement).closest("select")
    )
      return;
    setSelectedContact(contact);
    setShowDetailsPopup(true);
  };

  const closePopup = () => {
    setShowDetailsPopup(false);
    setSelectedContact(null);
  };

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (error) {
    return (
      <div className={styles.contactManagementContainer}>
        <div className={styles.errorContainer}>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={styles.confirmBtn}
            aria-label="Thử lại"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.contactManagementContainer}>
        <div className={styles.errorContainer}>
          <div className={styles.processingIndicator}>
            <FontAwesomeIcon icon={faChevronRight} spin />
            <p>Đang tải dữ liệu liên hệ...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contactManagementContainer}>
      {notification.show && (
        <ToastNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ show: false, message: "", type: "success" })}
        />
      )}
      <div className={styles.titleContainer}>
        <h1>QUẢN LÝ LIÊN HỆ</h1>
        <div className={styles.filterContainer}>
          <input
            type="text"
            placeholder="Tìm kiếm theo họ tên..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className={styles.searchInput}
            aria-label="Tìm kiếm liên hệ"
          />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "Chưa xử lý" | "Đã xử lý")
            }
            className={styles.categorySelect}
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Chưa xử lý">Chưa xử lý</option>
            <option value="Đã xử lý">Đã xử lý</option>
          </select>
        </div>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.productTable}>
          <thead className={styles.productTableThead}>
            <tr>
              <th>STT</th>
              <th>Họ và Tên</th>
              <th>Email</th>
              <th>Số Điện Thoại</th>
              <th>Thông Điệp</th>
              <th>Trạng Thái</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  <h3>
                    {searchName || statusFilter !== "all"
                      ? "Không tìm thấy liên hệ"
                      : "Chưa có liên hệ"}
                  </h3>
                  <p>
                    {searchName || statusFilter !== "all"
                      ? "Không có liên hệ nào khớp với bộ lọc."
                      : "Hiện tại không có liên hệ nào để hiển thị."}
                  </p>
                </td>
              </tr>
            ) : (
              filteredContacts
                .slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage)
                .map((contact, index) => (
                  <tr
                    key={contact._id}
                    className={styles.productRow}
                    onClick={(e) => handleContactClick(contact, e)}
                  >
                    <td>{indexOfFirstItem + index + 1}</td>
                    <td>{contact.fullName}</td>
                    <td>{contact.email}</td>
                    <td>{contact.phone || "N/A"}</td>
                    <td className={styles.descriptionCell}>{contact.message || "N/A"}</td>
                    <td>
                      <span
                        className={
                          contact.status === "Đã xử lý"
                            ? styles.statusShow
                            : styles.statusHidden
                        }
                      >
                        {statusMapping[contact.status] || contact.status}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        value={contact.status}
                        onChange={(e) =>
                          handleStatusChange(
                            contact._id,
                            e.target.value as "Chưa xử lý" | "Đã xử lý"
                          )
                        }
                        className={styles.actionSelect}
                        disabled={contact.status === "Đã xử lý"}
                        aria-label={`Thay đổi trạng thái cho ${contact.fullName}`}
                      >
                        <option value="Chưa xử lý">Chưa xử lý</option>
                        <option value="Đã xử lý">Đã xử lý</option>
                      </select>
                    </td>
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
      {showDetailsPopup && selectedContact && (
        <div className={styles.modalOverlay} onClick={closePopup}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.closePopupBtn}
              onClick={closePopup}
              title="Đóng"
              aria-label="Đóng chi tiết liên hệ"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2>Chi Tiết Liên Hệ</h2>
            <dl className={styles.detailList}>
              <div className={styles.detailItem}>
                <dt>Họ và Tên</dt>
                <dd>{selectedContact.fullName}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Email</dt>
                <dd>{selectedContact.email}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Số Điện Thoại</dt>
                <dd>{selectedContact.phone || "N/A"}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Thông Điệp</dt>
                <dd className={styles.description}>{selectedContact.message || "N/A"}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Trạng Thái</dt>
                <dd>
                  <span
                    className={
                      selectedContact.status === "Đã xử lý"
                        ? styles.statusShow
                        : styles.statusHidden
                    }
                  >
                    {statusMapping[selectedContact.status] || selectedContact.status}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
      {showConfirmPopup.show && showConfirmPopup.contactId && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowConfirmPopup({ show: false, contactId: null })}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.closePopupBtn}
              onClick={() => setShowConfirmPopup({ show: false, contactId: null })}
              title="Đóng"
              aria-label="Đóng xác nhận"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2>Xác nhận thay đổi trạng thái</h2>
            <div className={styles.detailList}>
              <p>Bạn có chắc chắn muốn đổi trạng thái liên hệ này sang Đã xử lý?</p>
              <div className={styles.actionButtons}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setShowConfirmPopup({ show: false, contactId: null })}
                  title="Hủy"
                  aria-label="Hủy hành động"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
                <button
                  className={styles.confirmBtn}
                  onClick={() => confirmStatusChange(showConfirmPopup.contactId!)}
                  title="Xác nhận"
                  aria-label="Xác nhận hành động"
                >
                  <FontAwesomeIcon icon={faEye} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}