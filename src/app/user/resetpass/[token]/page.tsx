"use client"; // Đánh dấu đây là Client Component

import { useState } from "react";
import { useParams } from "next/navigation"; // Thay thế useRouter
import styles from './resetpass.module.css';

export default function ResetPassword() {
  const params = useParams();
  const token = params.token as string; // Lấy token từ dynamic route
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Token không hợp lệ");
      return;
    }

    try {
      const res = await fetch(`https://api-zeal.onrender.com/api/users/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Có lỗi xảy ra");
        return;
      }

      setMessage(data.message || "Mật khẩu đã được đặt lại thành công!");
    } catch (err) {
      console.error("Lỗi đặt lại mật khẩu:", err);
      setError("Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles["form-box"]}>
        <h2 className={styles["form-title"]}>Đặt Lại Mật Khẩu</h2>

        <form onSubmit={handleResetPassword}>
          <input
            type="password"
            placeholder="Nhập mật khẩu mới"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={styles["input-field"]}
            required
            minLength={8}
          />
          <button type="submit" className={styles["submit-btn"]}>Đặt lại mật khẩu</button>
        </form>

        {message && <p className={styles["success-message"]}>{message}</p>}
        {error && <p className={styles["error-message"]}>{error}</p>}
      </div>
    </div>
  );
}