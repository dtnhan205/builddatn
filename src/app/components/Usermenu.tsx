"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./menu.module.css"; // Import CSS Module

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null); // Thêm state cho role
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Kiểm tra token và role trong localStorage khi component được mount
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token) {
      setIsLoggedIn(true);
      setUserRole(role); // Lưu role vào state
    }

    // Thêm sự kiện click bên ngoài để đóng dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    setIsLoggedIn(false);
    setUserRole(null); // Reset role khi đăng xuất
    window.location.href = "/user";
  };

  return (
    <div className={styles.userMenuContainer} ref={dropdownRef}>
      <div className={styles.userIcon} onClick={() => isLoggedIn && setIsOpen(!isOpen)}>
        <Link href={isLoggedIn ? "#" : "/user/login"}>
          <i className="fa-solid fa-user"></i>
        </Link>
      </div>

      {isLoggedIn && isOpen && (
        <div className={styles.userDropdown}>
          <ul>
            <li>
              <Link href="/user/userinfo">
                <i className="fa-solid fa-user-circle"></i> Thông tin khách hàng
              </Link>
            </li>
            {userRole === "admin" && (
              <li>
                <Link href="/admin">
                  <i className="fa-solid fa-shield-alt"></i> Trang quản trị
                </Link>
              </li>
            )}
            <li className={styles.logoutItem}>
              <button onClick={handleLogout}>
                <i className="fa-solid fa-sign-out-alt"></i> Đăng xuất
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}