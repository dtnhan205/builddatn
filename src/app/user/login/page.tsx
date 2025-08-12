  "use client";
  import Link from "next/link";
  import { useState, useEffect, useRef } from "react";
  import { useRouter, useSearchParams } from "next/navigation";
  import { useAuth } from "../context/AuthContext";
  import { jwtDecode } from "jwt-decode";
  import styles from "./login.module.css";

  export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
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
          login(token).catch((err: unknown) => {
            console.error("Lỗi xử lý token từ Google:", err);
            const errorMessage = err instanceof Error 
              ? err.message.includes("Tài khoản không hoạt động") 
                ? "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên."
                : err.message
              : "Có lỗi khi đăng nhập bằng Google, vui lòng thử lại!";
            setError(errorMessage);
          });
        } catch (decodeError) {
          console.error("Lỗi giải mã token:", decodeError);
          setError("Token không hợp lệ, vui lòng thử lại!");
        }
      }
    }, [searchParams, login]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");

      try {
        const res = await fetch("https://api-zeal.onrender.com/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Đăng nhập thất bại");
          return;
        }

        console.log("Login response token:", data.token);
        await login(data.token);
      } catch (err: unknown) {
        console.error("Lỗi đăng nhập:", err);
        const errorMessage = err instanceof Error 
          ? err.message.includes("Tài khoản không hoạt động") 
            ? "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên."
            : err.message
          : "Có lỗi xảy ra, vui lòng thử lại!";
        setError(errorMessage);
      }
    };

    const handleGoogleLogin = () => {
      console.log("Redirecting to Google:", "https://api-zeal.onrender.com/api/auth/google");
      window.location.href = "https://api-zeal.onrender.com/api/auth/google";
    };

    return (
      <div className={styles.container}>
        <div className={styles["form-box"]}>
          <h2 className={styles["form-title"]}>
            <strong>ĐĂNG NHẬP</strong>
          </h2>

          <button className={styles["google-btn"]} onClick={handleGoogleLogin}>
            <img src="/images/icons8-google-48.png" alt="Google Logo" /> Đăng nhập với Google
          </button>

          <div className={styles.divider}>
            <hr />
            <span>Đăng nhập bằng tài khoản</span>
            <hr />
          </div>

          <form action="#" method="post" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Myname@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles["input-field"]}
              required
            />
            <br />
            <input
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles["input-field"]}
              required
            />

            <div className={styles["forgot-password"]}>
              <Link href="/user/forgotpass">Quên mật Khẩu</Link>
            </div>

            <button type="submit" className={styles["submit-btn"]}>ĐĂNG NHẬP</button>
            {error && <p className={styles["error-message"]}>{error}</p>}

            <p className={styles["switch-form"]}>
              Chưa có tài khoản? <Link href="/user/register">Đăng ký</Link>
            </p>
          </form>
        </div>
      </div>
    );
  }