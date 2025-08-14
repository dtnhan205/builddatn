"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import "../payment-done/paydone.css";


const SuccessPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const orderId = searchParams.get("orderId") || "#DH123456";
  const date = searchParams.get("date") || "14/08/2025";
  const total = searchParams.get("total") || "1250000";
  const paymentMethod = searchParams.get("paymentMethod") || "cod";

  useEffect(() => {
    const createConfetti = () => {
      const colors = ["#4CAF50", "#2196F3", "#FFC107", "#FF5722", "#9C27B0", "#E91E63"];
      const container = document.querySelector(".confetti-container");
      if (container) {
        for (let i = 0; i < 25; i++) {
          const confetti = document.createElement("div");
          confetti.classList.add("confetti");
          const size = Math.random() * 10 + 5;
          const color = colors[Math.floor(Math.random() * colors.length)];
          const left = Math.random() * 100;
          const duration = Math.random() * 3 + 2;
          const delay = Math.random() * 5;

          confetti.style.width = `${size}px`;
          confetti.style.height = `${size}px`;
          confetti.style.backgroundColor = color;
          confetti.style.left = `${left}%`;
          confetti.style.animationDuration = `${duration}s`;
          confetti.style.animationDelay = `${delay}s`;

          if (Math.random() > 0.5) confetti.style.borderRadius = "50%";

          container.appendChild(confetti);
        }
      }
    };

    setTimeout(createConfetti, 500);
  }, []);

  const formatPrice = (price: string | number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(price) || 0);

  const paymentMethodText = paymentMethod === "cod"
    ? "Thanh toán khi nhận hàng"
    : "Chuyển khoản ngân hàng";

  const handleContinue = () => {
    setIsLoading(true);
    setTimeout(() => {
      router.push("/user"); // chuyển về trang /user
    }, 1500);
  };

  return (
    <div className="success-container">
      <div className="success-card">
        <div className="success-icon">
          <div className="circle">
            <div className="checkmark"></div>
          </div>
        </div>
        <h1>Thanh Toán Thành Công!</h1>
        <p className="message">Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đã được xử lý thành công.</p>
        <div className="order-details">
          <div className="detail"><span className="label">Mã đơn hàng:</span><span className="value">{orderId}</span></div>
          <div className="detail"><span className="label">Ngày:</span><span className="value">{date}</span></div>
          <div className="detail"><span className="label">Tổng tiền:</span><span className="value">{formatPrice(total)}</span></div>
          <div className="detail"><span className="label">Phương thức:</span><span className="value">{paymentMethodText}</span></div>
        </div>
        <button
          className="continue-btn"
          id="continue-btn"
          onClick={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin /> Đang chuyển hướng...
            </>
          ) : (
            "Tiếp Tục Mua Sắm"
          )}
        </button>
        <div className="confetti-container"></div>
      </div>
    </div>
  );
};

export default SuccessPage;
