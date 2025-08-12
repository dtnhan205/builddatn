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
import { faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

// Interfaces
interface Product {
  _id: string;
  name: string;
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

interface Comment {
  _id: string;
  createdAt: string;
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
];

const getVietnamesePaymentStatus = (paymentStatus: string): string => {
  return paymentStatusMapping[paymentStatus as keyof typeof paymentStatusMapping] || paymentStatus;
};

const getVietnameseShippingStatus = (shippingStatus: string): string => {
  return shippingStatusMapping[shippingStatus as keyof typeof shippingStatusMapping] || shippingStatus;
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ordersPerPage = 10;

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear - i);
  }, []);

  const months = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
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

      // Update recentOrders locally
      setRecentOrders((prevOrders) =>
        prevOrders.map((o) =>
          o._id === orderId
            ? { ...o, shippingStatus: order.shippingStatus, paymentStatus: order.paymentStatus }
            : o
        )
      );

      // Re-fetch pending orders to reload the table
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

        const [orders, users, pendingOrdersData] = await Promise.all([
          ordersRes.json() as Promise<Order[]>,
          usersRes.json() as Promise<User[]>,
          pendingOrdersRes.json() as Promise<Order[]>,
        ]);

        let comments: Comment[] = [];
        if (commentsRes.status === 403) {
          console.warn("Không có quyền xem bình luận. Fallback 0.");
        } else if (commentsRes.ok) {
          comments = await commentsRes.json();
        }

        // Explicitly filter pendingOrders to ensure only "pending" status
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
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu:", err);
        setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timePeriod, selectedMonth, selectedYear, selectedWeek, router, calculateRevenue]);

  // Pagination logic
  const totalPages = Math.ceil(pendingOrders.length / ordersPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ordersPerPage;
    return pendingOrders.slice(startIndex, startIndex + ordersPerPage);
  }, [pendingOrders, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
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

      <section className={styles.recentOrders}>
        <div className={styles.sectionHeader}>
          <h3>Đơn hàng đang chờ xử lý</h3>
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
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    Đang tải...
                  </td>
                </tr>
              ) : paginatedOrders.length > 0 ? (
                paginatedOrders.map((order, index) => (
                  <tr key={order._id} className={styles.productRow}>
                    <td>{(currentPage - 1) * ordersPerPage + index + 1}</td>
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
                              (!statusProgression[order.shippingStatus].includes(status.value) &&
                                status.value !== order.shippingStatus)
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
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    <h3>Chưa có đơn hàng đang chờ xử lý</h3>
                    <p>Hiện tại không có đơn hàng nào đang chờ xử lý.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={styles.paginationButton}
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`${styles.paginationButton} ${currentPage === page ? styles.active : ""}`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={styles.paginationButton}
            >
              Sau
            </button>
          </div>
        )}
      </section>

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