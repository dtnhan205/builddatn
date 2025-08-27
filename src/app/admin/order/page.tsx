"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import styles from "./order.module.css";
import { useRouter } from "next/navigation";
import Head from "next/head";
import Image from "next/image";
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
  _id: string;
  user: { _id: string; username: string; email: string } | null;
  items: { product: Product | null; optionId: string; quantity: number; images: string[] }[];
  subtotal: number;
  discount: number;
  total: number;
  address: Address;
  sdt: string;
  paymentMethod: string;
  paymentStatus: "pending" | "completed" | "failed" | "cancelled";
  shippingStatus: "pending" | "confirmed" | "in_transit" | "delivered" | "returned" | "cancelled" | "failed";
  returnStatus: "none" | "requested" | "approved" | "rejected";
  returnReason?: string;
  returnRequestDate?: string;
  returnImages?: { url: string; public_id: string }[];
  returnVideos?: { url: string; public_id: string }[];
  cancelReason?: string;
  cancelNote?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  failReason?: string;
  confirmedAt?: string;
  createdAt: string;
  isCancelled?: boolean;
  isFailed?: boolean;
  isConfirmed?: boolean;
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
    type: "shipping" | "return" | "cancel" | "fail";
    cancelReason?: string;
    failReason?: string;
  } | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>("");
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>("");
  const [failReasonInput, setFailReasonInput] = useState<string>("");
  const [selectedFailReason, setSelectedFailReason] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [shippingStatusFilter, setShippingStatusFilter] = useState<string>("all");
  const [showFailedOrders, setShowFailedOrders] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const ordersPerPage = 9;
  const router = useRouter();

  const cancelReasons: { value: string; label: string }[] = [
    { value: "Lý do khác", label: "Lý do khác" },
    { value: "out_of_stock", label: "Hết hàng" },
    { value: "customer_cancelled", label: "Khách hủy" },
    { value: "system_error", label: "Lỗi hệ thống" },
    { value: "other", label: "Khác" },
  ];

  const failReasons: { value: string; label: string }[] = [
    { value: "delivery_error", label: "Lỗi vận chuyển" },
    { value: "address_issue", label: "Sai địa chỉ" },
    { value: "timeout", label: "Quá thời gian giao hàng" },
    { value: "other", label: "Khác" },
  ];

  const paymentStatusMapping: { [key: string]: string } = {
    completed: "Đã thanh toán",
    pending: "Chưa thanh toán",
    failed: "Chưa thanh toán",
    cancelled: "Hoàn tiền",
  };

  const shippingStatusMapping: { [key: string]: string } = {
    pending: "Chờ xử lý",
    confirmed: "Đã xác nhận",
    in_transit: "Đang vận chuyển",
    delivered: "Đã giao hàng",
    returned: "Hoàn hàng",
    cancelled: "Hủy đơn hàng",
    failed: "Giao hàng thất bại",
  };

  const returnStatusMapping: { [key: string]: string } = {
    none: "Không có",
    requested: "Đã yêu cầu",
    approved: "Đã chấp nhận",
    rejected: "Đã từ chối",
  };

  const cancelReasonMapping: { [key: string]: string } = {
    "Đổi ý không mua nữa": "Đổi ý không mua nữa",
    "Muốn thay đổi sản phẩm": "Muốn thay đổi sản phẩm",
    "Thay đổi phương thức thanh toán": "Thay đổi phương thức thanh toán",
    "Thay đổi địa chỉ giao hàng": "Thay đổi địa chỉ giao hàng",
    "Lý do khác": "Lý do khác",
    out_of_stock: "Hết hàng",
    customer_cancelled: "Khách hủy",
    system_error: "Lỗi hệ thống",
    other: "Khác",
  };

  const failReasonMapping: { [key: string]: string } = {
    delivery_error: "Lỗi vận chuyển",
    address_issue: "Sai địa chỉ",
    timeout: "Quá thời gian giao hàng",
    other: "Khác",
  };

  const reverseShippingStatusMapping: { [key: string]: string } = {
    "Chờ xử lý": "pending",
    "Đã xác nhận": "confirmed",
    "Đang vận chuyển": "in_transit",
    "Đã giao hàng": "delivered",
    "Hoàn hàng": "returned",
    "Hủy đơn hàng": "cancelled",
    "Giao hàng thất bại": "failed",
  };

  const reverseReturnStatusMapping: { [key: string]: string } = {
    "Đã chấp nhận": "approved",
    "Đã từ chối": "rejected",
  };

const statusProgression: { [key: string]: string[] } = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_transit", "cancelled"], // Xóa "failed"
  in_transit: ["delivered", "failed"],
  delivered: ["returned"],
  returned: [],
  cancelled: [],
  failed: [],
};

  const allStatuses: { value: string; label: string }[] = [
    { value: "all", label: "Tất cả trạng thái" },
    { value: "pending", label: "Chờ xử lý" },
    { value: "confirmed", label: "Đã xác nhận" },
    { value: "in_transit", label: "Đang vận chuyển" },
    { value: "failed", label: "Giao hàng thất bại" },
    { value: "delivered", label: "Đã giao hàng" },
    { value: "cancelled", label: "Hủy đơn hàng" },
    { value: "returned", label: "Hoàn hàng" },
  ];

  const returnStatuses: { value: string; label: string }[] = [
    { value: "approved", label: "Đã chấp nhận" },
    { value: "rejected", label: "Đã từ chối" },
  ];

  const formatAddress = (address: Address): string => {
    const { addressLine, ward, district, cityOrProvince } = address;
    return [addressLine, ward, district, cityOrProvince].filter(Boolean).join(", ") || "Chưa có địa chỉ";
  };

  const showNotification = (message: string, type: "success" | "error"): void => {
    setNotification({ message, type });
  };

  const getVietnameseCancelReason = (cancelReason: string | undefined): string => {
    if (!cancelReason) return "Không có lý do";
    return cancelReasonMapping[cancelReason] || cancelReason;
  };

  const getVietnameseFailReason = (failReason: string | undefined): string => {
    if (!failReason) return "Không có lý do";
    return failReasonMapping[failReason] || failReason;
  };

  const getProductOptionDetails = (product: Product | null, optionId: string): { value: string } => {
    if (!product || !product.option || !product.option.length || !optionId) {
      console.warn(`Invalid product or optionId: product=${JSON.stringify(product)}, optionId=${optionId}`);
      return { value: "Không xác định" };
    }

    const selectedOption = product.option.find((opt) => opt._id.toString() === optionId.toString());

    if (!selectedOption) {
      console.warn(`Option not found for optionId=${optionId} in product ${product._id}`);
      return { value: "Không xác định" };
    }

    return { value: selectedOption.value || "Không xác định" };
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
        const endpoint = showFailedOrders ? `${API_BASE_URL}/api/orders/admin/failed` : `${API_BASE_URL}/api/orders/admin/all`;
        const res = await fetch(endpoint, {
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
          shippingStatus: ["pending", "confirmed", "in_transit", "delivered", "returned", "cancelled", "failed"].includes(order.shippingStatus)
            ? order.shippingStatus
            : "pending",
          returnStatus: ["none", "requested", "approved", "rejected"].includes(order.returnStatus)
            ? order.returnStatus
            : "none",
          isCancelled: order.shippingStatus === "cancelled" && order.paymentStatus === "cancelled",
          isFailed: order.shippingStatus === "failed" && order.paymentStatus === "failed",
          isConfirmed: order.shippingStatus === "confirmed",
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
  }, [router, showFailedOrders]);

  const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const filterOrders = useCallback(
    (query: string, shippingStatus: string, start: string, end: string) => {
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

        const orderDate = new Date(order.createdAt);
        const startDateObj = start ? new Date(start) : null;
        const endDateObj = end ? new Date(end) : null;
        const matchesDate =
          (!startDateObj || orderDate >= startDateObj) &&
          (!endDateObj || orderDate <= new Date(endDateObj.setHours(23, 59, 59, 999)));

        return matchesSearch && (showFailedOrders ? order.shippingStatus === "failed" : matchesShippingStatus) && matchesDate;
      });
      setFilteredOrders(filtered);
      setCurrentPage(1);
    },
    [orders, showFailedOrders]
  );

  const debouncedFilter = useMemo(
    () => debounce((query: string, shippingStatus: string, start: string, end: string) => {
      filterOrders(query, shippingStatus, start, end);
    }, 300),
    [filterOrders]
  );

  useEffect(() => {
    debouncedFilter(searchQuery, shippingStatusFilter, startDate, endDate);
  }, [searchQuery, shippingStatusFilter, startDate, endDate, debouncedFilter]);

  const formatDate = (dateString: string | number | Date): string => {
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

  const getVietnamesePaymentStatus = (paymentStatus: string): string => {
    return paymentStatusMapping[paymentStatus] || "Chưa thanh toán";
  };

  const getVietnameseShippingStatus = (shippingStatus: string): string => {
    return shippingStatusMapping[shippingStatus] || shippingStatus;
  };

  const getVietnameseReturnStatus = (returnStatus: string): string => {
    return returnStatusMapping[returnStatus] || returnStatus;
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: string,
    currentStatus: string,
    type: "shipping" | "return" | "cancel" | "fail",
    cancelReason?: string,
    failReason?: string
  ): Promise<void> => {
    const order = orders.find((o) => o._id === orderId);
    if (!order) {
      showNotification("Không tìm thấy đơn hàng", "error");
      return;
    }

    if (type === "shipping" && ["returned", "cancelled", "failed"].includes(currentStatus)) {
      showNotification("Không thể thay đổi trạng thái đơn hàng khi đã hoàn, hủy hoặc thất bại", "error");
      return;
    }

    if (type === "shipping") {
      const englishStatus = reverseShippingStatusMapping[newStatus] || newStatus;
      if (englishStatus === "cancelled") {
        if (!['pending', 'confirmed'].includes(currentStatus) || order.paymentStatus !== 'pending') {
          showNotification("Chỉ có thể hủy đơn hàng khi trạng thái là Chờ xử lý hoặc Đã xác nhận và chưa thanh toán", "error");
          return;
        }
        setShowConfirm({ orderId, newStatus, currentStatus, type: "cancel", cancelReason: "" });
        setSelectedCancelReason("");
        setCancelReasonInput("");
      }else if (englishStatus === "failed") {
  if (currentStatus !== "in_transit") {
    showNotification("Chỉ có thể đánh dấu thất bại khi trạng thái là Đang vận chuyển", "error");
    return;
  }
  setShowConfirm({ orderId, newStatus, currentStatus, type: "fail", failReason: "" });
  setSelectedFailReason("");
  setFailReasonInput("");
}else if (englishStatus === "returned") {
        if (currentStatus !== "delivered" || order.returnStatus !== "approved") {
          showNotification("Chỉ có thể chuyển sang trạng thái Hoàn hàng khi đơn hàng đã giao và yêu cầu hoàn hàng được chấp nhận", "error");
          return;
        }
        setShowConfirm({ orderId, newStatus, currentStatus, type });
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
      if (!['pending', 'confirmed'].includes(currentStatus) || order.paymentStatus !== 'pending') {
        showNotification("Chỉ có thể hủy đơn hàng khi trạng thái là Chờ xử lý hoặc Đã xác nhận và chưa thanh toán", "error");
        return;
      }
      setShowConfirm({ orderId, newStatus, currentStatus, type, cancelReason: "" });
      setSelectedCancelReason("");
      setCancelReasonInput("");
    } else if (type === "fail") {
      if (!['confirmed', 'in_transit'].includes(currentStatus)) {
        showNotification("Chỉ có thể đánh dấu thất bại khi trạng thái là Đã xác nhận hoặc Đang vận chuyển", "error");
        return;
      }
      if (order.paymentStatus === "completed") {
        showNotification("Không thể đánh dấu giao hàng thất bại cho đơn hàng đã thanh toán", "error");
        return;
      }
      setShowConfirm({ orderId, newStatus, currentStatus, type, failReason: "" });
      setSelectedFailReason("");
      setFailReasonInput("");
    } else {
      setShowConfirm({ orderId, newStatus, currentStatus, type });
    }
  };

  const confirmStatusChange = async (): Promise<void> => {
    if (!showConfirm) return;

    const { orderId, newStatus, currentStatus, type, cancelReason, failReason } = showConfirm;
    let englishStatus: string;
    let updatePayload: { 
      shippingStatus?: string; 
      paymentStatus?: string; 
      returnStatus?: string; 
      cancelReason?: string; 
      failReason?: string; 
      confirmedAt?: Date;
      cancelledAt?: Date;
    };

    const order = orders.find((o) => o._id === orderId);
    if (!order) {
      showNotification("Không tìm thấy đơn hàng", "error");
      return;
    }

    if (type === "shipping") {
      englishStatus = reverseShippingStatusMapping[newStatus] || newStatus;
      updatePayload = { 
        shippingStatus: englishStatus,
        ...(englishStatus === "confirmed" && { confirmedAt: new Date() })
      };
      if (englishStatus === "delivered") {
        updatePayload.paymentStatus = "completed";
      }
    } else if (type === "cancel") {
      englishStatus = reverseShippingStatusMapping[newStatus] || newStatus;
      const finalCancelReason = selectedCancelReason === "other" ? cancelReasonInput : selectedCancelReason;
      if (!finalCancelReason || finalCancelReason.trim() === "") {
        showNotification("Vui lòng chọn hoặc nhập lý do hủy đơn hàng", "error");
        return;
      }
      updatePayload = {
        shippingStatus: englishStatus,
        cancelReason: finalCancelReason,
        cancelledAt: new Date(),
        ...(order.paymentStatus === "completed" && { paymentStatus: "cancelled" }),
      };
    } else if (type === "fail") {
      englishStatus = reverseShippingStatusMapping[newStatus] || newStatus;
      const finalFailReason = selectedFailReason === "other" ? failReasonInput : selectedFailReason;
      if (!finalFailReason || finalFailReason.trim() === "") {
        showNotification("Vui lòng chọn hoặc nhập lý do giao hàng thất bại", "error");
        return;
      }
      if (currentStatus === "confirmed") {
        showNotification("Không thể chuyển từ Đã xác nhận sang Giao hàng thất bại", "error");
        return;
      }
  updatePayload = {
    shippingStatus: englishStatus,
    failReason: finalFailReason,
    paymentStatus: "failed",
  };
} else {
      englishStatus = reverseReturnStatusMapping[newStatus] || newStatus;
      updatePayload = { returnStatus: englishStatus };
      if (englishStatus === "approved") {
        updatePayload.shippingStatus = "returned";
        updatePayload.paymentStatus = "cancelled";
      }
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const endpoint = type === "fail" ? `${API_BASE_URL}/api/orders/admin/fail/${orderId}` : `${API_BASE_URL}/api/orders/update/${orderId}`;
      const response = await fetch(endpoint, {
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

      const fetchOrders = async () => {
        try {
          const endpoint = showFailedOrders ? `${API_BASE_URL}/api/orders/admin/failed` : `${API_BASE_URL}/api/orders/admin/all`;
          const res = await fetch(endpoint, {
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
            shippingStatus: ["pending", "confirmed", "in_transit", "delivered", "returned", "cancelled", "failed"].includes(order.shippingStatus)
              ? order.shippingStatus
              : "pending",
            returnStatus: ["none", "requested", "approved", "rejected"].includes(order.returnStatus)
              ? order.returnStatus
              : "none",
            isCancelled: order.shippingStatus === "cancelled" && order.paymentStatus === "cancelled",
            isFailed: order.shippingStatus === "failed" && order.paymentStatus === "failed",
            isConfirmed: order.shippingStatus === "confirmed",
          }));

          setOrders(normalizedOrders);
          setFilteredOrders(normalizedOrders);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
          showNotification("Không thể tải danh sách đơn hàng", "error");
          setError("Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.");
        }
      };

      await fetchOrders();

      showNotification(
        type === "shipping"
          ? englishStatus === "confirmed"
            ? "Xác nhận đơn hàng thành công"
            : "Cập nhật trạng thái vận chuyển thành công"
          : type === "cancel"
          ? "Hủy đơn hàng thành công"
          : type === "fail"
          ? "Đánh dấu giao hàng thất bại thành công"
          : "Cập nhật trạng thái hoàn hàng thành công",
        "success"
      );
      setCancelReasonInput("");
      setSelectedCancelReason("");
      setFailReasonInput("");
      setSelectedFailReason("");
      setSelectedOrderId(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
      showNotification(`Không thể cập nhật trạng thái: ${errorMessage}`, "error");
    } finally {
      setShowConfirm(null);
      setLoading(false);
    }
  };

  const handleViewDetails = (orderId: string): void => {
    setSelectedOrderId(orderId);
  };

  const handleCloseDetails = (): void => {
    setSelectedOrderId(null);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      setSelectedOrderId(null);
      setShowConfirm(null);
      setCancelReasonInput("");
      setSelectedCancelReason("");
      setFailReasonInput("");
      setSelectedFailReason("");
      setEnlargedImage(null);
    }
  };

  const handleImageClick = (imageUrl: string): void => {
    setEnlargedImage(imageUrl);
  };

  const handleCloseEnlargedImage = (): void => {
    setEnlargedImage(null);
  };

  const getProductImage = (item: { product: Product | null; images: string[] }): string => {
    if (item.images && item.images.length > 0) {
      return normalizeImageUrl(item.images[0]);
    }
    return FALLBACK_IMAGE_URL;
  };

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);

  const handlePageChange = (page: number): void => {
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
                const endpoint = showFailedOrders ? `${API_BASE_URL}/api/orders/admin/failed` : `${API_BASE_URL}/api/orders/admin/all`;
                const res = await fetch(endpoint, {
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
                  shippingStatus: ["pending", "confirmed", "in_transit", "delivered", "returned", "cancelled", "failed"].includes(order.shippingStatus)
                    ? order.shippingStatus
                    : "pending",
                  returnStatus: ["none", "requested", "approved", "rejected"].includes(order.returnStatus)
                    ? order.returnStatus
                    : "none",
                  isCancelled: order.shippingStatus === "cancelled" && order.paymentStatus === "cancelled",
                  isFailed: order.shippingStatus === "failed" && order.paymentStatus === "failed",
                  isConfirmed: order.shippingStatus === "confirmed",
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
              placeholder="Tìm kiếm theo tên, địa chỉ..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Tìm kiếm đơn hàng"
            />
            <select
              value={shippingStatusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setShippingStatusFilter(e.target.value)}
              className={styles.categorySelect}
              aria-label="Lọc theo trạng thái vận chuyển"
            >
              {allStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
              className={styles.dateInput}
              aria-label="Ngày bắt đầu"
            />
            <span className={styles.dateSeparator}>đến</span>
            <input
              type="date"
              value={endDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              className={styles.dateInput}
              aria-label="Ngày kết thúc"
            />
          </div>
        </div>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.orderTable}>
          <thead className={styles.orderTableThead}>
            <tr>
              <th>STT</th>
              <th>Tên</th>
              <th>Tổng Tiền</th>
              <th>Ngày</th>
              <th>Trạng Thái Thanh Toán</th>
              <th>Trạng Thái Vận Chuyển</th>
              <th>Phương Thức Thanh Toán</th>
              <th>Trạng Thái Hoàn Hàng</th>
            </tr>
          </thead>
          <tbody>
            {currentOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  <h3>{searchQuery || shippingStatusFilter !== "all" || showFailedOrders || startDate || endDate ? "Không tìm thấy đơn hàng" : "Chưa có đơn hàng"}</h3>
                  <p>
                    {(searchQuery || shippingStatusFilter !== "all" || showFailedOrders || startDate || endDate)
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
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        handleStatusChange(order._id, e.target.value, order.shippingStatus, "shipping")
                      }
                      className={styles.categorySelect}
                      onClick={(e: React.MouseEvent<HTMLSelectElement>) => e.stopPropagation()}
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
                              ? !['pending', 'confirmed'].includes(order.shippingStatus) || order.paymentStatus !== "pending"
                              : status.value === "failed"
                              ? order.shippingStatus !== "in_transit" // Chỉ cho phép từ in_transit
                              : status.value === "returned"
                              ? order.shippingStatus !== "delivered" || order.returnStatus !== "approved"
                              : ["returned", "cancelled", "failed"].includes(order.shippingStatus) ||
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
                    {order.paymentMethod === "cod"
                      ? "Thanh toán khi nhận hàng"
                      : order.paymentMethod === "Thanh toán khi nhận hàng"
                      ? "Chuyển khoản"
                      : order.paymentMethod === "vnpay"
                      ? "VNPay"
                      : order.paymentMethod === "momo"
                      ? "Momo"
                      : order.paymentMethod || "Không xác định"}
                  </td>
                  <td>
                    {["approved", "rejected"].includes(order.returnStatus) ? (
                      <>
                        {getVietnameseReturnStatus(order.returnStatus)}
                        {order.returnReason && (
                          <>
                            <br />
                            <span className={styles.returnReason}>
                              (Lý do: {order.returnReason})
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      "-"
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
        <div className={styles.confirmModalOverlay} onClick={handleOverlayClick}>
          <div className={styles.confirmModalContent}>
            <h2>
              {showConfirm.type === "cancel"
                ? "Xác nhận hủy đơn hàng"
                : showConfirm.type === "fail"
                ? "Xác nhận đánh dấu giao hàng thất bại"
                : showConfirm.type === "return"
                ? "Xác nhận thay đổi trạng thái hoàn hàng"
                : showConfirm.newStatus === "Đã xác nhận"
                ? "Xác nhận đơn hàng"
                : "Xác nhận thay đổi trạng thái"}
            </h2>
            {showConfirm.type === "cancel" ? (
              <>
                <p>Vui lòng chọn hoặc nhập lý do hủy đơn hàng:</p>
                <select
                  value={selectedCancelReason}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCancelReason(e.target.value)}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCancelReasonInput(e.target.value)}
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
            ) : showConfirm.type === "fail" ? (
              <>
                <p>Vui lòng chọn hoặc nhập lý do giao hàng thất bại:</p>
                <select
                  value={selectedFailReason}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedFailReason(e.target.value)}
                  className={styles.categorySelect}
                  aria-label="Chọn lý do giao hàng thất bại"
                >
                  <option value="" disabled>
                    Chọn lý do
                  </option>
                  {failReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
                {selectedFailReason === "other" && (
                  <input
                    type="text"
                    placeholder="Nhập lý do giao hàng thất bại"
                    value={failReasonInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFailReasonInput(e.target.value)}
                    className={styles.searchInput}
                    style={{ marginTop: "10px" }}
                    aria-label="Nhập lý do giao hàng thất bại tùy chỉnh"
                  />
                )}
                <p style={{ marginTop: "10px" }}>
                  Trạng thái thanh toán sẽ được cập nhật thành Chưa thanh toán.
                </p>
              </>
            ) : (
              <p>
                Bạn có chắc chắn muốn{" "}
                {showConfirm.type === "shipping"
                  ? showConfirm.newStatus === "Đã xác nhận"
                    ? `xác nhận đơn hàng`
                    : `chuyển trạng thái vận chuyển sang ${showConfirm.newStatus}`
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
                    Trạng thái vận chuyển sẽ được cập nhật thành Hoàn hàng và trạng thái thanh toán sẽ được cập nhật thành Hoàn tiền.
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
                    (!selectedCancelReason || (selectedCancelReason === "other" && !cancelReasonInput.trim()))) ||
                  (showConfirm.type === "fail" &&
                    (!selectedFailReason || (selectedFailReason === "other" && !failReasonInput.trim())))
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
                  setFailReasonInput("");
                  setSelectedFailReason("");
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
        <div className={styles.detailModalOverlay} onClick={handleOverlayClick}>
          <div className={styles.detailModalContent} style={{ maxHeight: "80vh", overflowY: "auto" }}>
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
                    <p>Tên: {selectedOrder.user?.username || "Không xác định"}</p>
                    <p>Email: {selectedOrder.user?.email || "Không xác định"}</p>
                    <p>Địa chỉ: {formatAddress(selectedOrder.address)}</p>
                    <p>Số điện thoại: {selectedOrder.sdt || "Không xác định"}</p>
                  </div>
                </div>
                <div className={styles.detailsSection}>
                  <h4>Thông tin đơn hàng</h4>
                  <div className={styles.detailsGrid}>
                    <p>Ngày: {formatDate(selectedOrder.createdAt)}</p>
                    {selectedOrder.confirmedAt && selectedOrder.isConfirmed && (
                      <p>Ngày xác nhận: {formatDate(selectedOrder.confirmedAt)}</p>
                    )}
                    {selectedOrder.cancelledAt && selectedOrder.isCancelled && (
                      <p>Ngày hủy: {formatDate(selectedOrder.cancelledAt)}</p>
                    )}
                    <p>Trạng thái thanh toán: {getVietnamesePaymentStatus(selectedOrder.paymentStatus)}</p>
                    <p>Trạng thái vận chuyển: {getVietnameseShippingStatus(selectedOrder.shippingStatus)}</p>
                    <p>
                      Phương thức thanh toán:{" "}
                      {selectedOrder.paymentMethod === "cod"
                        ? "Thanh toán khi nhận hàng"
                        : selectedOrder.paymentMethod === "vnpay"
                        ? "VNPay"
                        : selectedOrder.paymentMethod || "Không xác định"}
                    </p>
                    {selectedOrder.cancelReason && (
                      <p>Lý do hủy đơn: {getVietnameseCancelReason(selectedOrder.cancelReason)}</p>
                    )}
                    {selectedOrder.cancelNote && (
                      <p>Ghi chú hủy đơn: {selectedOrder.cancelNote}</p>
                    )}
                    {selectedOrder.failReason && (
                      <p>Lý do giao hàng thất bại: {getVietnameseFailReason(selectedOrder.failReason)}</p>
                    )}
                  </div>
                </div>
                <div className={styles.detailsSection}>
                  <h4>Trạng thái hoàn hàng</h4>
                  <div className={styles.detailsGrid}>
                    {selectedOrder.returnStatus !== "none" ? (
                      <div className={styles.noteSection}>
                        <p>
                          <strong>Trạng thái:</strong>{" "}
                          {selectedOrder.returnStatus === "requested"
                            ? "Đã yêu cầu hoàn hàng"
                            : selectedOrder.returnStatus === "approved"
                            ? "Hoàn hàng được chấp nhận"
                            : "Hoàn hàng bị từ chối"}
                        </p>
                        {selectedOrder.returnStatus === "requested" && (
                          <div>
                            <select
                              value={getVietnameseReturnStatus(selectedOrder.returnStatus)}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                handleStatusChange(
                                  selectedOrder._id,
                                  e.target.value,
                                  selectedOrder.returnStatus,
                                  "return"
                                )
                              }
                              className={styles.categorySelect}
                              disabled={loading}
                              aria-label={`Thay đổi trạng thái hoàn hàng cho đơn hàng ${selectedOrder._id}`}
                            >
                              <option value={getVietnameseReturnStatus(selectedOrder.returnStatus)} disabled>
                                {getVietnameseReturnStatus(selectedOrder.returnStatus)}
                              </option>
                              {returnStatuses.map((status) => (
                                <option key={status.value} value={status.label}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {selectedOrder.returnReason && (
                          <p>
                            <strong>Lý do hoàn hàng:</strong> {selectedOrder.returnReason}
                          </p>
                        )}
                        {selectedOrder.returnRequestDate && (
                          <p>
                            <strong>Ngày yêu cầu:</strong> {formatDate(selectedOrder.returnRequestDate)}
                          </p>
                        )}
                        {selectedOrder.returnImages && selectedOrder.returnImages.length > 0 && (
                          <div className={styles.returnMedia}>
                            <h4>Ảnh hoàn hàng:</h4>
                            <div className={styles.imageGrid}>
                              {selectedOrder.returnImages.map((image, index) => (
                                <div key={index} className={styles.returnImage}>
                                  <Image
                                    src={normalizeImageUrl(image.url) || FALLBACK_IMAGE_URL}
                                    alt={`Ảnh hoàn hàng ${index + 1}`}
                                    width={100}
                                    height={100}
                                    quality={100}
                                    onClick={() => handleImageClick(normalizeImageUrl(image.url))}
                                    onError={(e) => {
                                      console.error(`Image load failed for return image ${index + 1}: ${image.url}`);
                                      (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                                    }}
                                    style={{
                                      objectFit: "cover",
                                      borderRadius: "4px",
                                      margin: "4px",
                                      cursor: "pointer",
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedOrder.returnVideos && selectedOrder.returnVideos.length > 0 && (
                          <div className={styles.returnMedia}>
                            <h4>Video hoàn hàng:</h4>
                            {selectedOrder.returnVideos.map((video, index) => (
                              <video
                                key={index}
                                src={normalizeImageUrl(video.url)}
                                controls
                                width={300}
                                height="auto"
                                style={{
                                  borderRadius: "4px",
                                  marginTop: "8px",
                                }}
                                onError={(e) => {
                                  console.error(`Video load failed: ${video.url}`);
                                  setNotification({ message: "Không thể tải video hoàn hàng.", type: "error" });
                                }}
                              >
                                Trình duyệt của bạn không hỗ trợ thẻ video.
                              </video>
                            ))}
                          </div>
                        )}
                        {(!selectedOrder.returnImages || selectedOrder.returnImages.length === 0) &&
                          (!selectedOrder.returnVideos || selectedOrder.returnVideos.length === 0) && (
                            <p>Không có ảnh hoặc video hoàn hàng.</p>
                          )}
                      </div>
                    ) : (
                      <p>Không có yêu cầu hoàn hàng.</p>
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
                        <th>Khối lượng</th>
                        <th>Số lượng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item, idx) => {
                          const { value } = getProductOptionDetails(item.product, item.optionId);
                          return (
                            <tr key={idx}>
                              <td>
                                <img
                                  src={getProductImage(item)}
                                  alt={item.product?.name || "Không xác định"}
                                  width={48}
                                  height={48}
                                  className={styles.orderTableImage}
                                  onError={(e) => {
                                    console.error(`Image load failed for product: ${item.product?._id}`);
                                    (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                                  }}
                                />
                              </td>
                              <td>{item.product?.name || "Không xác định"}</td>
                              <td>{value}</td>
                              <td>{item.quantity}</td>
                            </tr>
                          );
                        })
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
                  <h4>Thông tin giá</h4>
                  <div className={styles.detailsGrid}>
                    <p>Tổng giá trước giảm giá: {selectedOrder.subtotal.toLocaleString()}₫</p>
                    <p>Giảm giá: {selectedOrder.discount.toLocaleString()}₫</p>
                    <p>Tổng tiền: {selectedOrder.total.toLocaleString()}₫</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {enlargedImage && (
        <div className={`${styles.zoomedImageOverlay} ${enlargedImage ? styles.show : ""}`} onClick={handleCloseEnlargedImage}>
          <div className={styles.zoomedImageContainer} onClick={(e) => e.stopPropagation()}>
            <img
              src={enlargedImage || FALLBACK_IMAGE_URL}
              alt="Ảnh hoàn hàng phóng to"
              className={styles.zoomedImage}
              onError={(e) => {
                console.error(`Image load failed for enlarged image: ${enlargedImage}`);
                e.currentTarget.src = FALLBACK_IMAGE_URL;
              }}
            />
            <button
              className={styles.closeZoomButton}
              onClick={handleCloseEnlargedImage}
              title="Đóng"
              aria-label="Đóng ảnh phóng to"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPage;