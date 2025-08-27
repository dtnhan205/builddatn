"use client";
import { useState } from "react";
import { Category } from "./category_interface";
import Link from "next/link";
import CategoryList from "./category_list";
import SearchBar from "./Searchbar";

interface MobileMenuToggleProps {
  categories: Category[];
}

export default function MobileMenuToggle({ categories }: MobileMenuToggleProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    // Đóng dropdown khi đóng menu
    if (isMenuOpen) setIsProductDropdownOpen(false);
  };

  const toggleProductDropdown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
    setIsProductDropdownOpen(!isProductDropdownOpen);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Chỉ đóng menu khi nhấp trực tiếp vào overlay, không phải các phần tử con
    if (e.target === e.currentTarget) {
      toggleMenu();
    }
  };

  return (
    <>
      <button
        className="mobile-menu-toggle"
        onClick={toggleMenu}
        aria-label="Toggle mobile menu"
      >
        <i className="fa-solid fa-bars"></i>
      </button>

      {isMenuOpen && (
        <div
          className={`mobile-menu-overlay ${isMenuOpen ? "active" : ""}`}
          onClick={handleOverlayClick}
        ></div>
      )}

      <div className={`mobile-menu ${isMenuOpen ? "open" : ""}`}>
        <div className="mobile-menu-content">
          <button
            className="mobile-menu-close"
            onClick={toggleMenu}
            aria-label="Close mobile menu"
          >
            <i className="fa-solid fa-times"></i>
          </button>
          <div className="mobile-search-bar">
            <SearchBar />
          </div>
          <nav className="mobile-nav">
            <div className="product-menu">
              <div className="product-menu-header" onClick={toggleProductDropdown}>
                Sản phẩm
                <i
                  className={`fa-solid fa-chevron-${isProductDropdownOpen ? "up" : "down"}`}
                ></i>
              </div>
              {isProductDropdownOpen && (
                <div className="product-dropdown">
                  <CategoryList categories={categories} />
                </div>
              )}
            </div>
            <Link href="/user/about" onClick={toggleMenu}>
              Về chúng tôi
            </Link>
            <Link href="/user/contact" onClick={toggleMenu}>
              Liên hệ
            </Link>
            <Link href="/user/new" onClick={toggleMenu}>
              Tin tức
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}