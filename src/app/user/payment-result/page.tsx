"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "../checkout/checkout.module.css";
export const dynamic = "force-dynamic";

export default function PaymentResultPage() {
  const router = useRouter();
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"vnpay" | "momo" | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const paymentCode = query.get("vnp_TxnRef") || query.get("momo_TxnRef");
    const responseCode = query.get("vnp_ResponseCode") || query.get("momo_ResultCode");
    const orderId = query.get("orderId");
    const amount = query.get("vnp_Amount") || query.get("amount");

    if (!paymentCode || !responseCode) {
      toast.error("Thiếu thông tin thanh toán từ cổng thanh toán.");
      setIsLoading(false);
      setTimeout(() => router.push("/user/cart"), 3000);
      return;
    }

    const isVNPay = !!query.get("vnp_TxnRef");
    setPaymentMethod(isVNPay ? "vnpay" : "momo");

    const checkPaymentStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Vui lòng đăng nhập để kiểm tra trạng thái thanh toán.");
          setTimeout(() => router.push("/user/login"), 3000);
          return;
        }

        const endpoint = isVNPay
          ? `https://api-zeal.onrender.com/api/vnpay/check-payment-status`
          : `https://api-zeal.onrender.com/api/momo/check-payment-status`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            paymentCode,
            amount: Number(amount) / (isVNPay ? 100 : 1), // VNPay uses 100 as multiplier
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          toast.error(errorData.message || "Lỗi khi kiểm tra trạng thái thanh toán.");
          setPaymentStatus("failed");
          setTimeout(() => router.push("/user/cart"), 3000);
          return;
        }

        const data = await response.json();
        if (data.data.status === "success") {
          toast.success(`Thanh toán qua ${isVNPay ? "VNPay" : "Momo"} thành công!`);
          setPaymentStatus("success");
          setTimeout(() => router.push(`/user/orders?orderId=${orderId}`), 3000);
        } else if (data.data.status === "expired") {
          toast.error(`Thanh toán qua ${isVNPay ? "VNPay" : "Momo"} đã hết hạn. Vui lòng thử lại.`);
          setPaymentStatus("failed");
          setTimeout(() => router.push("/user/cart"), 3000);
        } else {
          toast.error(`Thanh toán qua ${isVNPay ? "VNPay" : "Momo"} thất bại. Vui lòng thử lại.`);
          setPaymentStatus("failed");
          setTimeout(() => router.push("/user/cart"), 3000);
        }
      } catch (err) {
        toast.error("Lỗi khi kiểm tra trạng thái thanh toán: " + (err as Error).message);
        setPaymentStatus("failed");
        setTimeout(() => router.push("/user/cart"), 3000);
      } finally {
        setIsLoading(false);
      }
    };

    checkPaymentStatus();
  }, [router]);

  return (
    <div className={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className={styles.content}>
        {isLoading ? (
          <p>Đang kiểm tra trạng thái thanh toán...</p>
        ) : (
          <>
            <h2>{paymentStatus === "success" ? `Thanh toán ${paymentMethod === "vnpay" ? "VNPay" : "Momo"} thành công` : `Thanh toán ${paymentMethod === "vnpay" ? "VNPay" : "Momo"} thất bại`}</h2>
            <p>{paymentStatus === "success" ? "Cảm ơn bạn đã đặt hàng! Đơn hàng của bạn đang được xử lý." : "Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại."}</p>
            <p>Đang chuyển hướng...</p>
          </>
        )}
      </div>
    </div>
  );
}