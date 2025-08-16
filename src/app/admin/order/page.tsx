"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import styles from "./order.module.css";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faTimes, faRedo } from "@fortawesome/free-solid-svg-icons";
import ToastNotification from "../../user/ToastNotification/ToastNotification";

interface Option {
  stock: number;
  value: string;
  price: number;
  discount_price: number | null;
  _id: string;
}

interface Product {
  _id: string;
  name: string;
  images?: string[];
  option: Option[];
}

interface Address {
  addressLine: string;
  ward: string;
  district: string;
  cityOrProvince: string;
}

interface Order {
  paymentMethod: string;
  _id: string;
  user: { _id: string; username: string; email: string } | null;
  createdAt: string;
  paymentStatus: string;
  shippingStatus: string;
  returnStatus: "none" | "requested" | "approved" | "rejected";
  returnReason?: string;
  cancelReason?: string;
  address: Address;
  total: number;
  items: { product: Product | null; optionId: string; quantity: number; images: string[] }[];
}

const API_BASE_URL = "https://api-zeal.onrender.com";
const FALLBACK_IMAGE_URL = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";

const normalizeImageUrl = (url: string): string => {
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const OrderPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<{
    orderId: string;
    newStatus: string;
    currentStatus: string;
    type: "shipping" | "return" | "cancel";
    cancelReason?: string;
  } | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>("");
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [shippingStatusFilter, setShippingStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const ordersPerPage = 9;
  const router = useRouter();

  const cancelReasons = [
    { value: "out_of_stock", label: "Hết hàng" },
    { value: "customer_cancelled", label: "Khách hủy" },
    { value: "system_error", label: "Lỗi hệ thống" },
    { value: "other", label: "Khác" },
  ];

  const paymentStatusMapping = {
    completed: "Đã thanh toán",
    pending: "Chưa thanh toán",
    failed: "Chưa thanh toán",
    cancelled: "Hoàn tiền",
  };

  const shippingStatusMapping = {
    pending: "Chờ xử lý",
    in_transit: "Đang vận chuyển",
    delivered: "Đã giao hàng",
    returned: "Hoàn hàng",
    cancelled: "Hủy đơn hàng",
  };

  const returnStatusMapping = {
    none: "Không có",
    requested: "Đã yêu cầu",
    approved: "Đã chấp nhận",
    rejected: "Đã từ chối",
  };

  const cancelReasonMapping = {
    out_of_stock: "Hết hàng",
    customer_cancelled: "Khách hủy",
    system_error: "Lỗi hệ thống",
    other: "Khác",
  };

  const reverseShippingStatusMapping = {
    "Chờ xử lý": "pending",
    "Đang vận chuyển": "in_transit",
    "Đã giao hàng": "delivered",
    "Hoàn hàng": "returned",
    "Hủy đơn hàng": "cancelled",
  };

  const reverseReturnStatusMapping = {
    "Đã chấp nhận": "approved",
    "Đã từ chối": "rejected",
  };

  const statusProgression: { [key: string]: string[] } = {
    pending: ["in_transit", "cancelled"],
    in_transit: ["delivered"],
    delivered: [],
    returned: [],
    cancelled: [],
  };

  const allStatuses = [
    { value: "all", label: "Tất cả trạng thái" },
    { value: "pending", label: "Chờ xử lý" },
    { value: "in_transit", label: "Đang vận chuyển" },
    { value: "delivered", label: "Đã giao hàng" },
    { value: "returned", label: "Hoàn hàng" },
    { value: "cancelled", label: "Hủy đơn hàng" },
  ];

  const returnStatuses = [
    { value: "approved", label: "Đã chấp nhận" },
    { value: "rejected", label: "Đã từ chối" },
  ];

  const formatAddress = (address: Address) => {
    const { addressLine, ward, district, cityOrProvince } = address;
    return [addressLine, ward, district, cityOrProvince].filter(Boolean).join(", ") || "Chưa có địa chỉ";
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
  };

  const getVietnameseCancelReason = (cancelReason: string | undefined) => {
    if (!cancelReason) return "Không có lý do";
    return cancelReasonMapping[cancelReason as keyof typeof cancelReasonMapping] || cancelReason;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "admin") {
      showNotification("Bạn cần quyền admin để truy cập trang này.", "error");
      router.push("/user/login");
    }
  }, [router]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
        }
        const res = await fetch(`${API_BASE_URL}/api/orders/admin/all`, {
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
        const data: Order[] = await res.json();
        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu đơn hàng không hợp lệ");
        }

        const normalizedOrders = data.map((order) => ({
          ...order,
          shippingStatus: ["pending", "in_transit", "delivered", "returned", "cancelled"].includes(order.shippingStatus)
            ? order.shippingStatus
            : "pending",
          returnStatus: ["none", "requested", "approved", "rejected"].includes(order.returnStatus)
            ? order.returnStatus
            : "none",
        }));

        const invalidOrders = normalizedOrders.filter((order) => !order.user);
        if (invalidOrders.length > 0) {
          console.warn("Found orders with null user:", invalidOrders);
        }
        setOrders(normalizedOrders);
        setFilteredOrders(normalizedOrders);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
        showNotification("Không thể tải danh sách đơn hàng", "error");
        setError("Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [router]);

  const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const filterOrders = useCallback(
    (query: string, shippingStatus: string) => {
      const filtered = orders.filter((order) => {
        const searchLower = query.toLowerCase();
        const username = order.user?.username?.toLowerCase() || "";
        const orderId = order._id.toLowerCase();
        const address = formatAddress(order.address).toLowerCase();
        const matchesSearch =
          username.includes(searchLower) ||
          orderId.includes(searchLower) ||
          address.includes(searchLower);
        const matchesShippingStatus = shippingStatus === "all" || order.shippingStatus === shippingStatus;
        return matchesSearch && matchesShippingStatus;
      });
      setFilteredOrders(filtered);
      setCurrentPage(1);
    },
    [orders]
  );

  const debouncedFilter = useMemo(
    () => debounce((query: string, shippingStatus: string) => {
      filterOrders(query, shippingStatus);
    }, 300),
    [filterOrders]
  );

  useEffect(() => {
    debouncedFilter(searchQuery, shippingStatusFilter);
  }, [searchQuery, shippingStatusFilter, debouncedFilter]);

  const formatDate = (dateString: string | number | Date) => {
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Ngày không hợp lệ"
      : date.toLocaleString("vi-VN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
  };

  const getVietnamesePaymentStatus = (paymentStatus: string) => {
    return paymentStatusMapping[paymentStatus as keyof typeof paymentStatusMapping] || "Chưa thanh toán";
  };

  const getVietnameseShippingStatus = (shippingStatus: string) => {
    return shippingStatusMapping[shippingStatus as keyof typeof shippingStatusMapping] || shippingStatus;
  };

  const getVietnameseReturnStatus = (returnStatus: string) => {
    return returnStatusMapping[returnStatus as keyof typeof returnStatusMapping] || returnStatus;
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: string,
    currentStatus: string,
    type: "shipping" | "return" | "cancel",
    cancelReason?: string
  ) => {
    if (type === "shipping" && ["returned", "cancelled"].includes(currentStatus)) {
      showNotification("Không thể thay đổi trạng thái đơn hàng khi đã hoàn hoặc hủy", "error");
      return;
    }

    if (type === "shipping") {
      const englishStatus =
        reverseShippingStatusMapping[newStatus as keyof typeof reverseShippingStatusMapping] || newStatus;
      if (englishStatus === "cancelled") {
        if (currentStatus !== "pending") {
          showNotification("Chỉ có thể hủy đơn hàng khi trạng thái là Chờ xử lý", "error");
          return;
        }
        setShowConfirm({ orderId, newStatus, currentStatus, type: "cancel", cancelReason: "" });
        setSelectedCancelReason("");
        setCancelReasonInput("");
      } else if (!statusProgression[currentStatus]?.includes(englishStatus)) {
        showNotification("Trạng thái không hợp lệ hoặc không thể chuyển về trạng thái trước đó", "error");
        return;
      } else {
        setShowConfirm({ orderId, newStatus, currentStatus, type });
      }
    } else if (type === "return" && currentStatus !== "requested") {
      showNotification("Chỉ có thể thay đổi trạng thái hoàn hàng khi trạng thái là Đã yêu cầu", "error");
      return;
    } else if (type === "cancel") {
      if (currentStatus !== "pending") {
        showNotification("Chỉ có thể hủy đơn hàng khi trạng thái là Chờ xử lý", "error");
        return;
      }
      setShowConfirm({ orderId, newStatus, currentStatus, type, cancelReason: "" });
      setSelectedCancelReason("");
      setCancelReasonInput("");
    } else {
      setShowConfirm({ orderId, newStatus, currentStatus, type });
    }
  };

  const confirmStatusChange = async () => {
    if (!showConfirm) return;

    const { orderId, newStatus, currentStatus, type, cancelReason } = showConfirm;
    let englishStatus: string;
    let updatePayload: { shippingStatus?: string; paymentStatus?: string; returnStatus?: string; cancelReason?: string };

    const order = orders.find((o) => o._id === orderId);
    if (!order) {
      showNotification("Không tìm thấy đơn hàng", "error");
      return;
    }

    if (type === "shipping") {
      englishStatus = reverseShippingStatusMapping[newStatus as keyof typeof reverseShippingStatusMapping] || newStatus;
      updatePayload = { shippingStatus: englishStatus };
      if (englishStatus === "delivered") {
        updatePayload.paymentStatus = "completed";
      }
    } else if (type === "cancel") {
      englishStatus = reverseShippingStatusMapping[newStatus as keyof typeof reverseShippingStatusMapping] || newStatus;
      const finalCancelReason = selectedCancelReason === "other" ? cancelReasonInput : selectedCancelReason;
      if (!finalCancelReason || finalCancelReason.trim() === "") {
        showNotification("Vui lòng chọn hoặc nhập lý do hủy đơn hàng", "error");
        return;
      }
      updatePayload = {
        shippingStatus: englishStatus,
        cancelReason: finalCancelReason,
        ...(order.paymentStatus === "completed" && { paymentStatus: "cancelled" }),
      };
    } else {
      englishStatus = reverseReturnStatusMapping[newStatus as keyof typeof reverseReturnStatusMapping] || newStatus;
      updatePayload = { returnStatus: englishStatus };
      if (englishStatus === "approved") {
        updatePayload.shippingStatus = "returned";
        updatePayload.paymentStatus = "cancelled";
      }
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/orders/update/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

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
        throw new Error(`Lỗi API: ${response.status} ${errorText}`);
      }

      const { order: updatedOrder }: { order: Order } = await response.json();
      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o._id === orderId
            ? {
                ...o,
                shippingStatus: updatedOrder.shippingStatus,
                paymentStatus: updatedOrder.paymentStatus,
                returnStatus: updatedOrder.returnStatus,
                cancelReason: updatedOrder.cancelReason,
              }
            : o
        )
      );
      setFilteredOrders((prevOrders) =>
        prevOrders.map((o) =>
          o._id === orderId
            ? {
                ...o,
                shippingStatus: updatedOrder.shippingStatus,
                paymentStatus: updatedOrder.paymentStatus,
                returnStatus: updatedOrder.returnStatus,
                cancelReason: updatedOrder.cancelReason,
              }
            : o
        )
      );
      showNotification(
        type === "shipping"
          ? "Cập nhật trạng thái vận chuyển thành công"
          : type === "cancel"
          ? "Hủy đơn hàng thành công"
          : "Cập nhật trạng thái hoàn hàng thành công",
        "success"
      );
      setCancelReasonInput("");
      setSelectedCancelReason("");
      setSelectedOrderId(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
      showNotification(`Không thể cập nhật trạng thái: ${errorMessage}`, "error");
    } finally {
      setShowConfirm(null);
      setLoading(false);
    }
  };

  const handleViewDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
  };

  const handleCloseDetails = () => {
    setSelectedOrderId(null);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setSelectedOrderId(null);
      setShowConfirm(null);
      setCancelReasonInput("");
      setSelectedCancelReason("");
    }
  };

  const getProductPrice = (product: Product | null, optionId: string) => {
    if (!product || !product.option || !optionId) {
      return 0;
    }
    const selectedOption = product.option.find((opt) => opt._id === optionId);
    if (!selectedOption) {
      return 0;
    }
    return selectedOption.discount_price ?? selectedOption.price ?? 0;
  };

  const getProductImage = (item: { product: Product | null; images: string[] }) => {
    if (item.images && item.images.length > 0) {
      return normalizeImageUrl(item.images[0]);
    }
    return FALLBACK_IMAGE_URL;
  };

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedOrderId(null);
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

  if (loading && orders.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.processingIndicator}>
          <FontAwesomeIcon icon={faRedo} spin />
          <p>Đang tải danh sách đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
        <button
          className={styles.retryButton}
          onClick={() => {
            setLoading(true);
            setError(null);
            const fetchOrders = async () => {
              try {
                setLoading(true);
                setError(null);
                const token = localStorage.getItem("token");
                if (!token) {
                  throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
                }
                const res = await fetch(`${API_BASE_URL}/api/orders/admin/all`, {
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
                const data: Order[] = await res.json();
                if (!Array.isArray(data)) {
                  throw new Error("Dữ liệu đơn hàng không hợp lệ");
                }
                const normalizedOrders = data.map((order) => ({
                  ...order,
                  shippingStatus: ["pending", "in_transit", "delivered", "returned", "cancelled"].includes(order.shippingStatus)
                    ? order.shippingStatus
                    : "pending",
                  returnStatus: ["none", "requested", "approved", "rejected"].includes(order.returnStatus)
                    ? order.returnStatus
                    : "none",
                }));
                setOrders(normalizedOrders);
                setFilteredOrders(normalizedOrders);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
                showNotification("Không thể tải danh sách đơn hàng", "error");
                setError("Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.");
              } finally {
                setLoading(false);
              }
            };
            fetchOrders();
          }}
          title="Thử lại"
          aria-label="Thử lại tải danh sách đơn hàng"
        >
          <FontAwesomeIcon icon={faRedo} />
        </button>
      </div>
    );
  }

  const selectedOrder = orders.find((order) => order._id === selectedOrderId);

  return (
    <div className={styles.orderManagementContainer}>
      <Head>
        <title>Quản Lý Đơn Hàng</title>
      </Head>
      {notification && (
        <ToastNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {loading && orders.length > 0 && (
        <div className={styles.processingIndicator}>
          <FontAwesomeIcon icon={faRedo} spin /> Đang xử lý...
        </div>
      )}
      <div className={styles.titleContainer}>
        <h1>QUẢN LÝ ĐƠN HÀNG</h1>
        <div className={styles.hideOnMobile}>
          <div className={styles.filterContainer}>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, ID đơn hàng hoặc địa chỉ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Tìm kiếm đơn hàng"
            />
            <select
              value={shippingStatusFilter}
              onChange={(e) => setShippingStatusFilter(e.target.value)}
              className={styles.categorySelect}
              aria-label="Lọc theo trạng thái vận chuyển"
            >
              {allStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.orderTable}>
          <thead className={styles.orderTableThead}>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Tổng Tiền</th>
              <th>Ngày</th>
              <th>Trạng Thái Thanh Toán</th>
              <th>Trạng Thái Vận Chuyển</th>
              <th>Trạng Thái Hoàn Hàng</th>
              <th>Phương Thức Thanh Toán</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {currentOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyState}>
                  <h3>{searchQuery || shippingStatusFilter !== "all" ? "Không tìm thấy đơn hàng" : "Chưa có đơn hàng"}</h3>
                  <p>
                    {(searchQuery || shippingStatusFilter !== "all")
                      ? "Không có đơn hàng nào khớp với bộ lọc."
                      : "Hiện tại không có đơn hàng nào để hiển thị."}
                  </p>
                </td>
              </tr>
            ) : (
              currentOrders.map((order, index) => (
                <tr
                  key={order._id}
                  onClick={() => handleViewDetails(order._id)}
                  className={styles.orderRow}
                  style={{ cursor: "pointer" }}
                >
                  <td>{(currentPage - 1) * ordersPerPage + index + 1}</td>
                  <td>{order.user?.username || "Không xác định"}</td>
                  <td>{order.total.toLocaleString()}₫</td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{getVietnamesePaymentStatus(order.paymentStatus)}</td>
                  <td>
                    <select
                      value={getVietnameseShippingStatus(order.shippingStatus)}
                      onChange={(e) =>
                        handleStatusChange(order._id, e.target.value, order.shippingStatus, "shipping")
                      }
                      className={styles.categorySelect}
                      onClick={(e) => e.stopPropagation()}
                      disabled={loading}
                      aria-label={`Thay đổi trạng thái vận chuyển cho đơn hàng ${order._id}`}
                    >
                      {allStatuses
                        .filter((status) => status.value !== "all")
                        .map((status) => {
                          const isValidStatus = order.shippingStatus && statusProgression[order.shippingStatus];
                          return (
                            <option
                              key={status.value}
                              value={status.label}
                              disabled={
                                status.value === "cancelled"
                                  ? order.shippingStatus !== "pending"
                                  : ["returned", "cancelled"].includes(order.shippingStatus) ||
                                    (isValidStatus
                                      ? !statusProgression[order.shippingStatus].includes(status.value) &&
                                        status.value !== order.shippingStatus
                                      : true)
                              }
                            >
                              {status.label}
                            </option>
                          );
                        })}
                    </select>
                  </td>
                  <td>
                    {getVietnameseReturnStatus(order.returnStatus)}
                    {order.returnReason && (
                      <>
                        <br />
                        <span className={styles.returnReason}>
                          (Lý do: {order.returnReason})
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    {order.paymentMethod === "cod"
                      ? "Thanh toán khi nhận hàng"
                      : order.paymentMethod === "bank"
                      ? "Chuyển khoản"
                      : order.paymentMethod || "Không xác định"}
                  </td>
                  <td>
                    {order.shippingStatus === "pending" && (
                      <button
                        className={styles.cancelBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(
                            order._id,
                            "Hủy đơn hàng",
                            order.shippingStatus,
                            "cancel"
                          );
                        }}
                        disabled={loading}
                        title="Hủy đơn hàng"
                        aria-label={`Hủy đơn hàng ${order._id}`}
                      >
                        Hủy
                      </button>
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
                    className={`${styles.pageLink} ${currentPage === page ? styles.pageLinkActive : ""}`}
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
      {showConfirm && (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
          <div className={styles.modalContent}>
            <h2>
              {showConfirm.type === "cancel" ? "Xác nhận hủy đơn hàng" : "Xác nhận thay đổi trạng thái"}
            </h2>
            {showConfirm.type === "cancel" ? (
              <>
                <p>Vui lòng chọn hoặc nhập lý do hủy đơn hàng:</p>
                <select
                  value={selectedCancelReason}
                  onChange={(e) => setSelectedCancelReason(e.target.value)}
                  className={styles.categorySelect}
                  aria-label="Chọn lý do hủy đơn hàng"
                >
                  <option value="" disabled>
                    Chọn lý do
                  </option>
                  {cancelReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
                {selectedCancelReason === "other" && (
                  <input
                    type="text"
                    placeholder="Nhập lý do hủy đơn"
                    value={cancelReasonInput}
                    onChange={(e) => setCancelReasonInput(e.target.value)}
                    className={styles.searchInput}
                    style={{ marginTop: "10px" }}
                    aria-label="Nhập lý do hủy đơn hàng tùy chỉnh"
                  />
                )}
                <p style={{ marginTop: "10px" }}>
                  Trạng thái thanh toán sẽ được cập nhật thành{" "}
                 {orders.find((o) => o._id === showConfirm.orderId)?.paymentStatus === "completed" ? "Hoàn tiền" : "giữ nguyên"}.
                </p>
              </>
            ) : (
              <p>
                Bạn có chắc chắn muốn{" "}
                {showConfirm.type === "shipping"
                  ? `chuyển trạng thái vận chuyển sang ${showConfirm.newStatus}`
                  : `chuyển trạng thái hoàn hàng sang ${showConfirm.newStatus}`}?
                {showConfirm.type === "shipping" && showConfirm.newStatus === "Đã giao hàng" && (
                  <>
                    <br />
                    Trạng thái thanh toán sẽ được cập nhật thành Đã thanh toán.
                  </>
                )}
                {showConfirm.type === "return" && showConfirm.newStatus === "Đã chấp nhận" && (
                  <>
                    <br />
                    Trạng thái vận chuyển sẽ được cập nhật thành Hoàn hàng và trạng thái thanh toán sẽ được cập nhật thành  Hoàn tiền  .
                  </>
                )}
              </p>
            )}
            <div className={styles.modalActions}>
              <button
                className={styles.confirmBtn}
                onClick={confirmStatusChange}
                disabled={
                  loading ||
                  (showConfirm.type === "cancel" &&
                    (!selectedCancelReason || (selectedCancelReason === "other" && !cancelReasonInput.trim())))
                }
                title="Xác nhận"
                aria-label="Xác nhận thay đổi trạng thái"
              >
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setShowConfirm(null);
                  setCancelReasonInput("");
                  setSelectedCancelReason("");
                }}
                disabled={loading}
                title="Hủy"
                aria-label="Hủy thay đổi trạng thái"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedOrder && (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
          <div className={styles.modaldetail} style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <div className={styles.modalActions} style={{ justifyContent: "flex-end" }}>
              <button
                className={styles.cancelBtn}
                onClick={handleCloseDetails}
                disabled={loading}
                title="Đóng"
                aria-label="Đóng chi tiết đơn hàng"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <h2>Chi tiết đơn hàng</h2>
            <div className={styles.orderDetails}>
              <div className={styles.detailsContainer}>
                <div className={styles.detailsSection}>
                  <h4>Thông tin khách hàng</h4>
                  <div className={styles.detailsGrid}>
                    <p>
                       Tên:   {selectedOrder.user?.username || "Không xác định"}
                    </p>
                    <p>
                       Email:   {selectedOrder.user?.email || "Không xác định"}
                    </p>
                    <p>
                       Địa chỉ:   {formatAddress(selectedOrder.address)}
                    </p>
                  </div>
                </div>
                <div className={styles.detailsSection}>
                  <h4>Thông tin đơn hàng</h4>
                  <div className={styles.detailsGrid}>
                    <p>
                       Ngày:   {formatDate(selectedOrder.createdAt)}
                    </p>
                    <p>
                       Trạng thái thanh toán:  {" "}
                      {getVietnamesePaymentStatus(selectedOrder.paymentStatus)}
                    </p>
                    <p>
                       Trạng thái vận chuyển:  {" "}
                      {getVietnameseShippingStatus(selectedOrder.shippingStatus)}
                    </p>
                    <p>
                       Phương thức thanh toán:  {" "}
                      {selectedOrder.paymentMethod === "cod"
                        ? "Thanh toán khi nhận hàng"
                        : selectedOrder.paymentMethod === "bank"
                        ? "Chuyển khoản"
                        : selectedOrder.paymentMethod || "Không xác định"}
                    </p>
                    {selectedOrder.cancelReason && (
                      <p>
                         Lý do hủy đơn:   {getVietnameseCancelReason(selectedOrder.cancelReason)}
                      </p>
                    )}
                  </div>
                </div>
                <div className={styles.detailsSection}>
                  <h4>Trạng thái hoàn hàng</h4>
                  <div className={styles.detailsGrid}>
                    <p>
                       Trạng thái:  {" "}
                      {getVietnameseReturnStatus(selectedOrder.returnStatus)}
                    </p>
                    {selectedOrder.returnReason && (
                      <p>
                         Lý do hoàn hàng:   {selectedOrder.returnReason}
                      </p>
                    )}
                    {selectedOrder.returnStatus === "requested" && (
                      <div className={styles.returnAction}>
                        <select
                          value=""
                          onChange={(e) =>
                            handleStatusChange(
                              selectedOrder._id,
                              e.target.value,
                              selectedOrder.returnStatus,
                              "return"
                            )
                          }
                          className={styles.categorySelect}
                          aria-label={`Thay đổi trạng thái hoàn hàng cho đơn hàng ${selectedOrder._id}`}
                        >
                          <option value="" disabled>
                            Chọn hành động
                          </option>
                          {returnStatuses.map((status) => (
                            <option key={status.value} value={status.label}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.detailsSection}>
                  <h4>Sản phẩm trong đơn hàng</h4>
                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>Hình ảnh</th>
                        <th>Tên sản phẩm</th>
                        <th>Số lượng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <img
                                src={getProductImage(item)}
                                alt={item.product?.name || "Không xác định"}
                                width={48}
                                height={48}
                                className={styles.orderTableImage}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                                }}
                              />
                            </td>
                            <td>{item.product?.name || "Không xác định"}</td>
                            <td>{item.quantity}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center">
                            Không có sản phẩm trong đơn hàng
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className={styles.detailsSection}>
                  <h4>Tổng tiền</h4>
                  <p>{selectedOrder.total.toLocaleString()}₫</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPage;