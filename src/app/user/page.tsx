"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ScrollInView from "../components/ScrollInView";
export const dynamic = "force-dynamic";

interface Product {
  _id: string;
  name: string;
  slug: string;
  status: string;
  view: number;
  id_brand: string;
  id_category: string;
  images: string[];
  short_description: string;
  description: string;
  option: {
    stock: number;
    value: string;
    price: number;
    discount_price?: number;
    _id: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface Brand {
  _id: string;
  name: string;
  status: string;
  logoImg: string;
}

export default function Home() {
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [bestSellingProducts, setBestSellingProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [banners, setBanners] = useState({
    banner1: [] as string[],
    banner2: null as string | null,
    banner3: null as string | null,
    decor: [] as string[],
  });
  const [cacheBuster, setCacheBuster] = useState(""); // State để quản lý query string
  const [loading, setLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(0); // Theo dõi số lượng hình ảnh đã tải
  const [totalImages, setTotalImages] = useState(0); // Tổng số hình ảnh cần tải
  const [allImagesLoaded, setAllImagesLoaded] = useState(false); // Theo dõi khi tất cả hình ảnh đã tải xong
  const [dataReady, setDataReady] = useState(false); // Theo dõi khi dữ liệu API sẵn sàng
  const router = useRouter();
  const searchParams = useSearchParams();

  // Xử lý reload trang khi có refresh=true
  useEffect(() => {
    const refresh = searchParams.get("refresh");
    const hasReloaded = localStorage.getItem("hasReloadedAfterLogin");

    if (refresh === "true" && !hasReloaded) {
      const newUrl = window.location.pathname;
      router.replace(newUrl);
      setTimeout(() => {
        localStorage.setItem("hasReloadedAfterLogin", "true");
        window.location.reload();
      }, 200);
    }
  }, [searchParams, router]);

  // Reset trạng thái hasReloaded khi rời trang
  useEffect(() => {
    return () => {
      localStorage.removeItem("hasReloadedAfterLogin");
    };
  }, []);

  // Tạo cacheBuster trên client sau khi hydration
  useEffect(() => {
    setCacheBuster(`v=${Date.now()}`);
  }, []);

  // Lấy dữ liệu sản phẩm, thương hiệu và banner từ API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch products
        const productResponse = await fetch("https://api-zeal.onrender.com/api/products/active", {
          cache: "no-store",
        });
        if (!productResponse.ok) {
          throw new Error("Không thể lấy dữ liệu sản phẩm");
        }
        const allProducts: Product[] = await productResponse.json();

        // Filter valid products with valid option data
        const validProducts = allProducts.filter(
          (product) =>
            product.option?.[0] &&
            typeof product.option[0].price === "number" &&
            !isNaN(product.option[0].price)
        );

        // Sắp xếp sản phẩm mới nhất theo createdAt
        const sortedProducts = validProducts.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Lấy 3 sản phẩm mới nhất
        const latestProducts = sortedProducts.slice(0, 3);
        setNewProducts(latestProducts);

        // Lọc và sắp xếp sản phẩm theo stock (giảm dần)
        const productsWithStock = validProducts.filter(
          (product) => product.option[0].stock > 0
        );
        const sortedByStock = [...productsWithStock].sort(
          (a, b) => b.option[0].stock - a.option[0].stock
        );
        const topStockProducts = sortedByStock.slice(0, 4);
        setBestSellingProducts(topStockProducts);

        // Fetch brands
        const brandResponse = await fetch("https://api-zeal.onrender.com/api/brands", {
          cache: "no-store",
        });
        if (!brandResponse.ok) {
          throw new Error("Không thể lấy dữ liệu thương hiệu");
        }
        const allBrands: Brand[] = await brandResponse.json();
        // Filter brands with status "show"
        const visibleBrands = allBrands.filter((brand) => brand.status === "show");
        setBrands(visibleBrands);

        // Fetch banners
        const bannerTypes = [
          { key: "banner1", endpoint: "banner1" },
          { key: "banner2", endpoint: "banner2" },
          { key: "banner3", endpoint: "banner3" },
          { key: "decor", endpoint: "decor-images" },
        ];

        const bannerData: { banner1: string[]; banner2: string | null; banner3: string | null; decor: string[] } = {
          banner1: [],
          banner2: null,
          banner3: null,
          decor: [],
        };

        for (const { key, endpoint } of bannerTypes) {
          try {
            const res = await fetch(`https://api-zeal.onrender.com/api/interfaces/${endpoint}`, {
              cache: "no-store",
            });
            if (res.ok) {
              const data = await res.json();
              if (data.paths && data.paths.length > 0) {
                if (key === "banner1" || key === "decor") {
                  (bannerData as any)[key] = data.paths; // Sử dụng trực tiếp URL từ MongoDB
                } else {
                  (bannerData as any)[key] = data.paths[0]; // Sử dụng trực tiếp URL từ MongoDB
                }
              }
            } else {
              console.warn(`No images found for ${key}: ${res.status} ${res.statusText}`);
            }
          } catch (error) {
            console.error(`Error fetching ${key}:`, error);
          }
        }

        setBanners(bannerData);

        // Đếm tổng số hình ảnh hợp lệ (không tính URL 404)
        const validBanner1 = bannerData.banner1.filter(url => url && url !== "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg");
        const validBanner2 = bannerData.banner2 && bannerData.banner2 !== "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg" ? 1 : 0;
        const validBanner3 = bannerData.banner3 && bannerData.banner3 !== "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg" ? 1 : 0;
        const validDecor = bannerData.decor.filter(url => url && url !== "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg");
        const validNewProducts = latestProducts.reduce((acc, product) => acc + (product.images?.filter(img => img && img !== "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg").length || 0), 0);
        const validBestSelling = topStockProducts.reduce((acc, product) => acc + (product.images?.filter(img => img && img !== "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg").length || 0), 0);
        const validBrands = visibleBrands.reduce((acc, brand) => acc + (brand.logoImg && brand.logoImg !== "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg" ? 1 : 0), 0);

        const total = validBanner1.length + validBanner2 + validBanner3 + validDecor.length + validNewProducts + validBestSelling + validBrands;
        setTotalImages(total);

        setDataReady(true); // Dữ liệu sẵn sàng
        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
        setLoading(false);
        setDataReady(true); // Đặt dataReady thành true ngay cả khi có lỗi để hiển thị UI
      }
    };

    fetchData();

    // Thêm timeout để tránh loader kẹt vĩnh viễn
    const timer = setTimeout(() => setLoading(false), 10000); // Ẩn loader sau 10 giây nếu vẫn đang tải
    return () => clearTimeout(timer);
  }, []);

  // Hàm xử lý khi hình ảnh tải xong
  const handleImageLoad = (src: string) => {
    if (src && src !== "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg" && dataReady) {
      setImagesLoaded((prev) => {
        const newCount = prev + 1;
        console.log(`Image loaded: ${src}, Loaded: ${newCount}, Total: ${totalImages}`); // Debug log
        if (newCount >= totalImages && !allImagesLoaded) {
          setAllImagesLoaded(true); // Đánh dấu tất cả hình ảnh đã tải
          setTimeout(() => {
            setLoading(false); // Ẩn loader sau 2 giây
          }, 2000);
        }
        return newCount;
      });
    }
  };

  // Định dạng giá tiền
  const formatPrice = (price: number | undefined | null): string => {
    if (typeof price !== "number" || isNaN(price)) {
      return "N/A";
    }
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
  };
  
  const imagevippro = "https://res.cloudinary.com/dgud3sqyn/image/upload/v1755780102/imagevippro_hhxvix.png";

  // Xử lý URL ảnh
  const getImageUrl = (image: string): string => {
    if (!image || !dataReady) return ""; // Trả về chuỗi rỗng nếu dữ liệu chưa sẵn sàng
    return image || "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
  };

  return (
    <div className={styles.mainContainer}>
      {loading && (
        <div className={styles.loaderContainer}>
          <div className={styles.loader}></div>
        </div>
      )}
      {dataReady && (
        <>
          <ScrollInView>
  <div className={styles.banner}>
    <img
      src={banners.banner1[0] ? `${getImageUrl(banners.banner1[0])}?${cacheBuster}` : ""}
      alt="Main Banner"
      loading="eager"
      className={styles.bannerImage}
      onLoad={() => handleImageLoad(banners.banner1[0] || "")}
      onError={(e) => {
        (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
        console.log("Main Banner image load failed, switched to 404 fallback");
      }}
    />
  </div>
</ScrollInView>

          <ScrollInView>
            <section className={styles.newProductsSection}>
              <div className={styles.productsRow}>
                <div className={styles.textContent}>
                  <h2 className={styles.sectionTitle}>Sản phẩm mới</h2>
                  <p className={styles.sectionDescription}>
                    Pure Botanica tự hào giới thiệu các sản phẩm mới, mang đến những trải nghiệm vượt trội và cải thiện làn da, mái tóc của bạn mỗi ngày.
                  </p>
                </div>
                <div className={styles.newProducts}>
                  <div className={styles.newProductsGrid}>
                    {loading ? (
                      <p>Đang tải sản phẩm mới...</p>
                    ) : newProducts.length > 0 ? (
                      newProducts.map((product) => (
                        <Link href={`/user/detail/${product.slug}`} key={product._id}>
                          <div className={styles.newProductCard}>
                            <div className={styles.newProductBadge}>New</div>
                            <div className={styles.newProductImage}>
                              <img
                                src={`${getImageUrl(product.images?.[0] || "")}?${cacheBuster}`}
                                alt={product.name}
                                loading="lazy" // Tải lười cho sản phẩm
                                onLoad={() => handleImageLoad(product.images?.[0] || "")}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                                  console.log(`New Product ${product.name} image load failed, switched to 404 fallback`);
                                }}
                              />
                            </div>
                            <div className={styles.newProductDetails}>
                              <h3 className={styles.newProductName}>{product.name}</h3>
                              <p className={styles.newProductPrice}>
                                {product.option[0].discount_price
                                  ? formatPrice(product.option[0].discount_price)
                                  : formatPrice(product.option[0].price)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p>Không tìm thấy sản phẩm mới.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.featuresSection}>
                <div className={styles.featureCard}>
                  <h4 className={styles.featureTitle}>Giao hàng toàn quốc</h4>
                  <br />
                  <h4 className={styles.featureSubtitle}>Miễn phí giao hàng</h4>
                </div>
                <div className={styles.featureCard}>
                  <h4 className={styles.featureTitle}>Bảo đảm chất lượng</h4>
                  <br />
                  <h4 className={styles.featureSubtitle}>Sản phẩm làm từ thiên nhiên</h4>
                </div>
                <div className={styles.featureCard}>
                  <h4 className={styles.featureTitle}>Đổi trả sản phẩm</h4>
                  <br />
                  <h4 className={styles.featureSubtitle}>Với sản phẩm lỗi sản xuất</h4>
                </div>
                <div className={styles.featureCard}>
                  <h4 className={styles.featureTitle}>Hỗ trợ khách hàng</h4>
                  <br />
                  <h4 className={styles.featureSubtitle}>Tư vấn nhiệt tình 24/7</h4>
                </div>
              </div>
            </section>
          </ScrollInView>

          <ScrollInView>
            <div className={styles.bannerContainer}>
              <img
                src={banners.banner2 ? `${getImageUrl(banners.banner2)}?${cacheBuster}` : ""}
                alt="Banner Sale"
                loading="eager" // Ưu tiên tải banner sale
                className={styles.bannerImage}
                onLoad={() => handleImageLoad(banners.banner2 || "")}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                  console.log("Banner Sale image load failed, switched to 404 fallback");
                }}
              />
              <a href="/user/product">
                <button className={styles.buyNowButton}>Mua Ngay</button>
              </a>
            </div>
          </ScrollInView>

          <ScrollInView>
            <section className={styles.botanicalGallery}>
              <div className={styles.botanicalFrameLeft}>
                <img
                  src={banners.decor[0] ? `${getImageUrl(banners.decor[0])}?${cacheBuster}` : ""}
                  alt="Sản phẩm Pure Botanica với lá xanh và hoa"
                  className={styles.botanicalPhoto}
                  loading="lazy" // Tải lười cho decor
                  onLoad={() => handleImageLoad(banners.decor[0] || "")}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                    console.log("Botanical Left image load failed, switched to 404 fallback");
                  }}
                />
                <div className={styles.botanicalCaption}>
                  Hãy để Pure Botanica nâng niu làn da của bạn <br />
                  với 100% trích xuất từ thiên nhiên
                </div>
              </div>
              <div className={styles.botanicalFrameRight}>
                <img
                  src={banners.decor[1] ? `${getImageUrl(banners.decor[1])}?${cacheBuster}` : ""}
                  alt="Bộ sưu tập sản phẩm Pure Botanica"
                  className={styles.botanicalPhoto}
                  loading="lazy" // Tải lười cho decor
                  onLoad={() => handleImageLoad(banners.decor[1] || "")}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                    console.log("Botanical Right image load failed, switched to 404 fallback");
                  }}
                />
                <div className={styles.botanicalCaption}>
                  Chúng tôi chọn thiên nhiên, bạn chọn sự an lành
                </div>
              </div>
            </section>
          </ScrollInView>

          <ScrollInView>
            <div className={styles.bestSellingProducts}>
              <h2 className={styles.bestSellingSectionTitle}>Bạn có thể thích</h2>
              <div className={styles.bestSellingGrid}>
                {loading ? (
                  <p>Đang tải sản phẩm đề xuất...</p>
                ) : bestSellingProducts.length > 0 ? (
                  bestSellingProducts.map((product) => (
                    <Link href={`/user/detail/${product.slug}`} key={product._id}>
                      <div className={styles.bestSellingCard}>
                        <div className={styles.bestSellingBadge}>Hot</div>
                        <div className={styles.bestSellingImage}>
                          <img
                            src={`${getImageUrl(product.images?.[0] || "")}?${cacheBuster}`}
                            alt={product.name}
                            loading="lazy" // Tải lười cho sản phẩm
                            onLoad={() => handleImageLoad(product.images?.[0] || "")}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                              console.log(`Best Selling ${product.name} image load failed, switched to 404 fallback`);
                            }}
                          />
                        </div>
                        <div className={styles.bestSellingDetails}>
                          <h3 className={styles.bestSellingName}>{product.name}</h3>
                          <p className={styles.bestSellingPrice}>
                            {product.option[0].discount_price
                              ? formatPrice(product.option[0].discount_price)
                              : formatPrice(product.option[0].price)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p>Không tìm thấy sản phẩm bán chạy.</p>
                )}
              </div>
            </div>
          </ScrollInView>

          <ScrollInView>
            <div className={styles.brandValueSection}>
              <img
                src={banners.banner3 ? `${getImageUrl(banners.banner3)}?${cacheBuster}` : ""}
                alt="Background with Natural Ingredients"
                loading="eager" // Ưu tiên tải banner brand
                className={styles.brandBackground}
                onLoad={() => handleImageLoad(banners.banner3 || "")}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                  console.log("Brand Value image load failed, switched to 404 fallback");
                }}
              />
              <div className={styles.brandContent}>
                <h2 className={styles.brandTitle}>Giá trị thương hiệu</h2>
                <p className={styles.brandDescription}>
                  Pure Botanica tin rằng vẻ đẹp thật sự đến từ thiên nhiên thuần khiết. Chúng tôi mang
                  đến sản phẩm an lành cho làn da, hòa quyện với sự bền vững và trách nhiệm với môi
                  trường.
                </p>
                <a href="/user/about" className={styles.brandCta}>
                  Tìm hiểu thêm
                </a>
              </div>
            </div>
          </ScrollInView>

          <ScrollInView>
            <div className={styles.brands}>
              <h2>Thương hiệu nổi bật</h2>
              <div className={styles.brandsGrid}>
                {loading ? (
                  <p>Đang tải thương hiệu...</p>
                ) : brands.length > 0 ? (
                  brands.map((brand) => (
                    <img
                      key={brand._id}
                      src={`${getImageUrl(brand.logoImg)}?${cacheBuster}`}
                      alt={`Thương hiệu ${brand.name}`}
                      loading="lazy" // Tải lười cho logo thương hiệu
                      onLoad={() => handleImageLoad(brand.logoImg || "")}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                        console.log(`Brand ${brand.name} logo load failed, switched to 404 fallback`);
                      }}
                    />
                  ))
                ) : (
                  <p>Không tìm thấy thương hiệu.</p>
                )}
              </div>
            </div>
          </ScrollInView>
        </>
      )}
    </div>
  );
}