"use client";
import { useState } from "react";
import styles from './forgotpass.module.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResetRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const res = await fetch("https://api-zeal.onrender.com/api/users/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Có lỗi xảy ra");
        return;
      }

      setMessage(data.message || "Email đặt lại mật khẩu đã được gửi.");
    } catch (err) {
      console.error("Lỗi yêu cầu đặt lại mật khẩu:", err);
      setError("Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles["form-box"]}>
        <h2 className={styles["form-title"]}>Quên Mật Khẩu</h2>

        <form onSubmit={handleResetRequest}>
          <input
            type="email"
            placeholder="Nhập email của bạn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles["input-field"]}
            required
          />
          <button type="submit" className={styles["submit-btn"]}>Gửi yêu cầu đặt lại</button>
        </form>

        {message && <p className={styles["success-message"]}>{message}</p>}
        {error && <p className={styles["error-message"]}>{error}</p>}
      </div>
    </div>
  );
}