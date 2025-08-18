import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Category } from "../components/category_interface";
import { AuthProvider } from "./context/AuthContext";
import CategoryList from "../components/category_list";
import UserMenu from "../components/Usermenu";
import { CartProvider } from "./context/CartContext";
import SearchBar from "../components/Searchbar";
import ImageWithFallback from "../components/ImageWithFallback";
import ScrollToTop from "../components/ScrollToTop";
import MobileMenuToggle from "../components/menumobile";
import '@fortawesome/fontawesome-free/css/all.min.css';
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fetchImage = async (type: "favicon" | "logo-shop"): Promise<string> => {
  console.log(`Fetching ${type}... at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })}`);
  try {
    const res = await fetch(`https://api-zeal.onrender.com/api/interfaces/${type}`, { cache: "no-store" });
    if (!res.ok) {
      console.error(`Fetch ${type} failed at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })}:`, res.status, res.statusText);
      return type === "favicon" ? "/favicon.ico" : "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
    }
    const data = await res.json();
    console.log(`${type} data at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })}:`, data);
    return data.paths && data.paths.length > 0 ? data.paths[0] : (type === "favicon" ? "/favicon.ico" : "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg");
  } catch (error) {
    console.error(`Error fetching ${type} at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })}:`, error);
    return type === "favicon" ? "/favicon.ico" : "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
  }
};

// Dynamically generate metadata for favicon
export async function generateMetadata(): Promise<Metadata> {
  const faviconPath = await fetchImage("favicon");
  console.log("Resolved faviconPath:", faviconPath);

  return {
    title: "Pure Botanica",
    description: "Website mỹ phẩm thiên nhiên",
    icons: {
      icon: faviconPath,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories: Category[] = await getCategories("https://api-zeal.onrender.com/api/categories");
  const logoPath = await fetchImage("logo-shop");
  console.log("Resolved logoPath:", logoPath);

  const showCategories = categories.filter((category) => category.status === "show");

  return (
    <AuthProvider>
      <CartProvider>
        <div className={`${geistSans.variable} ${geistMono.variable}`}>
          <header>
            <div className="container header-container">
              <div className="logo">
                <Link href="/user">
                  <ImageWithFallback
                    src={logoPath}
                    alt="Pure Botanica"
                    onErrorMessage="Header logo image load failed, switched to 404 fallback"
                  />
                </Link>
              </div>
              <nav className="desktop-nav">
                <div className="menu-wrapper">
                  <Link href="/user/product" className="dropdown">
                    Sản phẩm
                  </Link>
                  <CategoryList categories={showCategories} />
                </div>
                <Link href="/user/about">Về chúng tôi</Link>
                <Link href="/user/contact">Liên hệ</Link>
                <Link href="/user/new">Tin tức</Link>
               
              </nav>
              <div className="icons">
                 <div className="desktop-search">
                  <SearchBar />
                </div>
                <Link href="/user/wishlist" title="Danh sách yêu thích">
                  <i className="fa-solid fa-heart"></i>
                </Link>
                <Link href="/user/cart" title="Giỏ hàng">
                  <i className="fa-solid fa-cart-shopping"></i>
                </Link>
                <UserMenu />
                
                <MobileMenuToggle categories={showCategories} />
              </div>
            </div>
          </header>

          <main>{children}</main>

          <footer className="footer">
            <div className="footer-container">
              <div className="footer-logo">
                <ImageWithFallback
                  src={logoPath}
                  alt="Pure Botanica Logo"
                  onErrorMessage="Footer logo image load failed, switched to 404 fallback"
                />
                <p className="footer-slogan">
                  "Nurtured by Nature <br /> Perfected for You"
                </p>
              </div>
              <div className="footer-links">
                <div className="footer-column">
                  <h4>SẢN PHẨM</h4>
                  <ul>
                    {showCategories.map((category) => (
                      <li key={category._id}>
                        <Link href={`/user/product?category=${encodeURIComponent(category.name)}`}>
                          {category.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="footer-column">
                  <h4>CHÍNH SÁCH</h4>
                  <ul>
                    <li><Link href="#">Chính sách bảo mật</Link></li>
                    <li><Link href="#">Chính sách đổi trả</Link></li>
                    <li><Link href="#">Chính sách giao hàng</Link></li>
                    <li><Link href="#">Chính sách bảo mật thông tin</Link></li>
                  </ul>
                </div>
              </div>
              <div className="footer-newsletter">
                <h4>Đăng ký email để nhận thông tin</h4>
                <p>Hãy là người đầu tiên biết về sự kiện mới, sản phẩm mới</p>
                <form>
                  <input type="email" placeholder="Nhập email của bạn..." />
                  <button type="submit">Đăng Ký</button>
                </form>
                <div className="footer-address">
                  <p>
                    <i className="fa-solid fa-location-dot"></i> Tòa nhà QTSC9 (tòa T), đường Tô Ký, phường Tân Chánh Hiệp, Quận 12, TP Hồ Chí Minh
                  </p>
                </div>
              </div>
            </div>
            <hr
              style={{
                border: "none",
                height: "1px",
                backgroundColor: "rgba(0, 0, 0, 0.1)",
                marginTop: "50px",
                marginBottom: "0",
              }}
            />
            <div className="footer-bottom">
              <p>© 2025 Pure Botanica LLC</p>
            </div>
          </footer>

          <ScrollToTop />

          <script
            data-name-bot="Pure Botanica - BOT"
            src="https://app.preny.ai/embed-global.js"
            data-button-style="width:300px;height:300px;"
            data-language="vi"
            async
            defer
            data-preny-bot-id="68a0315b620b2571ccdd98a4"
          />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}

// Hàm lấy danh mục
async function getCategories(url: string): Promise<Category[]> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`Fetch categories failed at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })}:`, res.status, res.statusText);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      console.error(`Invalid categories data at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })}:`, data);
      return [];
    }
    return data.map((category: any) => ({
      _id: category._id,
      name: category.name,
      status: category.status,
      createdAt: category.createdAt,
      __v: category.__v,
      productCount: category.productCount ?? 0,
    }));
  } catch (error) {
    console.error(`Error fetching categories at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })}:`, error);
    return [];
  }
}