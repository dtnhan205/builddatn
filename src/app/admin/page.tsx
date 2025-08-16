"use client";

import styles from "./page.module.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faTimes, faRedo, faEdit } from "@fortawesome/free-solid-svg-icons";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

// Interfaces
interface Product {
  _id: string;
  name: string;
  price?: number;
  images?: string[];
}

interface OrderItem {
  product: Product | null;
  quantity: number;
  _id: string;
  option?: string;
}

interface User {
  _id: string;
  username: string;
  email: string;
  createdAt: string;
}

interface AdminReply {
  user: User | null;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

interface Media {
  url: string;
  public_id: string;
}

interface Comment {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: User | null;
  product: Product | null;
  rating: number;
  adminReply: AdminReply | null;
  images: Media[];
  videos: Media[];
}

interface Order {
  _id: string;
  user: User | null;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  coupon: string | null;
  sdt: string;
  paymentMethod: string;
  note: string;
  paymentStatus: "pending" | "completed" | "delivering" | "failed" | "cancelled";
  shippingStatus: "pending" | "in_transit" | "delivered" | "returned";
  createdAt: string;
}

interface Stats {
  orders: number;
  newUsers: number;
  revenue: number;
  newComments: number;
}

interface DecodedToken {
  role: string;
}

interface Notification {
  show: boolean;
  message: string;
  type: "success" | "error";
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const formatDate = (dateString: string | number | Date): string => {
  const date = new Date(dateString);
  return isNaN(date.getTime())
    ? "Ngày không hợp lệ"
    : `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
};

const formatCommentDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const paymentStatusMapping = {
  pending: "Chờ xử lý",
  completed: "Đã thanh toán",
  failed: "Thất bại",
  cancelled: "Đã hoàn",
};

const shippingStatusMapping = {
  pending: "Chờ xử lý",
  in_transit: "Đang vận chuyển",
  delivered: "Đã giao hàng",
  returned: "Đã hoàn",
};

const reverseShippingStatusMapping = {
  "Chờ xử lý": "pending",
  "Đang vận chuyển": "in_transit",
  "Đã giao hàng": "delivered",
  "Đã hoàn": "returned",
};

const statusProgression: { [key: string]: string[] } = {
  pending: ["in_transit"],
  in_transit: ["delivered"],
  delivered: ["returned"],
  returned: [],
};

const allStatuses = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "in_transit", label: "Đang vận chuyển" },
  { value: "delivered", label: "Đã giao hàng" },
  { value: "returned", label: "Đã hoàn" },
  { value: "cancelled", label: "Hủy đơn hàng" },
];

const getVietnamesePaymentStatus = (paymentStatus: string): string => {
  return paymentStatusMapping[paymentStatus as keyof typeof paymentStatusMapping] || paymentStatus;
};

const getVietnameseShippingStatus = (shippingStatus: string): string => {
  return shippingStatusMapping[shippingStatus as keyof typeof shippingStatusMapping] || shippingStatus;
};

const normalizeImageUrl = (path: string): string => {
  if (path.startsWith("http")) return path;
  return `https://api-zeal.onrender.com${path.startsWith("/") ? "" : "/"}${path}`;
};

const renderStars = (rating: number | undefined) => {
  const stars = rating ? Math.min(Math.max(rating, 0), 5) : 0;
  return (
    <>
      {Array(5)
        .fill(0)
        .map((_, i) => (
          <span key={i} style={{ color: i < stars ? "#ffa500" : "#ccc" }}>
            ★
          </span>
        ))}
    </>
  );
};

const AD_Home: React.FC = () => {
  const router = useRouter();
  const currentDate = new Date();
  const [timePeriod, setTimePeriod] = useState<"week" | "month" | "year">("week");
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [chartData, setChartData] = useState<ChartData<"line">>({
    labels: [],
    datasets: [
      {
        label: "Doanh thu",
        data: [],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.3,
      },
    ],
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [filteredPendingOrders, setFilteredPendingOrders] = useState<Order[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [filteredComments, setFilteredComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState<Stats>({
    orders: 0,
    newUsers: 0,
    revenue: 0,
    newComments: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification>({
    show: false,
    message: "",
    type: "success",
  });
  const [showConfirm, setShowConfirm] = useState<{
    orderId: string;
    newStatus: string;
    currentStatus: string;
  } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<{
    orderId: string;
    currentStatus: string;
  } | null>(null);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>("");
  const [cancelReasonInput, setCancelReasonInput] = useState<string>("");
  const [currentPageOrders, setCurrentPageOrders] = useState<number>(1);
  const [currentPageComments, setCurrentPageComments] = useState<number>(1);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [searchQueryOrders, setSearchQueryOrders] = useState<string>("");
  const [searchQueryComments, setSearchQueryComments] = useState<string>("");
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
  const [isEditingReply, setIsEditingReply] = useState<{ [key: string]: boolean }>({});
  const ordersPerPage = 8;
  const commentsPerPage = 9;

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear - i);
  }, []);

  const months = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];

  const weeks = useMemo(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
    const firstMonday = new Date(firstDayOfMonth);

    if (firstDayOfMonth.getDay() !== 1) {
      const offset = firstDayOfMonth.getDay() === 0 ? -6 : 1 - firstDayOfMonth.getDay();
      firstMonday.setDate(firstDayOfMonth.getDate() + offset);
    }

    const weekLabels: string[] = [];
    let weekStart = new Date(firstMonday);

    while (weekStart <= lastDayOfMonth) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekLabels.push(`${formatDate(weekStart)} - ${formatDate(weekEnd)}`);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    return weekLabels;
  }, [selectedMonth, selectedYear]);

  const cancelReasons = [
    { value: "customer_request", label: "Khách hàng yêu cầu hủy" },
    { value: "out_of_stock", label: "Hết hàng" },
    { value: "invalid_info", label: "Thông tin đơn hàng không hợp lệ" },
    { value: "other", label: "Khác" },
  ];

  useEffect(() => {
    const currentDate = new Date();
    if (selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth()) {
      const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
      const firstMonday = new Date(firstDayOfMonth);
      if (firstDayOfMonth.getDay() !== 1) {
        const offset = firstDayOfMonth.getDay() === 0 ? -6 : 1 - firstDayOfMonth.getDay();
        firstMonday.setDate(firstDayOfMonth.getDate() + offset);
      }

      let weekIndex = 1;
      let weekStart = new Date(firstMonday);
      while (weekStart <= currentDate) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        if (currentDate >= weekStart && currentDate <= weekEnd) {
          setSelectedWeek(weekIndex);
          break;
        }
        weekStart.setDate(weekStart.getDate() + 7);
        weekIndex++;
      }
    } else {
      setSelectedWeek(1);
    }
  }, [selectedMonth, selectedYear]);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "success" });
    }, 3000);
  };

  const handleShippingStatusChange = async (orderId: string, newStatus: string, currentStatus: string) => {
    if (currentStatus === "returned") {
      showNotification("Không thể thay đổi trạng thái đơn hàng Đã hoàn", "error");
      return;
    }

    if (newStatus === "Hủy đơn hàng") {
      handleCancelOrder(orderId, currentStatus);
      return;
    }

    const englishStatus =
      reverseShippingStatusMapping[newStatus as keyof typeof reverseShippingStatusMapping] || newStatus;

    if (!statusProgression[currentStatus].includes(englishStatus)) {
      showNotification("Trạng thái không hợp lệ hoặc không thể chuyển về trạng thái trước đó", "error");
      return;
    }

    setShowConfirm({ orderId, newStatus, currentStatus });
  };

  const confirmStatusChange = async () => {
    if (!showConfirm) return;

    const { orderId, newStatus } = showConfirm;
    const englishStatus =
      reverseShippingStatusMapping[newStatus as keyof typeof reverseShippingStatusMapping] || newStatus;

    try {
      const updatePayload: { shippingStatus: string; paymentStatus?: string } = {
        shippingStatus: englishStatus,
      };

      if (englishStatus === "delivered") {
        updatePayload.paymentStatus = "completed";
      } else if (englishStatus === "returned") {
        updatePayload.paymentStatus = "cancelled";
      }

      const token = localStorage.getItem("token");
      const response = await fetch(`https://api-zeal.onrender.com/api/orders/update/${orderId}`, {
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

      const { order }: { order: Order } = await response.json();

      setRecentOrders((prevOrders) =>
        prevOrders.map((o) =>
          o._id === orderId
            ? { ...o, shippingStatus: order.shippingStatus, paymentStatus: order.paymentStatus }
            : o
        )
      );

      const pendingOrdersRes = await fetch(
        "https://api-zeal.onrender.com/api/orders/admin/all?shippingStatus=pending",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!pendingOrdersRes.ok) {
        throw new Error("Lỗi khi tải lại danh sách đơn hàng đang chờ xử lý.");
      }

      const pendingOrdersData = await pendingOrdersRes.json();
      const filteredPendingOrders = pendingOrdersData.filter(
        (order: Order) => order.shippingStatus === "pending"
      );
      setPendingOrders(filteredPendingOrders);
      setFilteredPendingOrders(filteredPendingOrders);

      showNotification("Cập nhật trạng thái vận chuyển thành công", "success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
      console.error("Lỗi cập nhật trạng thái vận chuyển:", errorMessage);
      showNotification("Không thể cập nhật trạng thái vận chuyển", "error");
    } finally {
      setShowConfirm(null);
    }
  };

  const cancelConfirm = () => {
    setShowConfirm(null);
  };

  const handleCancelOrder = (orderId: string, currentStatus: string) => {
    if (currentStatus !== "pending") {
      showNotification("Chỉ có thể hủy đơn hàng khi trạng thái là Chờ xử lý", "error");
      return;
    }
    setShowCancelModal({ orderId, currentStatus });
    setSelectedCancelReason("");
    setCancelReasonInput("");
  };

  const confirmCancelOrder = async () => {
    if (!showCancelModal) return;
    const { orderId } = showCancelModal;
    const finalCancelReason = selectedCancelReason === "other" ? cancelReasonInput : selectedCancelReason;
    if (!finalCancelReason || finalCancelReason.trim() === "") {
      showNotification("Vui lòng chọn hoặc nhập lý do hủy đơn hàng", "error");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://api-zeal.onrender.com/api/orders/update/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shippingStatus: "cancelled",
          paymentStatus: "cancelled",
          cancelReason: finalCancelReason,
        }),
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
      setPendingOrders((prev) => prev.filter((o) => o._id !== orderId));
      setFilteredPendingOrders((prev) => prev.filter((o) => o._id !== orderId));
      showNotification("Hủy đơn hàng thành công", "success");
    } catch (error) {
      showNotification("Không thể hủy đơn hàng", "error");
    } finally {
      setShowCancelModal(null);
      setSelectedCancelReason("");
      setCancelReasonInput("");
    }
  };

  const handleToggleCommentDetails = (commentId: string) => {
    setSelectedCommentId(commentId);
  };

  const closeCommentDetails = () => {
    setSelectedCommentId(null);
    setReplyContent({});
    setIsEditingReply({});
  };

  const handleReplySubmit = async (commentId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
      }

      const content = replyContent[commentId]?.trim();
      if (!content) {
        showNotification("Nội dung phản hồi không được để trống.", "error");
        return;
      }

      const res = await fetch(`https://api-zeal.onrender.com/api/comments/${commentId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (res.status === 401 || res.status === 403) {
        showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        router.push("/user/login");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Lỗi khi gửi phản hồi.");
      }

      const updatedComment = await res.json();
      setComments((prevComments) =>
        prevComments.map((c) => (c._id === commentId ? updatedComment.comment : c))
      );
      setFilteredComments((prevComments) =>
        prevComments.map((c) => (c._id === commentId ? updatedComment.comment : c))
      );
      setReplyContent((prev) => ({ ...prev, [commentId]: "" }));
      showNotification("Phản hồi đã được gửi thành công!", "success");
      closeCommentDetails();
    } catch (error: any) {
      showNotification(error.message || "Lỗi khi gửi phản hồi.", "error");
    }
  };

  const handleEditReplyClick = (commentId: string, currentContent: string) => {
    setIsEditingReply((prev) => ({ ...prev, [commentId]: true }));
    setReplyContent((prev) => ({ ...prev, [commentId]: currentContent }));
  };

  const handleUpdateReply = async (commentId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
      }

      const content = replyContent[commentId]?.trim();
      if (!content) {
        showNotification("Nội dung phản hồi không được để trống.", "error");
        return;
      }

      console.log(`Sending PUT request to /api/comments/reply/${commentId}`);
      const res = await fetch(`https://api-zeal.onrender.com/api/comments/reply/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (res.status === 401 || res.status === 403) {
        showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        router.push("/user/login");
        return;
      }

      if (res.status === 404) {
        showNotification("Bình luận không tồn tại hoặc endpoint không khả dụng.", "error");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Lỗi khi cập nhật phản hồi.");
      }

      const updatedComment = await res.json();
      setComments((prevComments) =>
        prevComments.map((c) =>
          c._id === commentId ? updatedComment.comment : c
        )
      );
      setFilteredComments((prevComments) =>
        prevComments.map((c) =>
          c._id === commentId ? updatedComment.comment : c
        )
      );
      setReplyContent((prev) => ({ ...prev, [commentId]: "" }));
      setIsEditingReply((prev) => ({ ...prev, [commentId]: false }));
      showNotification("Phản hồi đã được cập nhật thành công!", "success");
      closeCommentDetails();
    } catch (error: any) {
      console.error("Error updating reply:", error);
      showNotification(error.message || "Lỗi khi cập nhật phản hồi.", "error");
    }
  };

  const handleCancelEdit = (commentId: string) => {
    setIsEditingReply((prev) => ({ ...prev, [commentId]: false }));
    setReplyContent((prev) => ({ ...prev, [commentId]: "" }));
  };

  const chartOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" as const },
        title: {
          display: true,
          text: `Báo cáo doanh thu theo ${
            timePeriod === "week"
              ? `${weeks[selectedWeek - 1]} (${months[selectedMonth]} ${selectedYear})`
              : timePeriod === "month"
              ? `tháng (${months[selectedMonth]} ${selectedYear})`
              : `năm ${selectedYear}`
          }`,
          font: { size: 16 },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => `Doanh thu: ${formatCurrency(context.raw)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "VND" },
          ticks: {
            callback: (tickValue: string | number) =>
              typeof tickValue === "number" ? formatCurrency(tickValue) : tickValue,
          },
        },
        x: {
          title: {
            display: true,
            text: timePeriod === "week" ? "Ngày" : timePeriod === "month" ? "Ngày" : "Tháng",
          },
          ticks: {
            maxTicksLimit: timePeriod === "month" ? 15 : 12,
          },
        },
      },
    }),
    [timePeriod, selectedMonth, selectedYear, selectedWeek, weeks]
  );

  const calculateRevenue = useMemo(() => {
    return (orders: Order[], period: string, month: number, year: number, week?: number): ChartData<"line"> => {
      const validOrders = orders.filter((o) => o.paymentStatus === "completed" && o.total >= 0);
      const labels: string[] = [];
      const revenueData: number[] = [];

      if (period === "week" && week !== undefined) {
        const firstDayOfMonth = new Date(year, month, 1);
        const firstMonday = new Date(firstDayOfMonth);
        if (firstDayOfMonth.getDay() !== 1) {
          const offset = firstDayOfMonth.getDay() === 0 ? -6 : 1 - firstDayOfMonth.getDay();
          firstMonday.setDate(firstDayOfMonth.getDate() + offset);
        }
        const weekStart = new Date(firstMonday);
        weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + i);
          labels.push(formatDate(day));

          const dayRevenue = validOrders
            .filter((order) => {
              const orderDate = new Date(order.createdAt);
              return (
                orderDate.getFullYear() === day.getFullYear() &&
                orderDate.getMonth() === day.getMonth() &&
                orderDate.getDate() === day.getDate()
              );
            })
            .reduce((sum, order) => sum + order.total, 0);
          revenueData.push(dayRevenue);
        }
      } else if (period === "month") {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          labels.push(`${i}/${month + 1}`);
          const dayRevenue = validOrders
            .filter((order) => {
              const orderDate = new Date(order.createdAt);
              return (
                orderDate.getFullYear() === year &&
                orderDate.getMonth() === month &&
                orderDate.getDate() === i
              );
            })
            .reduce((sum, order) => sum + order.total, 0);
          revenueData.push(dayRevenue);
        }
      } else if (period === "year") {
        for (let i = 0; i < 12; i++) {
          labels.push(months[i]);
          const monthRevenue = validOrders
            .filter((order) => {
              const orderDate = new Date(order.createdAt);
              return orderDate.getFullYear() === year && orderDate.getMonth() === i;
            })
            .reduce((sum, order) => sum + order.total, 0);
          revenueData.push(monthRevenue);
        }
      }

      return {
        labels: labels.length ? labels : ["Không có dữ liệu"],
        datasets: [
          {
            label: "Doanh thu",
            data: revenueData.length ? revenueData : [0],
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.3,
          },
        ],
      };
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/user/login");
      return;
    }

    let decoded: DecodedToken;
    try {
      decoded = jwtDecode<DecodedToken>(token);
      if (decoded.role !== "admin") {
        setError("Bạn không có quyền truy cập trang này.");
        return;
      }
    } catch (err) {
      console.error("Lỗi khi giải mã token:", err);
      setError("Token không hợp lệ.");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ordersRes, usersRes, commentsRes, pendingOrdersRes] = await Promise.all([
          fetch("https://api-zeal.onrender.com/api/orders/admin/all", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("https://api-zeal.onrender.com/api/users", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("https://api-zeal.onrender.com/api/comments/", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("https://api-zeal.onrender.com/api/orders/admin/all?shippingStatus=pending", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!ordersRes.ok || !usersRes.ok || !pendingOrdersRes.ok) {
          throw new Error("Lỗi khi tải dữ liệu từ API.");
        }

        const [orders, users, commentsData, pendingOrdersData] = await Promise.all([
          ordersRes.json() as Promise<Order[]>,
          usersRes.json() as Promise<User[]>,
          commentsRes.json() as Promise<Comment[]>,
          pendingOrdersRes.json() as Promise<Order[]>,
        ]);

        let comments: Comment[] = [];
        if (commentsRes.status === 403) {
          console.warn("Không có quyền xem bình luận. Fallback 0.");
        } else if (commentsRes.ok) {
          comments = commentsData;
        }

        const filteredPendingOrders = pendingOrdersData.filter(
          (order) => order.shippingStatus === "pending"
        );

        const isInPeriod = (date: Date): boolean => {
          if (timePeriod === "week") {
            const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
            const firstMonday = new Date(firstDayOfMonth);
            if (firstDayOfMonth.getDay() !== 1) {
              const offset = firstDayOfMonth.getDay() === 0 ? -6 : 1 - firstDayOfMonth.getDay();
              firstMonday.setDate(firstDayOfMonth.getDate() + offset);
            }
            const weekStart = new Date(firstMonday);
            weekStart.setDate(firstMonday.getDate() + (selectedWeek - 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return date >= weekStart && date <= weekEnd;
          }
          if (timePeriod === "month") {
            const firstDay = new Date(selectedYear, selectedMonth, 1);
            const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
            return date >= firstDay && date <= lastDay;
          }
          const firstDayYear = new Date(selectedYear, 0, 1);
          const lastDayYear = new Date(selectedYear, 11, 31);
          return date >= firstDayYear && date <= lastDayYear;
        };

        const ordersInPeriod = orders.filter((o) => isInPeriod(new Date(o.createdAt)));
        const revenue = ordersInPeriod
          .filter((o) => o.paymentStatus === "completed")
          .reduce((sum, o) => sum + o.total, 0);
        const newUsers = users.filter((u) => isInPeriod(new Date(u.createdAt))).length;
        const newComments = comments.filter((c) => isInPeriod(new Date(c.createdAt))).length;

        setStats({ orders: ordersInPeriod.length, newUsers, revenue, newComments });
        setChartData(calculateRevenue(orders, timePeriod, selectedMonth, selectedYear, selectedWeek));
        setRecentOrders(
          orders
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
        );
        setPendingOrders(filteredPendingOrders);
        setFilteredPendingOrders(filteredPendingOrders);
        setComments(comments);
        setFilteredComments(comments);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu:", err);
        setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timePeriod, selectedMonth, selectedYear, selectedWeek, router, calculateRevenue]);

  useEffect(() => {
    const filtered = pendingOrders.filter((order) => {
      const matchesSearch =
        order._id.toLowerCase().includes(searchQueryOrders.toLowerCase()) ||
        (order.user?.username &&
          order.user.username.toLowerCase().includes(searchQueryOrders.toLowerCase())) ||
        order.paymentMethod.toLowerCase().includes(searchQueryOrders.toLowerCase());
      return matchesSearch;
    });
    setFilteredPendingOrders(filtered);
    setCurrentPageOrders(1);
  }, [searchQueryOrders, pendingOrders]);

  useEffect(() => {
    const filtered = comments.filter((comment) => {
      const matchesSearch =
        comment.content.toLowerCase().includes(searchQueryComments.toLowerCase()) ||
        (comment.user?.username &&
          comment.user.username.toLowerCase().includes(searchQueryComments.toLowerCase())) ||
        (comment.product?.name &&
          comment.product.name.toLowerCase().includes(searchQueryComments.toLowerCase())) ||
        (comment.adminReply?.content &&
          comment.adminReply.content.toLowerCase().includes(searchQueryComments.toLowerCase())) ||
        (comment.videos &&
          comment.videos.some((video) =>
            video.public_id.toLowerCase().includes(searchQueryComments.toLowerCase())
          )) ||
        (comment.images &&
          comment.images.some((image) =>
            image.public_id.toLowerCase().includes(searchQueryComments.toLowerCase())
          ));
      return matchesSearch;
    });
    setFilteredComments(filtered);
    setCurrentPageComments(1);
  }, [searchQueryComments, comments]);

  const totalPagesOrders = Math.ceil(filteredPendingOrders.length / ordersPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPageOrders - 1) * ordersPerPage;
    return filteredPendingOrders.slice(startIndex, startIndex + ordersPerPage);
  }, [filteredPendingOrders, currentPageOrders]);

  const totalPagesComments = Math.ceil(filteredComments.length / commentsPerPage);
  const indexOfLastComment = currentPageComments * commentsPerPage;
  const indexOfFirstComment = indexOfLastComment - commentsPerPage;
  const currentComments = filteredComments.slice(indexOfFirstComment, indexOfLastComment);

  const handlePageChangeOrders = (page: number) => {
    if (page >= 1 && page <= totalPagesOrders) {
      setCurrentPageOrders(page);
    }
  };

  const handlePageChangeComments = (page: number) => {
    if (page >= 1 && page <= totalPagesComments) {
      setCurrentPageComments(page);
      setSelectedCommentId(null);
    }
  };

  const getPaginationInfoOrders = () => {
    const visiblePages: number[] = [];
    let showPrevEllipsis = false;
    let showNextEllipsis = false;

    if (totalPagesOrders <= 3) {
      for (let i = 1; i <= totalPagesOrders; i++) {
        visiblePages.push(i);
      }
    } else {
      if (currentPageOrders === 1) {
        visiblePages.push(1, 2, 3);
        showNextEllipsis = totalPagesOrders > 3;
      } else if (currentPageOrders === totalPagesOrders) {
        visiblePages.push(totalPagesOrders - 2, totalPagesOrders - 1, totalPagesOrders);
        showPrevEllipsis = totalPagesOrders > 3;
      } else {
        visiblePages.push(currentPageOrders - 1, currentPageOrders, currentPageOrders + 1);
        showPrevEllipsis = currentPageOrders > 2;
        showNextEllipsis = currentPageOrders < totalPagesOrders - 1;
      }
    }

    return { visiblePages, showPrevEllipsis, showNextEllipsis };
  };

  const getPaginationInfoComments = () => {
    const visiblePages: number[] = [];
    let showPrevEllipsis = false;
    let showNextEllipsis = false;

    if (totalPagesComments <= 3) {
      for (let i = 1; i <= totalPagesComments; i++) {
        visiblePages.push(i);
      }
    } else {
      if (currentPageComments === 1) {
        visiblePages.push(1, 2, 3);
        showNextEllipsis = totalPagesComments > 3;
      } else if (currentPageComments === totalPagesComments) {
        visiblePages.push(totalPagesComments - 2, totalPagesComments - 1, totalPagesComments);
        showPrevEllipsis = totalPagesComments > 3;
      } else {
        visiblePages.push(currentPageComments - 1, currentPageComments, currentPageComments + 1);
        showPrevEllipsis = currentPageComments > 2;
        showNextEllipsis = currentPageComments < totalPagesComments - 1;
      }
    }

    return { visiblePages, showPrevEllipsis, showNextEllipsis };
  };

  return (
    <div className={styles.mainContent}>
      {notification.show && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          {notification.message}
        </div>
      )}
      <header className={styles.dashboardHeader}>
        <h2>Dashboard</h2>
      </header>

      <div className={styles.controls}>
        <div className={styles.buttonGroup}>
          {(["week", "month", "year"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setTimePeriod(p)}
              className={`${styles.timePeriodButton} ${timePeriod === p ? styles.active : ""}`}
              disabled={loading}
            >
              {p === "week" ? "Tuần" : p === "month" ? "Tháng" : "Năm"}
            </button>
          ))}
        </div>
        <div className={styles.dateSelectors}>
          {timePeriod === "week" && (
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className={styles.select}
              disabled={loading}
            >
              {weeks.map((week, index) => (
                <option key={index} value={index + 1}>
                  {week}
                </option>
              ))}
            </select>
          )}
          {(timePeriod === "week" || timePeriod === "month") && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className={styles.select}
              disabled={loading}
            >
              {months.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>
          )}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className={styles.select}
            disabled={loading}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className={styles.statsContainer}>
        <div className={styles.statBox}>
          <h3>{loading ? "..." : stats.orders}</h3>
          <p>Đơn hàng</p>
        </div>
        <div className={styles.statBox}>
          <h3>{loading ? "..." : stats.newUsers}</h3>
          <p>Người dùng mới</p>
        </div>
        <div className={styles.statBox}>
          <h3>{loading ? "..." : formatCurrency(stats.revenue)}</h3>
          <p>Doanh thu</p>
        </div>
        <div className={styles.statBox}>
          <h3>{loading ? "..." : stats.newComments}</h3>
          <p>Bình luận mới</p>
        </div>
      </section>

      <section className={styles.chartContainer}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Đang tải biểu đồ...</p>
          </div>
        ) : error ? (
          <p className={styles.errorMessage}>{error}</p>
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </section>

      <div className={styles.tablesContainer}>
        <section className={styles.recentOrders}>
          <div className={styles.sectionHeader}>
            <h3>Đơn hàng đang chờ xử lý</h3>
            <div className={styles.filterContainer}>
              <input
                type="text"
                placeholder="Tìm kiếm theo ID, tên người dùng, phương thức thanh toán..."
                value={searchQueryOrders}
                onChange={(e) => setSearchQueryOrders(e.target.value)}
                className={styles.searchInput}
                aria-label="Tìm kiếm đơn hàng"
              />
            </div>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.productTable}>
              <thead className={styles.productTableThead}>
                <tr>
                  <th>ID</th>
                  <th>Tên</th>
                  <th>Tổng Tiền</th>
                  <th>Ngày</th>
                  <th>Trạng Thái Thanh Toán</th>
                  <th>Trạng Thái Vận Chuyển</th>
                  <th>Phương Thức Thanh Toán</th>
                </tr>
              </thead>
              <tbody>
                {loading && filteredPendingOrders.length === 0 ? (
                  <tr key="loading-orders">
                    <td colSpan={7} style={{ textAlign: "center" }}>
                      <div className={styles.processingIndicator}>
                        <FontAwesomeIcon icon={faRedo} spin />
                        <p>Đang tải...</p>
                      </div>
                    </td>
                  </tr>
                ) : error && filteredPendingOrders.length === 0 ? (
                  <tr key="error-orders">
                    <td colSpan={7} style={{ textAlign: "center" }}>
                      <p className={styles.errorMessage}>{error}</p>
                      <button
                        className={styles.retryButton}
                        onClick={async () => {
                          setLoading(true);
                          setError(null);
                          try {
                            const token = localStorage.getItem("token");
                            if (!token) {
                              throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
                            }
                            const pendingOrdersRes = await fetch(
                              "https://api-zeal.onrender.com/api/orders/admin/all?shippingStatus=pending",
                              {
                                headers: { Authorization: `Bearer ${token}` },
                              }
                            );
                            if (!pendingOrdersRes.ok) {
                              throw new Error("Lỗi khi tải lại danh sách đơn hàng đang chờ xử lý.");
                            }
                            const pendingOrdersData = await pendingOrdersRes.json();
                            const filteredPendingOrders = pendingOrdersData.filter(
                              (order: Order) => order.shippingStatus === "pending"
                            );
                            setPendingOrders(filteredPendingOrders);
                            setFilteredPendingOrders(filteredPendingOrders);
                          } catch (err) {
                            console.error("Lỗi khi tải dữ liệu:", err);
                            setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        title="Thử lại"
                      >
                        <FontAwesomeIcon icon={faRedo} />
                      </button>
                    </td>
                  </tr>
                ) : paginatedOrders.length > 0 ? (
                  paginatedOrders.map((order, index) => (
                    <tr key={order._id} className={styles.productRow}>
                      <td>{(currentPageOrders - 1) * ordersPerPage + index + 1}</td>
                      <td>{order.user?.username || "Không xác định"}</td>
                      <td>{order.total.toLocaleString()} VND</td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>{getVietnamesePaymentStatus(order.paymentStatus)}</td>
                      <td>
                        <select
                          value={getVietnameseShippingStatus(order.shippingStatus)}
                          onChange={(e) =>
                            handleShippingStatusChange(order._id, e.target.value, order.shippingStatus)
                          }
                          className={styles.categorySelect}
                          onClick={(e) => e.stopPropagation()}
                          disabled={order.shippingStatus === "returned"}
                        >
                          {allStatuses.map((status) => (
                            <option
                              key={status.value}
                              value={status.label}
                              disabled={
                                order.shippingStatus === "returned" ||
                                (status.value !== "cancelled" &&
                                  !statusProgression[order.shippingStatus].includes(status.value) &&
                                  status.value !== order.shippingStatus) ||
                                (status.value === "cancelled" && order.shippingStatus !== "pending")
                              }
                            >
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {order.paymentMethod === "cod"
                          ? "Thanh toán khi nhận hàng"
                          : order.paymentMethod === "bank"
                          ? "Chuyển khoản"
                          : order.paymentMethod || "Không xác định"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr key="empty-orders">
                    <td colSpan={7} className={styles.emptyState}>
                      <h3>Chưa có đơn hàng đang chờ xử lý</h3>
                      <p>Hiện tại không có đơn hàng nào phù hợp với bộ lọc.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPagesOrders > 1 && (
            <div className={styles.pagination}>
              {(() => {
                const { visiblePages, showPrevEllipsis, showNextEllipsis } = getPaginationInfoOrders();
                return (
                  <>
                    {showPrevEllipsis && (
                      <>
                        <button
                          className={`${styles.paginationButton} ${styles.firstLastPage}`}
                          onClick={() => handlePageChangeOrders(1)}
                          disabled={loading}
                          title="Trang đầu tiên"
                        >
                          1
                        </button>
                        <div
                          className={styles.ellipsis}
                          onClick={() => handlePageChangeOrders(Math.max(1, currentPageOrders - 3))}
                          title="Trang trước đó"
                        >
                          ...
                        </div>
                      </>
                    )}
                    {visiblePages.map((page) => (
                      <button
                        key={page}
                        className={`${styles.paginationButton} ${
                          currentPageOrders === page ? styles.active : ""
                        }`}
                        onClick={() => handlePageChangeOrders(page)}
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
                          onClick={() => handlePageChangeOrders(Math.min(totalPagesOrders, currentPageOrders + 3))}
                          title="Trang tiếp theo"
                        >
                          ...
                        </div>
                        <button
                          className={`${styles.paginationButton} ${styles.firstLastPage}`}
                          onClick={() => handlePageChangeOrders(totalPagesOrders)}
                          disabled={loading}
                          title="Trang cuối cùng"
                        >
                          {totalPagesOrders}
                        </button>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </section>

        <section className={styles.recentComments}>
          <div className={styles.sectionHeader}>
            <h3>Đánh giá mới</h3>
            <div className={styles.filterContainer}>
              <input
                type="text"
                placeholder="Tìm kiếm theo nội dung, người dùng, sản phẩm..."
                value={searchQueryComments}
                onChange={(e) => setSearchQueryComments(e.target.value)}
                className={styles.searchInput}
                aria-label="Tìm kiếm Đánh giá"
              />
            </div>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.productTable}>
              <thead className={styles.productTableThead}>
                <tr>
                  <th>Người dùng</th>
                  <th>Sản phẩm</th>
                  <th>Số sao</th>
                </tr>
              </thead>
              <tbody>
                {loading && comments.length === 0 ? (
                  <tr key="loading-comments">
                    <td colSpan={4} style={{ textAlign: "center" }}>
                      <div className={styles.processingIndicator}>
                        <FontAwesomeIcon icon={faRedo} spin />
                        <p>Đang tải danh sách Đánh giá...</p>
                      </div>
                    </td>
                  </tr>
                ) : error && comments.length === 0 ? (
                  <tr key="error-comments">
                    <td colSpan={4} style={{ textAlign: "center" }}>
                      <p className={styles.errorMessage}>{error}</p>
                      <button
                        className={styles.retryButton}
                        onClick={async () => {
                          setLoading(true);
                          setError(null);
                          try {
                            const token = localStorage.getItem("token");
                            if (!token) {
                              throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
                            }
                            const res = await fetch("https://api-zeal.onrender.com/api/comments", {
                              method: "GET",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              cache: "no-store",
                            });
                            if (res.status === 401 || res.status === 403) {
                              showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
                              localStorage.removeItem("token");
                              localStorage.removeItem("role");
                              router.push("/user/login");
                              return;
                            }
                            if (!res.ok) {
                              throw new Error(`Lỗi khi tải danh sách Đánh giá: ${res.status}`);
                            }
                            const data: Comment[] = await res.json();
                            if (!Array.isArray(data)) {
                              throw new Error("Dữ liệu Đánh giá không hợp lệ");
                            }
                            setComments(data);
                            setFilteredComments(data);
                          } catch (error: any) {
                            const errorMessage = error.message || "Không thể tải danh sách Đánh giá.";
                            showNotification(errorMessage, "error");
                            setError(errorMessage);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        title="Thử lại"
                      >
                        <FontAwesomeIcon icon={faRedo} />
                      </button>
                    </td>
                  </tr>
                ) : currentComments.length > 0 ? (
                  currentComments.map((comment) => (
                    <tr
                      key={comment._id}
                      onClick={() => handleToggleCommentDetails(comment._id)}
                      className={`${styles.productRow} ${
                        selectedCommentId === comment._id ? styles.productRowActive : ""
                      }`}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        {comment.user
                          ? `${comment.user.username} (${comment.user.email})`
                          : "Người dùng không tồn tại"}
                      </td>
                      <td>{comment.product?.name || "Sản phẩm không tồn tại"}</td>
                      <td>{renderStars(comment.rating)}</td>
                    </tr>
                  ))
                ) : (
                  <tr key="empty-comments">
                    <td colSpan={4} className={styles.emptyState}>
                      <h3>Không có Đánh giá</h3>
                      <p>Chưa có Đánh giá nào phù hợp với bộ lọc.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPagesComments > 1 && (
            <div className={styles.pagination}>
              {(() => {
                const { visiblePages, showPrevEllipsis, showNextEllipsis } = getPaginationInfoComments();
                return (
                  <>
                    {showPrevEllipsis && (
                      <>
                        <button
                          className={`${styles.paginationButton} ${styles.firstLastPage}`}
                          onClick={() => handlePageChangeComments(1)}
                          disabled={loading}
                          title="Trang đầu tiên"
                        >
                          1
                        </button>
                        <div
                          className={styles.ellipsis}
                          onClick={() => handlePageChangeComments(Math.max(1, currentPageComments - 3))}
                          title="Trang trước đó"
                        >
                          ...
                        </div>
                      </>
                    )}
                    {visiblePages.map((page) => (
                      <button
                        key={page}
                        className={`${styles.paginationButton} ${
                          currentPageComments === page ? styles.active : ""
                        }`}
                        onClick={() => handlePageChangeComments(page)}
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
                          onClick={() => handlePageChangeComments(Math.min(totalPagesComments, currentPageComments + 3))}
                          title="Trang tiếp theo"
                        >
                          ...
                        </div>
                        <button
                          className={`${styles.paginationButton} ${styles.firstLastPage}`}
                          onClick={() => handlePageChangeComments(totalPagesComments)}
                          disabled={loading}
                          title="Trang cuối cùng"
                        >
                          {totalPagesComments}
                        </button>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </section>
      </div>

      {selectedCommentId && (
        <div className={styles.modalOverlay} onClick={closeCommentDetails}>
          <div className={styles.commentModal} onClick={(e) => e.stopPropagation()}>
            {comments.find((comment) => comment._id === selectedCommentId) && (
              (() => {
                const comment = comments.find((comment) => comment._id === selectedCommentId)!;
                return (
                  <>
                    <h2>Chi tiết Đánh giá</h2>
                    <div className={styles.commentDetails}>
                      <div className={styles.detailsContainer}>
                        <div className={styles.detailsSection}>
                          <h4>Thông tin người dùng</h4>
                          <div className={styles.detailsGrid}>
                            <p>
                              <strong>Tên người dùng:</strong> {comment.user?.username || "Không có"}
                            </p>
                            <p>
                              <strong>Email:</strong> {comment.user?.email || "Không có"}
                            </p>
                          </div>
                        </div>
                        <div className={styles.detailsSection}>
                          <h4>Nội dung Đánh giá</h4>
                          <p>{comment.content}</p>
                        </div>
                        <div className={styles.detailsSection}>
                          <h4>Số sao</h4>
                          <p>{renderStars(comment.rating)} ({comment.rating || 0}/5)</p>
                        </div>
                        <div className={styles.detailsSection}>
                          <h4>Thông tin sản phẩm</h4>
                          <div className={styles.detailsGrid}>
                            <p>
                              <strong>Tên sản phẩm:</strong> {comment.product?.name || "Không có"}
                            </p>
                          
                          </div>
                        </div>
                        <div className={styles.detailsSection}>
                          <h4>Ngày Đánh giá</h4>
                          <p>{formatCommentDate(comment.createdAt)}</p>
                        </div>
                        <div className={styles.detailsSection}>
                          <h4>Hình ảnh</h4>
                          {comment.images && comment.images.length > 0 ? (
                            <div className={styles.mediaContainer}>
                              {comment.images.map((image, index) => (
                                <div key={index} className={styles.mediaItem}>
                                  <img
                                    src={normalizeImageUrl(image.url)}
                                    alt={`Hình ảnh ${image.public_id}`}
                                    className={styles.commentImage}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p>Không có hình ảnh nào được đính kèm.</p>
                          )}
                        </div>
                        <div className={styles.detailsSection}>
                          <h4>Video</h4>
                          {comment.videos && comment.videos.length > 0 ? (
                            <div className={styles.mediaContainer}>
                              {comment.videos.map((video, index) => (
                                <div key={index} className={styles.mediaItem}>
                                  <video
                                    src={normalizeImageUrl(video.url)}
                                    controls
                                    className={styles.commentVideo}
                                    onError={(e) => {
                                      (e.target as HTMLVideoElement).poster =
                                        "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p>Không có video nào được đính kèm.</p>
                          )}
                        </div>
                        <div className={styles.detailsSection}>
                          <h4>Phản hồi từ admin</h4>
                          {comment.adminReply ? (
                            isEditingReply[comment._id] ? (
                              <div>
                                <textarea
                                  value={replyContent[comment._id] || ""}
                                  onChange={(e) =>
                                    setReplyContent({
                                      ...replyContent,
                                      [comment._id]: e.target.value,
                                    })
                                  }
                                  placeholder="Chỉnh sửa phản hồi của bạn..."
                                  className={styles.replyInput}
                                  aria-label="Chỉnh sửa phản hồi từ admin"
                                />
                                <div className={styles.buttonGroup}>
                                  <button
                                    onClick={() => handleUpdateReply(comment._id)}
                                    className={styles.replyButton}
                                    disabled={!replyContent[comment._id]?.trim()}
                                    title="Cập nhật phản hồi"
                                    aria-label="Cập nhật phản hồi từ admin"
                                  >
                                    Cập nhật phản hồi
                                  </button>
                                  <button
                                    onClick={() => handleCancelEdit(comment._id)}
                                    className={styles.cancelButton}
                                    title="Hủy chỉnh sửa"
                                    aria-label="Hủy chỉnh sửa phản hồi"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className={styles.detailsGrid}>
                                <p>
                                  <strong>Người phản hồi:</strong>{" "}
                                  {comment.adminReply.user?.username || "Không có"}
                                </p>
                                <p>
                                  <strong>Nội dung:</strong> {comment.adminReply.content}
                                </p>
                                <p>
                                  <strong>Ngày phản hồi:</strong>{" "}
                                  {formatCommentDate(comment.adminReply.createdAt)}
                                </p>
                                {comment.adminReply.updatedAt && (
                                  <p>
                                    <strong>Ngày cập nhật:</strong>{" "}
                                    {formatCommentDate(comment.adminReply.updatedAt)}
                                  </p>
                                )}
                                <button
                                  onClick={() =>
                                    handleEditReplyClick(
                                      comment._id,
                                      comment.adminReply!.content
                                    )
                                  }
                                  className={styles.editButton}
                                  title="Chỉnh sửa phản hồi"
                                  aria-label="Chỉnh sửa phản hồi từ admin"
                                >
                                  <FontAwesomeIcon icon={faEdit} /> Chỉnh sửa
                                </button>
                              </div>
                            )
                          ) : (
                            <div>
                              <p>Chưa có phản hồi</p>
                              <textarea
                                value={replyContent[comment._id] || ""}
                                onChange={(e) =>
                                  setReplyContent({
                                    ...replyContent,
                                    [comment._id]: e.target.value,
                                  })
                                }
                                placeholder="Nhập phản hồi của bạn..."
                                className={styles.replyInput}
                                aria-label="Phản hồi từ admin"
                              />
                              <button
                                onClick={() => handleReplySubmit(comment._id)}
                                className={styles.replyButton}
                                disabled={!replyContent[comment._id]?.trim()}
                                title="Gửi phản hồi"
                                aria-label="Gửi phản hồi từ admin"
                              >
                                Gửi phản hồi
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalhuy}>
            <h2>Xác nhận hủy đơn hàng</h2>
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
                className={styles.cancelReasonInput}
                style={{ marginTop: "10px" }}
                aria-label="Nhập lý do hủy đơn hàng tùy chỉnh"
              />
            )}
            <div className={styles.modalActions}>
              <button
                className={styles.confirmBtn}
                onClick={confirmCancelOrder}
                disabled={
                  !selectedCancelReason ||
                  (selectedCancelReason === "other" && !cancelReasonInput.trim())
                }
                title="Xác nhận"
                aria-label="Xác nhận hủy đơn hàng"
              >
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowCancelModal(null)}
                title="Hủy"
                aria-label="Hủy thay đổi trạng thái"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Xác Nhận Thay Đổi Trạng Thái</h2>
            <p>
              Bạn có chắc chắn muốn chuyển trạng thái vận chuyển sang{" "}
              <strong>{showConfirm.newStatus}</strong>?{" "}
              {showConfirm.newStatus === "Đã giao hàng" ? (
                <>
                  Trạng thái thanh toán sẽ được cập nhật thành <strong>Đã thanh toán</strong>.
                </>
              ) : showConfirm.newStatus === "Đã hoàn" ? (
                <>
                  Trạng thái thanh toán sẽ được cập nhật thành <strong>Đã hoàn</strong>.
                </>
              ) : null}
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.confirmBtn}
                onClick={confirmStatusChange}
                aria-label="Xác nhận thay đổi trạng thái"
              >
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button
                className={styles.cancelBtn}
                onClick={cancelConfirm}
                aria-label="Hủy thay đổi trạng thái"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AD_Home;