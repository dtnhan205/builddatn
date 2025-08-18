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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <button className="mobile-menu-toggle" onClick={toggleMenu} aria-label="Toggle mobile menu">
        <i className="fa-solid fa-bars"></i>
      </button>
      <div className={`mobile-menu ${isMenuOpen ? "open" : ""}`}>
        <div className="mobile-menu-content">
          <button className="mobile-menu-close" onClick={toggleMenu} aria-label="Close mobile menu">
            <i className="fa-solid fa-times"></i>
          </button>
          <div className="mobile-search-bar">
            <SearchBar />
          </div>
          <nav className="mobile-nav">
            <Link href="/user/product" onClick={toggleMenu}>
              Sản phẩm
            </Link>
            <CategoryList categories={categories} />
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

