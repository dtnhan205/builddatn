"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "./PaymentOnline.module.css";

const API_BASE_URL = "https://api-zeal.onrender.com/api";
const PAYMENT_TIMEOUT = 24 * 60 * 60 * 1000; // 24 giờ tính bằng ms

export default function PaymentOnline() {
  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState("Đang chờ thanh toán...");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(PAYMENT_TIMEOUT);
  const router = useRouter();
  const searchParams = useSearchParams();
  const intervalRef = useRef(null);

  const paymentCode = searchParams.get("paymentCode") || "";
  const amount = parseFloat(searchParams.get("amount") || "");
  const shippingStatus = searchParams.get("shippingStatus") || "pending";

  // Hàm format thời gian còn lại
  const formatTimeLeft = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}:${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Hàm kiểm tra trạng thái thanh toán
  const checkPaymentStatus = useCallback(async () => {
    if (!paymentCode || !paymentCode.match(/^thanhtoan\d{5}$/)) {
      setError("Mã thanh toán không hợp lệ");
      toast.error("Mã thanh toán không hợp lệ");
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      setError("Số tiền không hợp lệ");
      toast.error("Số tiền không hợp lệ");
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Vui lòng đăng nhập để tiếp tục");
      }

      const response = await fetch(`${API_BASE_URL}/payments/check-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentCode, amount }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
        } else if (response.status === 404) {
          throw new Error("Thanh toán không tồn tại");
        } else if (response.status === 400) {
          throw new Error(errorData.message || "Mã thanh toán hoặc số tiền không hợp lệ");
        } else if (response.status >= 500) {
          throw new Error("Lỗi server. Vui lòng thử lại sau");
        }
        throw new Error(`Lỗi API: ${response.status}`);
      }

      const result = await response.json();
      console.log("Response from checkPaymentStatus:", result);

      if (result.status === "error" || !result.data) {
        throw new Error(result.message || "Không nhận được dữ liệu trạng thái");
      }

      const paymentData = result.data || {};
      setMessage(
        paymentData.status === "success" && paymentData.paymentStatus === "completed"
          ? "Thanh toán thành công"
          : paymentData.status === "expired"
          ? "Thanh toán đã hết hạn"
          : "Đang chờ thanh toán..."
      );
      setOrder({
        paymentCode: paymentData.paymentCode,
        status: paymentData.status,
        transactionId: paymentData.transactionId,
        orderId: paymentData.orderId,
      });

      const dataToSave = {
        status: paymentData.status,
        timestamp: new Date().getTime(),
      };
      localStorage.setItem(`payment_${paymentCode}`, JSON.stringify(dataToSave));
      localStorage.setItem(`amount_${paymentCode}`, amount.toString());

      if (paymentData.status === "success" && paymentData.paymentStatus === "completed") {
        toast.success("Thanh toán thành công!");
        localStorage.removeItem(`payment_${paymentCode}`);
        localStorage.removeItem(`amount_${paymentCode}`);
        if (intervalRef.current) clearInterval(intervalRef.current);
        const today = new Date();
        const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
        setTimeout(() => {
          router.push(
            `/payment-done?orderId=${encodeURIComponent(paymentData.orderId)}&date=${encodeURIComponent(formattedDate)}&total=${encodeURIComponent(amount)}&paymentMethod=bank`
          );
        }, 2000);
      } else if (paymentData.status === "expired") {
        toast.warn("Thanh toán đã hết hạn.");
        localStorage.removeItem(`payment_${paymentCode}`);
        localStorage.removeItem(`amount_${paymentCode}`);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(() => router.push("/user/"), 2000);
      }
    } catch (error) {
      const errorMessage = error.message || "Có lỗi xảy ra khi kiểm tra thanh toán.";
      setError(errorMessage);
      toast.error(errorMessage);
      if (error.message.includes("đăng nhập")) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        setTimeout(() => router.push("/user/login"), 2000);
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    } finally {
      setIsLoading(false);
    }
  }, [paymentCode, amount, router]);

  useEffect(() => {
    if (!paymentCode || !paymentCode.match(/^thanhtoan\d{5}$/)) {
      setError("Mã thanh toán không hợp lệ hoặc thiếu trong URL");
      toast.error("Mã thanh toán không hợp lệ hoặc thiếu trong URL");
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      setError("Số tiền không hợp lệ");
      toast.error("Số tiền không hợp lệ");
      return;
    }

    checkPaymentStatus();

    intervalRef.current = setInterval(checkPaymentStatus, 5000);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(intervalRef.current);
          clearInterval(timer);
          setMessage("Thanh toán đã hết hạn");
          toast.error("Thanh toán đã hết hạn");
          localStorage.removeItem(`payment_${paymentCode}`);
          localStorage.removeItem(`amount_${paymentCode}`);
          setTimeout(() => router.push("/user/"), 2000);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timer);
    };
  }, [checkPaymentStatus, paymentCode, amount, router]);

  useEffect(() => {
    const handleUnload = () => {
      if (paymentCode) {
        localStorage.removeItem(`payment_${paymentCode}`);
        localStorage.removeItem(`amount_${paymentCode}`);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [paymentCode]);

  const qrUrl = `https://img.vietqr.io/image/mbbank-0342031354-compact.jpg?amount=${amount}&addInfo=${paymentCode}&accountName=Đinh%20Thế%20Nhân`;

  return (
    <div className={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className={styles.header}>
        <h2>Thanh Toán Online</h2>
        <div className={styles.qrContainer}>
          <div className={styles.qrInfo}>
            <p><span>Ngân Hàng:</span> MBBANK</p>
            <p><span>Số tài khoản:</span> 0342031354</p>
            <p><span>Chủ tài khoản:</span> Đinh Thế Nhân</p>
            <p>
              <span>Số tiền cần thanh toán:</span>{" "}
              {isNaN(amount) ? "Không hợp lệ" : new Intl.NumberFormat("vi-VN").format(amount)} VND
            </p>
            <p><span>Nội dung chuyển khoản:</span> {paymentCode || "N/A"}</p>
            <p><span>Trạng thái:</span> {message}</p>
            <p><span>Thời gian còn lại:</span> {formatTimeLeft(timeLeft)}</p>
            {order?.transactionId && (
              <>
                <p><span>Mã giao dịch:</span> {order.transactionId}</p>
                <p><span>Mã đơn hàng:</span> {order.orderId}</p>
              </>
            )}
          </div>
          <div className={styles.qrCode}>
            <img src={qrUrl} alt="QR Code" onError={() => setError("Không tải được mã QR")} />
          </div>
        </div>

        <p className={styles.note}>Vui lòng thanh toán trong vòng 24 giờ để hoàn tất giao dịch.</p>
        <div className={styles.buttonGroup}>
          <button
            className={styles.backBtn}
            onClick={() => router.push("/user/")}
            disabled={isLoading}
          >
            Quay Lại
          </button>
        </div>
      </div>
    </div>
  );
}