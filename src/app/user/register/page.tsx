"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import styles from "./Register.module.css";

export default function RegisterPage() {
  const [username, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const hasProcessedToken = useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token && !hasProcessedToken.current) {
      hasProcessedToken.current = true;
      console.log("Received token from Google:", token);
      try {
        const decoded = jwtDecode(token) as any;
        console.log("Decoded token:", decoded);
        login(token).then(() => {
          router.push(decoded.role === "admin" ? "/admin" : "/user/login");
        }).catch((err: unknown) => {
          console.error("Lỗi xử lý token từ Google:", err);
          setError(`Có lỗi khi đăng ký bằng Google, vui lòng thử lại! Chi tiết: ${err instanceof Error ? err.message : "Lỗi không xác định"}`);
        });
      } catch (decodeError) {
        console.error("Lỗi giải mã token:", decodeError);
        setError("Token không hợp lệ, vui lòng thử lại!");
      }
    }
  }, [searchParams, login, router]);

  const validateForm = () => {
    const errors = {
      username: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    };
    let isValid = true;

    // Kiểm tra tên người dùng
    if (!username) {
      errors.username = "Họ và tên không được để trống";
      isValid = false;
    } else if (username.length < 3) {
      errors.username = "Họ và tên phải có ít nhất 3 ký tự";
      isValid = false;
    }

    // Kiểm tra email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.email = "Email không được để trống";
      isValid = false;
    } else if (!emailRegex.test(email)) {
      errors.email = "Email không đúng định dạng";
      isValid = false;
    }

    // Kiểm tra số điện thoại
    const phoneRegex = /^[0-9]{10}$/;
    if (!phone) {
      errors.phone = "Số điện thoại không được để trống";
      isValid = false;
    } else if (!phoneRegex.test(phone)) {
      errors.phone = "Số điện thoại phải có đúng 10 chữ số";
      isValid = false;
    }

    // Kiểm tra mật khẩu
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!password) {
      errors.password = "Mật khẩu không được để trống";
      isValid = false;
    } else if (!passwordRegex.test(password)) {
      errors.password = "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt";
      isValid = false;
    }

    // Kiểm tra nhập lại mật khẩu
    if (!confirmPassword) {
      errors.confirmPassword = "Vui lòng nhập lại mật khẩu";
      isValid = false;
    } else if (confirmPassword !== password) {
      errors.confirmPassword = "Mật khẩu nhập lại không khớp";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    try {
      const res = await fetch("https://api-zeal.onrender.com/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, phone, password }),
      });

      const data = await res.json();
      console.log("Register API Response:", data);

      if (!res.ok) {
        setError(data.message || "Đăng ký thất bại");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("email", data.user.email);

      if (data.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/user/login");
      }
    } catch (err: any) {
      console.error("Lỗi đăng ký:", err);
      setError(err.message || "Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  const handleGoogleRegister = () => {
    console.log("Redirecting to Google:", "https://api-zeal.onrender.com/api/auth/google");
    window.location.href = "https://api-zeal.onrender.com/api/auth/google";
  };

  return (
    <main className={styles.mainContent}>
      <div className={styles.container}>
        <div className={styles.formBox}>
          <h2 className={styles.title}><strong>ĐĂNG KÝ</strong></h2>

          <div className={styles.divider}>
            <hr className={styles.dividerLine} />
            <span className={styles.dividerText}>Hoặc đăng ký bằng tài khoản</span>
            <hr className={styles.dividerLine} />
          </div>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Họ và tên"
              value={username}
              onChange={(e) => setName(e.target.value)}
              required
              className={styles.input}
            />
            {formErrors.username && <p className={styles.errorMessage}>{formErrors.username}</p>}
            <small className={styles.small}>Vui lòng nhập họ và tên đầy đủ</small>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
            />
            {formErrors.email && <p className={styles.errorMessage}>{formErrors.email}</p>}
            <small className={styles.small}>Ví dụ: example@domain.com</small>

            <input
              type="tel"
              placeholder="Số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className={styles.input}
            />
            {formErrors.phone && <p className={styles.errorMessage}>{formErrors.phone}</p>}
            <small className={styles.small}>Ví dụ: 0123456789</small>

            <input
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
            />
            {formErrors.password && <p className={styles.errorMessage}>{formErrors.password}</p>}
  

            <input
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={styles.input}
            />
            {formErrors.confirmPassword && <p className={styles.errorMessage}>{formErrors.confirmPassword}</p>}
           

            <div className={styles.policy}>
              <label className={styles.policyLabel}>
                <input type="checkbox" required className={styles.policyCheckbox} />
                Tôi đồng ý với <a href="/user/policy" className={styles.policyLink}>chính sách</a>
              </label>
            </div>

            <button type="submit" className={styles.submitBtn}>ĐĂNG KÝ</button>
            {error && <p className={styles.errorMessage}>{error}</p>}

            <div className={styles.forgotPassword}>
              <Link href="/forgot-password" className={styles.forgotPasswordLink}>Quên mật khẩu?</Link>
            </div>

            <p className={styles.switchForm}>
              Đã có tài khoản? <Link href="/user/login" className={styles.switchFormLink}>Đăng nhập</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}