"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./Userinfo.module.css";
import { User as ImportedUser } from "@/app/components/user_interface";

interface User extends ImportedUser {
  id: string;
}

const API_BASE_URL = "https://api-zeal.onrender.com";
const ERROR_IMAGE_URL = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";

interface Order {
  _id: string;
  createdAt: string;
  price: number;
  total: number;
  paymentStatus: string;
  shippingStatus: string;
  returnStatus: "none" | "requested" | "approved" | "rejected";
  returnReason?: string;
  returnRequestDate?: string;
  paymentMethod?: string;
  couponCode?: string;
  discount?: number;
  subtotal?: number;
  paymentCode?: string;
  address?: {
    addressLine: string;
    ward: string;
    district: string;
    cityOrProvince: string;
  };
  sdt?: string;
  note?: string;
  cancelReason?: string;
  cancelNote?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  items: {
    product: { _id: string; name?: string; price?: number; images?: string[]; option?: any[]; slug?: string } | null;
    optionId?: string;
    quantity: number;
  }[];
}

interface Product {
  _id: string;
  name: string;
  images: string[];
  option: { _id: string; price: number; discount_price?: number; value: string }[];
  price: number;
  slug?: string;
}

interface Comment {
  _id: string;
  userId: string;
  productId: string;
  orderId?: string;
  content: string;
  rating: number;
  createdAt: string;
}

interface Coupon {
  _id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  expiryDate: string;
  usageLimit: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Không có token. Vui lòng đăng nhập.");
  }
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
};

const translateCancelReason = (reason: string): string => {
  const reasonMap: { [key: string]: string } = {
    "out_of_stock": "Hết hàng",
    "customer_cancelled": "Khách hàng hủy",
    "system_error": "Lỗi hệ thống",
    "other": "Lý do khác"
  };
  return reasonMap[reason] || reason;
};

const translatePaymentMethod = (method: string): string => {
  const paymentMethods: { [key: string]: string } = {
    "bank": "Chuyển khoản ngân hàng",
    "cod": "Thanh toán khi nhận hàng"
  };
  return paymentMethods[method?.toLowerCase()] || "Thanh toán khi nhận hàng";
};

const getImageUrl = (image: string, productName: string, cacheBuster: string): string => {
  if (!image || typeof image !== "string" || image.trim() === "") {
    console.warn(`Invalid image URL for product "${productName}", using fallback: ${ERROR_IMAGE_URL}`);
    return ERROR_IMAGE_URL;
  }
  try {
    if (image.startsWith("http://") || image.startsWith("https://")) {
      return `${image}${image.includes("?") ? "&" : "?"}${cacheBuster}`;
    }
    const url = `${API_BASE_URL}/${image}?${cacheBuster}`;
    console.log(`Generated image URL for product "${productName}": ${url}`);
    return url;
  } catch (e) {
    console.warn(`Invalid URL format for product "${productName}": ${image}, using fallback: ${ERROR_IMAGE_URL}`, e);
    return ERROR_IMAGE_URL;
  }
};

const getProductPrice = (product: any, productName: string): number => {
  if (!product) {
    console.warn(`Product is null or undefined: ${productName}`);
    return 0;
  }
  if (product.price) {
    return product.price;
  }
  if (!product.option || !Array.isArray(product.option) || product.option.length === 0) {
    console.warn(`Invalid or missing options for product "${productName}"`);
    return 0;
  }
  const firstOption = product.option[0];
  if (!firstOption) {
    console.warn(`No valid option found for product "${productName}"`);
    return 0;
  }
  const price = firstOption.discount_price && firstOption.discount_price > 0 ? firstOption.discount_price : firstOption.price || 0;
  console.log(`Price for product "${productName}": ${price}`);
  return price;
};

const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null || isNaN(price)) {
    return "Giá không khả dụng";
  }
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const useToast = () => {
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const TOAST_DURATION = 3000;

  const showToast = (type: "success" | "error" | "info", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), TOAST_DURATION);
  };

  return { message, showToast, hideToast: () => setMessage(null) };
};

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedSection, setSelectedSection] = useState<"profile" | "orders" | "wishlist" | "coupons">("profile");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [wishlistLoading, setWishlistLoading] = useState<boolean>(false);
  const [wishlistError, setWishlistError] = useState<string | null>(null);
  const [couponsLoading, setCouponsLoading] = useState<boolean>(false);
  const [couponsError, setCouponsError] = useState<string | null>(null);
  const [paymentMap, setPaymentMap] = useState<Record<string, string>>({});
  const [cacheBuster, setCacheBuster] = useState("");
  const [canReviewMap, setCanReviewMap] = useState<Record<string, boolean>>({});
  const [showReturnForm, setShowReturnForm] = useState<boolean>(false);
  const [returnReason, setReturnReason] = useState<string>("");
  const [showCancelForm, setShowCancelForm] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelNote, setCancelNote] = useState<string>("");
  const [showPasswordForm, setShowPasswordForm] = useState<boolean>(false);
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { message, showToast, hideToast } = useToast();
  const REVIEW_WINDOW_DAYS = 7;

  useEffect(() => {
    setCacheBuster(`t=${Date.now()}`);
  }, []);

  const fetchUserInfo = async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId || userId === "undefined" || !userId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error("Không tìm thấy hoặc userId không hợp lệ. Vui lòng đăng nhập lại.");
      }
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/userinfo?id=${userId}`);
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        } else if (res.status === 400) {
          throw new Error("ID người dùng không hợp lệ.");
        } else if (res.status === 403) {
          throw new Error("Bạn không có quyền truy cập thông tin này.");
        } else if (res.status === 404) {
          throw new Error("Không tìm thấy người dùng.");
        }
        throw new Error("Lỗi khi tải thông tin người dùng.");
      }
      const data = await res.json();
      const { password, passwordResetToken, ...safeUserData } = data;
      if (safeUserData.address && typeof safeUserData.address === "string") {
        const addressParts = safeUserData.address.split(", ").map((part: string) => part.trim());
        safeUserData.address = {
          addressLine: addressParts[0] || "",
          ward: addressParts[1] || "",
          district: addressParts[2] || "",
          cityOrProvince: addressParts[3] || "",
        };
      }
      setUser({ ...safeUserData, id: userId });
      return safeUserData;
    } catch (err: any) {
      throw new Error(err.message || "Lỗi khi tải thông tin người dùng.");
    }
  };

  const fetchOrders = async (userId: string) => {
    if (!userId || userId.trim() === "" || userId === "undefined") {
      setOrders([]);
      setOrdersError("Không tìm thấy userId.");
      return;
    }
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/orders/user/${userId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        } else if (res.status === 404) {
          setOrders([]);
          return;
        }
        throw new Error("Lỗi khi tải danh sách đơn hàng.");
      }
      const data = await res.json();
      let ordersData: Order[] = [];
      if (data.status === "success" && Array.isArray(data.data)) {
        ordersData = data.data;
      } else if (Array.isArray(data)) {
        ordersData = data;
      } else if (data && Array.isArray(data.orders)) {
        ordersData = data.orders;
      } else {
        ordersData = [];
      }
      console.log("Orders data:", ordersData);
      const productsRes = await fetch(`${API_BASE_URL}/api/products/active`, {
        cache: "no-store",
      });
      if (!productsRes.ok) {
        throw new Error(`Lỗi tải sản phẩm: ${productsRes.status}`);
      }
      const productsData: Product[] = await productsRes.json();
      console.log("Products data:", productsData);
      ordersData = ordersData.map(order => ({
        ...order,
        items: order.items.map(item => ({
          ...item,
          product: item.product
            ? {
                ...item.product,
                ...productsData.find(p => p._id === item.product?._id),
                images: (item.product.images || []).filter(img => typeof img === "string" && img.trim() !== "").map(img => getImageUrl(img, item.product?.name || "Unknown", cacheBuster)),
                price: getProductPrice(productsData.find(p => p._id === item.product?._id) || item.product, item.product?.name || "Unknown"),
              }
            : null,
        })),
      }));
      setOrders(ordersData);
      const reviewMap: Record<string, boolean> = {};
      const currentDate = new Date();
      for (const order of ordersData) {
        if (order.paymentStatus !== "completed" || order.shippingStatus !== "delivered") {
          continue;
        }
        const orderDate = new Date(order.createdAt);
        const daysDiff = (currentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > REVIEW_WINDOW_DAYS) {
          continue;
        }
        for (const item of order.items) {
          if (!item.product?._id) continue;
          try {
            const commentsRes = await fetchWithAuth(`${API_BASE_URL}/api/comments/product/${item.product._id}`);
            if (!commentsRes.ok) {
              console.warn(`Failed to fetch comments for product ${item.product._id}: ${commentsRes.status}`);
              continue;
            }
            const existingComments: Comment[] = await commentsRes.json();
            const hasCommented = existingComments.some(
              (comment) => comment.userId === userId && comment.orderId === order._id
            );
            reviewMap[`${item.product._id}-${order._id}`] = !hasCommented;
          } catch (err) {
            console.error(`Error checking comments for product ${item.product._id}:`, err);
            reviewMap[`${item.product._id}-${order._id}`] = false;
          }
        }
      }
      setCanReviewMap(reviewMap);
      const paymentRes = await fetchWithAuth(`${API_BASE_URL}/api/payments/get-by-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (paymentRes.ok) {
        const paymentData = await paymentRes.json();
        let map: Record<string, string> = {};
        if (paymentData.status === "success" && Array.isArray(paymentData.data)) {
          paymentData.data.forEach((p: any) => {
            if (p.orderId && p.paymentCode) {
              map[p.orderId] = p.paymentCode;
            }
          });
        } else {
          console.log("Payment data is empty or invalid:", paymentData);
        }
        setPaymentMap(map);
      } else {
        console.warn("Payment request failed:", paymentRes.status, paymentRes.statusText);
        throw new Error("Lỗi khi tải thông tin thanh toán.");
      }
    } catch (err: any) {
      setOrdersError(err.message || "Lỗi khi tải danh sách đơn hàng.");
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchWishlist = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setWishlistError("Vui lòng đăng nhập để xem danh sách yêu thích.");
      showToast("error", "Vui lòng đăng nhập để xem danh sách yêu thích!");
      setWishlistLoading(false);
      window.location.href = "/user/login";
      return;
    }
    setWishlistLoading(true);
    setWishlistError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/favorite-products`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const status = res.status;
        const errorMap: { [key: number]: string } = {
          400: "User ID không hợp lệ.",
          401: "Người dùng không được xác thực hoặc token không hợp lệ.",
          404: "Không tìm thấy người dùng.",
          500: "Lỗi server, có thể do kết nối database.",
        };
        const errorMessage = errorMap[status] || "Không thể tải danh sách yêu thích.";
        throw new Error(errorMessage);
      }
      const data = await res.json();
      console.log("Wishlist data:", data);
      if (!Array.isArray(data.favoriteProducts)) {
        console.warn("Invalid favoriteProducts format:", data);
        setProducts([]);
        return;
      }
      const productsRes = await fetch(`${API_BASE_URL}/api/products/active`, {
        cache: "no-store",
      });
      if (!productsRes.ok) {
        throw new Error(`Lỗi tải sản phẩm: ${productsRes.status}`);
      }
      const productsData: Product[] = await productsRes.json();
      console.log("Products data:", productsData);
      const processedProducts = data.favoriteProducts.map((favProduct: any) => {
        const fullProduct = productsData.find(p => p._id === favProduct._id) || favProduct;
        return {
          ...favProduct,
          images: (fullProduct.images || []).filter((img: string) => typeof img === "string" && img.trim() !== "").map((img: string) => getImageUrl(img, fullProduct.name || "Unknown", cacheBuster)),
          price: getProductPrice(fullProduct, fullProduct.name || "Unknown"),
        };
      });
      setProducts(processedProducts);
    } catch (err: any) {
      setWishlistError(err.message || "Không thể tải danh sách yêu thích.");
      showToast("error", err.message || "Không thể tải danh sách yêu thích!");
    } finally {
      setWishlistLoading(false);
    }
  };

  const fetchCoupons = async () => {
    setCouponsLoading(true);
    setCouponsError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/coupons`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        } else if (res.status === 404) {
          setCoupons([]);
          return;
        }
        throw new Error("Lỗi khi tải danh sách mã giảm giá.");
      }
      const data = await res.json();
      if (data.message === "Lấy danh sách mã giảm giá thành công" && Array.isArray(data.coupons)) {
        const currentDate = new Date();
        const validCoupons = data.coupons.filter((coupon: Coupon) => 
          coupon.isActive && new Date(coupon.expiryDate) > currentDate
        );
        setCoupons(validCoupons);
      } else {
        setCoupons([]);
      }
    } catch (err: any) {
      setCouponsError(err.message || "Lỗi khi tải danh sách mã giảm giá.");
      showToast("error", err.message || "Lỗi khi tải danh sách mã giảm giá!");
    } finally {
      setCouponsLoading(false);
    }
  };

  const fetchCouponById = async (couponId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/coupons/${couponId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        } else if (res.status === 404) {
          throw new Error("Không tìm thấy mã giảm giá.");
        }
        throw new Error("Lỗi khi tải chi tiết mã giảm giá.");
      }
      const data = await res.json();
      if (data.message === "Lấy chi tiết mã giảm giá thành công" && data.coupon) {
        setSelectedCoupon(data.coupon);
      } else {
        throw new Error("Dữ liệu mã giảm giá không hợp lệ.");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi khi tải chi tiết mã giảm giá.");
      showToast("error", err.message || "Lỗi khi tải chi tiết mã giảm giá!");
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = useCallback(async (productId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      showToast("error", "Vui lòng đăng nhập để xóa sản phẩm!");
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/favorite-products/${productId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          showToast("error", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
          return;
        } else if (res.status === 400) {
          showToast("error", "ProductId không hợp lệ!");
          return;
        } else if (res.status === 404) {
          showToast("error", "Không tìm thấy người dùng!");
          return;
        } else if (res.status === 500) {
          showToast("error", "Lỗi server. Vui lòng thử lại sau!");
          return;
        }
        throw new Error("Không thể xóa sản phẩm khỏi danh sách yêu thích.");
      }
      setProducts((prev) => prev.filter((p) => p._id !== productId));
      showToast("success", "Đã xóa sản phẩm khỏi danh sách yêu thích!");
    } catch (err: any) {
      showToast("error", err.message || "Không thể xóa sản phẩm khỏi danh sách yêu thích!");
      console.error("Lỗi xóa sản phẩm:", err);
    }
  }, [showToast]);

  const fetchOrderById = async (orderId: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/orders/order/${orderId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        } else if (res.status === 404) {
          throw new Error("Không tìm thấy đơn hàng.");
        }
        throw new Error("Lỗi khi tải chi tiết đơn hàng.");
      }
      const data = await res.json();
      if (!data || !data._id || !data.items || !Array.isArray(data.items)) {
        throw new Error("Dữ liệu đơn hàng không hợp lệ.");
      }
      console.log("Order details:", data);
      const productsRes = await fetch(`${API_BASE_URL}/api/products/active`, {
        cache: "no-store",
      });
      if (!productsRes.ok) {
        throw new Error(`Lỗi tải sản phẩm: ${productsRes.status}`);
      }
      const productsData: Product[] = await productsRes.json();
      console.log("Products data:", productsData);
      const processedOrder = {
        ...data,
        items: data.items.map((item: any) => ({
          ...item,
          product: item.product
            ? {
                ...item.product,
                ...productsData.find(p => p._id === item.product?._id),
                images: (item.product.images || []).filter((img: string) => typeof img === "string" && img.trim() !== "").map((img: string) => getImageUrl(img, item.product?.name || "Unknown", cacheBuster)),
                price: getProductPrice(productsData.find(p => p._id === item.product?._id) || item.product, item.product?.name || "Unknown"),
              }
            : null,
        })),
        paymentCode: paymentMap[data._id],
      };
      const reviewMap: Record<string, boolean> = { ...canReviewMap };
      if (processedOrder.paymentStatus === "completed" && processedOrder.shippingStatus === "delivered") {
        const orderDate = new Date(processedOrder.createdAt);
        const currentDate = new Date();
        const daysDiff = (currentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff <= REVIEW_WINDOW_DAYS) {
          for (const item of processedOrder.items) {
            if (!item.product?._id) continue;
            try {
              const commentsRes = await fetchWithAuth(`${API_BASE_URL}/api/comments/product/${item.product._id}`);
              if (!commentsRes.ok) {
                console.warn(`Failed to fetch comments for product ${item.product._id}: ${commentsRes.status}`);
                continue;
              }
              const existingComments: Comment[] = await commentsRes.json();
              const hasCommented = existingComments.some(
                (comment) => comment.userId === user?.id && comment.orderId === processedOrder._id
              );
              reviewMap[`${item.product._id}-${processedOrder._id}`] = !hasCommented;
            } catch (err) {
              console.error(`Error checking comments for product ${item.product._id}:`, err);
              reviewMap[`${item.product._id}-${processedOrder._id}`] = false;
            }
          }
        }
      }
      setCanReviewMap(reviewMap);
      setSelectedOrder(processedOrder);
    } catch (err: any) {
      setError(err.message || "Lỗi khi tải chi tiết đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/orders/cancel/${orderId}`, {
        method: "DELETE",
        body: JSON.stringify({
          cancelReason: cancelReason,
          cancelNote: cancelNote
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Lỗi khi hủy đơn hàng");
      }

      const data = await res.json();
      showToast("success", "Đã hủy đơn hàng thành công!");

      setOrders(prev => 
        prev.map(order => 
          order._id === orderId 
            ? { ...order, paymentStatus: "cancelled", shippingStatus: "cancelled" }
            : order
        )
      );

      if (selectedOrder?._id === orderId) {
        setSelectedOrder(prev => 
          prev ? { ...prev, paymentStatus: "cancelled", shippingStatus: "cancelled" } : null
        );
      }

      setShowCancelForm(false);
      setCancelReason("");
      setCancelNote("");

      const userId = localStorage.getItem("userId");
      if (userId) {
        await fetchOrders(userId);
      }
    } catch (err: any) {
      showToast("error", err.message || "Lỗi khi hủy đơn hàng");
    }
  };

  const requestOrderReturn = async (orderId: string, reason: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/orders/return/${orderId}`, {
        method: "POST",
        body: JSON.stringify({ returnReason: reason }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Lỗi khi yêu cầu hoàn hàng.");
      }
      const data = await res.json();
      showToast("success", data.message || "Yêu cầu hoàn hàng đã được gửi!");
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? { ...order, returnStatus: "requested", returnReason: reason }
            : order
        )
      );
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, returnStatus: "requested", returnReason: reason });
      }
      setShowReturnForm(false);
      setReturnReason("");
    } catch (err: any) {
      showToast("error", err.message || "Lỗi khi yêu cầu hoàn hàng.");
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Vui lòng điền đầy đủ các trường mật khẩu.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        showToast("error", "Không tìm thấy userId. Vui lòng đăng nhập lại.");
        return;
      }

      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/change-password/${userId}`, {
        method: "PUT",
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Lỗi khi đổi mật khẩu.");
      }

      const data = await res.json();
      showToast("success", data.message || "Đổi mật khẩu thành công!");
      setShowPasswordForm(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordError(null);
    } catch (err: any) {
      setPasswordError(err.message || "Lỗi khi đổi mật khẩu.");
      showToast("error", err.message || "Lỗi khi đổi mật khẩu!");
    }
  };

  const retryFetchOrders = () => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      fetchOrders(userId);
    }
  };

  const retryFetchCoupons = () => {
    fetchCoupons();
  };

  const renderOrderStatus = (order: Order) => (
    <div className={styles.statusGroup}>
      <span
        className={`${styles.statusButton} ${
          order.paymentStatus === "pending"
            ? styles.pending
            : order.paymentStatus === "completed"
            ? styles.completed
            : order.paymentStatus === "cancelled"
            ? styles.cancelled
            : styles.failed
        }`}
      >
        {order.paymentStatus === "pending"
          ? "Chờ thanh toán"
          : order.paymentStatus === "completed"
          ? "Đã thanh toán"
          : order.paymentStatus === "cancelled"
          ? "Đã hủy"
          : "Thanh toán lỗi"}
      </span>
      <span
        className={`${styles.statusButton} ${
          order.shippingStatus === "pending"
            ? styles.pending
            : order.shippingStatus === "in_transit"
            ? styles.intransit
            : order.shippingStatus === "delivered"
            ? styles.delivered
            : styles.returned
        }`}
        style={{ marginLeft: 8 }}
      >
        {order.shippingStatus === "pending"
          ? "Chờ giao hàng"
          : order.shippingStatus === "in_transit"
          ? "Đang giao"
          : order.shippingStatus === "delivered"
          ? "Đã giao"
          : order.shippingStatus === "cancelled"
          ? "Đã hủy"
          : "Đã trả hàng"}
      </span>
      {order.returnStatus !== "none" && (
        <span
          className={`${styles.statusButton} ${
            order.returnStatus === "requested"
              ? styles.pending
              : order.returnStatus === "approved"
              ? styles.completed
              : styles.cancelled
          }`}
          style={{ marginLeft: 8 }}
        >
          {order.returnStatus === "requested"
            ? "Đã yêu cầu hoàn hàng"
            : order.returnStatus === "approved"
            ? "Hoàn hàng được chấp nhận"
            : "Hoàn hàng bị từ chối"}
        </span>
      )}
      {order.shippingStatus === "cancelled" && (
        <span
          className={`${styles.statusButton} ${styles.cancelled}`}
          style={{ marginLeft: 8 }}
        >
          Đã hủy
        </span>
      )}
    </div>
  );

  const formatAddress = (address: any) => {
    if (!address) return "Chưa cập nhật";
    if (typeof address === "string") {
      return address;
    }
    if (typeof address === "object" && address.addressLine) {
      return `${address.addressLine}, ${address.ward}, ${address.district}, ${address.cityOrProvince}`;
    }
    return "Chưa cập nhật";
  };

  const canRequestReturn = (order: Order) => {
    if (order.shippingStatus !== "delivered" || order.returnStatus !== "none") {
      return false;
    }
    const orderDate = new Date(order.createdAt);
    const currentDate = new Date();
    const daysDiff = (currentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 4;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");
        if (!token) {
          setError("Không có token. Vui lòng đăng nhập.");
          setLoading(false);
          return;
        }
        if (!userId || userId === "undefined" || !userId.match(/^[0-9a-fA-F]{24}$/)) {
          setError("Không tìm thấy hoặc userId không hợp lệ. Vui lòng đăng nhập lại.");
          setLoading(false);
          return;
        }
        await fetchUserInfo();
        await fetchOrders(userId);
        await fetchWishlist();
        await fetchCoupons();
      } catch (err: any) {
        setError(err.message || "Lỗi khi tải dữ liệu.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <p className={styles.loading}>Đang tải thông tin...</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!user) return <p className={styles.error}>Không tìm thấy thông tin người dùng.</p>;

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <h3 className={styles.greeting}>
          Xin chào, <br /> {user.username}
        </h3>
        <ul className={styles.menu}>
          <li
            className={`${styles.menuItem} ${selectedSection === "profile" ? styles.active : ""}`}
            onClick={() => {
              setSelectedSection("profile");
              setSelectedOrder(null);
              setSelectedCoupon(null);
              setShowReturnForm(false);
              setShowPasswordForm(false);
            }}
          >
            Tài khoản
          </li>
          <li
            className={`${styles.menuItem} ${selectedSection === "orders" ? styles.active : ""}`}
            onClick={() => {
              setSelectedSection("orders");
              setSelectedOrder(null);
              setSelectedCoupon(null);
              setShowReturnForm(false);
              setShowPasswordForm(false);
            }}
          >
            Đơn hàng
          </li>
          <li
            className={`${styles.menuItem} ${selectedSection === "wishlist" ? styles.active : ""}`}
            onClick={() => {
              setSelectedSection("wishlist");
              setSelectedOrder(null);
              setSelectedCoupon(null);
              setShowReturnForm(false);
              setShowPasswordForm(false);
            }}
          >
            Sản phẩm yêu thích
          </li>
          <li
            className={`${styles.menuItem} ${selectedSection === "coupons" ? styles.active : ""}`}
            onClick={() => {
              setSelectedSection("coupons");
              setSelectedOrder(null);
              setSelectedCoupon(null);
              setShowReturnForm(false);
              setShowPasswordForm(false);
            }}
          >
            Mã giảm giá
          </li>
        </ul>
      </div>

      <div className={styles.content}>
        {selectedSection === "profile" && (
          <>
            <h2 className={styles.title}>Tài khoản</h2>
            <div className={styles.userInfo}>
              <p className={styles.infoRow}><strong>Tên:</strong> {user.username}</p>
              <p className={styles.infoRow}><strong>Email:</strong> {user.email}</p>
              <p className={styles.infoRow}><strong>SĐT:</strong> {user.phone}</p>
              <p className={styles.infoRow}>
                <strong>Địa chỉ:</strong> {formatAddress(user.address)}
              </p>
          
              <p className={styles.infoRow}>
                <strong>Ngày sinh:</strong>{" "}
                {user.birthday ? new Date(user.birthday).toLocaleDateString() : "Chưa cập nhật"}
              </p>
            </div>
            <div className={styles.buttonGroup}>
              <Link href={`/user/edituser/${localStorage.getItem("userId") || ""}`} className={styles.editLink}>
                <button className={styles.editButton}>Chỉnh sửa thông tin</button>
              </Link>
              <button
                className={styles.editButton}
                style={{ marginLeft: "10px", background: "#2d8cf0" }}
                onClick={() => setShowPasswordForm(true)}
              >
                Đổi mật khẩu
              </button>
            </div>
            {showPasswordForm && (
              <div className={styles.passwordForm}>
                <h3>Đổi mật khẩu</h3>
                {passwordError && <p className={styles.error}>{passwordError}</p>}
                <div className={styles.formGroup}>
                  <label htmlFor="oldPassword">Mật khẩu cũ</label>
                  <input
                    type="password"
                    id="oldPassword"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu cũ"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="newPassword">Mật khẩu mới</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="confirmNewPassword">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    id="confirmNewPassword"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Xác nhận mật khẩu mới"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formActions}>
                  <button
                    className={styles.submitButton}
                    onClick={handleChangePassword}
                    style={{
                      background: "#357E38",
                      color: "#fff",
                      padding: "8px 20px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      marginRight: "12px",
                    }}
                  >
                    Xác nhận
                  </button>
                  <button
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowPasswordForm(false);
                      setOldPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                      setPasswordError(null);
                    }}
                    style={{
                      background: "#e74c3c",
                      color: "#fff",
                      padding: "8px 20px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {selectedSection === "orders" && !selectedOrder && (
          <>
            <h2 className={styles.title}>Đơn hàng</h2>
            {ordersLoading && <p className={styles.loading}>Đang tải danh sách đơn hàng...</p>}
            {ordersError && (
              <div className={styles.error}>
                <p>{ordersError}</p>
                <button onClick={retryFetchOrders} className={styles.editButton}>
                  Thử lại
                </button>
              </div>
            )}
            {!ordersLoading && !ordersError && (
              <>
                {orders.length === 0 ? (
                  <p className={styles.infoRow}>Chưa có đơn hàng</p>
                ) : (
                  <div className={styles.orderCards}>
                    {orders.map((order) => (
                      <div key={order._id} className={styles.orderCard}>
                        <div className={styles.orderHeader}>
                          <span>Mã đơn hàng: {order._id}</span>
                          <span
                            className={`${styles.statusButton} ${
                              order.shippingStatus === "pending"
                                ? styles.pending
                                : order.shippingStatus === "in_transit"
                                ? styles.intransit  
                                : order.shippingStatus === "delivered"
                                ? styles.delivered
                                : order.shippingStatus === "cancelled"
                                ? styles.cancelled
                                : styles.returned
                            }`}
                          >
                            {order.shippingStatus === "pending"
                              ? "Đang chờ xử lý"
                              : order.shippingStatus === "in_transit"
                              ? "Đang giao"
                              : order.shippingStatus === "delivered" 
                              ? "Đã giao"
                              : order.shippingStatus === "cancelled"
                              ? "Hủy hàng"
                              : "Hoàn hàng"}
                          </span>
                        </div>
                        <p>Ngày đặt: {new Date(order.createdAt).toLocaleDateString()}</p>
                        <p>Tổng tiền: {formatPrice(order.total)}</p>
                        <p>Thanh toán: {translatePaymentMethod(order.paymentMethod ?? "")}</p>
                        {order.couponCode && <p>Mã giảm giá: {order.couponCode}</p>}
                        <button
                          className={styles.detailButton}
                          onClick={() => fetchOrderById(order._id)}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {selectedSection === "orders" && selectedOrder && (
          <>
            <h2 className={styles.title}>Chi tiết đơn hàng: {selectedOrder._id}</h2>
            {loading && <p className={styles.loading}>Đang tải chi tiết đơn hàng...</p>}
            {error && <p className={styles.error}>{error}</p>}
            {!loading && !error && (
              <div className={styles.orderDetails}>
                <div className={styles.cartTitle}>
                  <span>Sản phẩm</span>
                  <span>Tổng</span>
                </div>
                {selectedOrder.items.map((item, index) => {
                  const price = item.product ? getProductPrice(item.product, item.product.name || "Unknown") : 0;
                  let optionValue = "";
                  if (item.product && item.product.option && Array.isArray(item.product.option) && item.optionId) {
                    const opt = item.product.option.find((o: any) => o?._id === item.optionId);
                    if (opt && opt.value) optionValue = opt.value;
                  }
                  return (
                    <div key={index} className={styles.productItem}>
                      <div className={styles.cartItemImage}>
                        <Image
                          src={
                            item.product && item.product.images && item.product.images.length > 0
                              ? item.product.images[0]
                              : ERROR_IMAGE_URL
                          }
                          alt={item.product?.name || "Sản phẩm"}
                          width={100}
                          height={100}
                          quality={100}
                          onError={(e) => {
                            console.error(`Image load failed for product "${item.product?.name || "Unknown"}"`);
                            (e.target as HTMLImageElement).src = ERROR_IMAGE_URL;
                          }}
                        />
                      </div>
                      <div className={styles.productInfo}>
                        <div className={styles.cartItemName}>
                          {item.product?.name || "Sản phẩm không xác định"}
                          {optionValue && <span style={{ color: "#888", fontWeight: 400 }}> ({optionValue})</span>}
                        </div>
                        <div className={styles.cartItemDesc}>Số lượng: {item.quantity}</div>
                        {item.product?._id && canReviewMap[`${item.product._id}-${selectedOrder._id}`] && (
                          <Link
                            href={`/user/detail/${item.product.slug || item.product._id}#writeReviewForm`}
                            className={styles.reviewLink}
                            style={{
                              width: "105px",
                              display: "inline-block",
                              background: "#357E38",
                              color: "#fff",
                              padding: "6px 12px",
                              borderRadius: 4,
                              textDecoration: "none",
                              fontSize: "14px",
                              marginTop: "8px",
                            }}
                          >
                            Viết đánh giá
                          </Link>
                        )}
                      </div>
                      <div className={styles.productPrice}>
                        {formatPrice(price * item.quantity)}
                      </div>
                    </div>
                  );
                })}
                <div className={styles.cartSummary}>
                  <div className={styles.summaryRow}>
                    <span>Tổng</span>
                    <span>{formatPrice(selectedOrder.subtotal || selectedOrder.total)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Mã giảm</span>
                    <span>-{formatPrice(selectedOrder.discount || 0)}</span>
                  </div>
                  <div className={`${styles.summaryRow} ${styles.total}`}>
                    <span>Tổng cộng</span>
                    <span>{formatPrice(selectedOrder.total)}</span>
                  </div>
                  <div className={styles.summaryNote}>
                    (Tổng giá bao gồm tất cả các loại thuế và phí)
                  </div>
                </div>

                {selectedOrder.note && (
                  <div className={styles.noteSection}>
                    <h3>Ghi chú đơn hàng</h3>
                    <p>{selectedOrder.note}</p>
                  </div>
                )}

                {(selectedOrder.shippingStatus === "cancelled" || selectedOrder.paymentStatus === "cancelled") && (
                  <div className={styles.noteSection}>
                    <h3>Thông tin hủy đơn hàng</h3>
                    <p><strong>Trạng thái:</strong> Đã hủy</p>
                    {selectedOrder.cancelReason && (
                      <p>
                        <strong>Lý do hủy:</strong> {translateCancelReason(selectedOrder.cancelReason)}
                      </p>
                    )}
                    {selectedOrder.cancelNote && (
                      <p><strong>Ghi chú hủy:</strong> {selectedOrder.cancelNote}</p>
                    )}
                    {selectedOrder.cancelledAt && (
                      <p><strong>Thời gian hủy:</strong> {formatDate(selectedOrder.cancelledAt)}</p>
                    )}
                    {selectedOrder.cancelledBy && (
                      <p>
                        <strong>Hủy bởi:</strong> {selectedOrder.cancelledBy === "admin" ? "Quản trị viên" : "Khách hàng"}
                      </p>
                    )}
                  </div>
                )}

                {selectedOrder.returnStatus !== "none" && (
                  <div className={styles.noteSection}>
                    <h3>Trạng thái hoàn hàng</h3>
                    <p>
                      <strong>Trạng thái:</strong>{" "}
                      {selectedOrder.returnStatus === "requested"
                        ? "Đã yêu cầu hoàn hàng"
                        : selectedOrder.returnStatus === "approved"
                        ? "Hoàn hàng được chấp nhận"
                        : "Hoàn hàng bị từ chối"}
                    </p>
                    {selectedOrder.returnReason && (
                      <p><strong>Lý do hoàn hàng:</strong> {selectedOrder.returnReason}</p>
                    )}
                  </div>
                )}

                {selectedOrder.paymentMethod === "bank" && selectedOrder.paymentStatus === "pending" && selectedOrder.paymentCode && (
                  <div className={styles.paymentNotice}>
                    <p style={{ color: "#e67e22", margin: "12px 0" }}>
                      Đơn hàng của bạn chưa được thanh toán. Vui lòng thanh toán online để hoàn tất đơn hàng.
                    </p>
                    <a
                      href={`/user/payment?paymentCode=${encodeURIComponent(selectedOrder.paymentCode)}&amount=${selectedOrder.total}`}
                      className={styles.paymentLink}
                      style={{
                        display: "inline-block",
                        background: "#2d8cf0",
                        color: "#fff",
                        padding: "8px 20px",
                        borderRadius: 6,
                        textDecoration: "none",
                        fontWeight: 500,
                        marginBottom: 16,
                      }}
                    >
                      Thanh toán ngay
                    </a>
                  </div>
                )}

                <div className={styles.addressSection}>
                  <h3>Địa chỉ nhận hàng</h3>
                  <p><strong>Tên:</strong> {user.username}</p>
                  <p><strong>SĐT:</strong> {selectedOrder.sdt || user.phone}</p>
                  <p>
                    <strong>Địa chỉ:</strong>{" "}
                    {selectedOrder.address ? (
                      formatAddress(selectedOrder.address)
                    ) : (
                      formatAddress(user.address)
                    )}
                  </p>
                  <p><strong>Giao hàng:</strong> Giao Hàng Nhanh</p>
                </div>

                {selectedOrder.paymentStatus === "pending" && selectedOrder.shippingStatus === "pending" && (
                  <>
                    {!showCancelForm ? (
                      <button
                        className={styles.cancelButton}
                        style={{
                          background: "#e74c3c",
                          color: "#fff",
                          padding: "8px 20px",
                          borderRadius: 6,
                          border: "none",
                          cursor: "pointer",
                          marginTop: "16px",
                        }}
                        onClick={() => setShowCancelForm(true)}
                      >
                        Hủy đơn hàng
                      </button>
                    ) : (
                      <div className={styles.cancelForm}>
                        <h3>Lý do hủy đơn hàng</h3>
                        <select
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            marginBottom: "12px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                          }}
                        >
                          <option value="">-- Chọn lý do hủy --</option>
                          <option value="Đổi ý không mua nữa">Đổi ý không mua nữa</option>
                          <option value="Muốn thay đổi sản phẩm">Muốn thay đổi sản phẩm</option>
                          <option value="Thay đổi phương thức thanh toán">Thay đổi phương thức thanh toán</option>
                          <option value="Thay đổi địa chỉ giao hàng">Thay đổi địa chỉ giao hàng</option>
                          <option value="Lý do khác">Lý do khác</option>
                        </select>
                        {cancelReason && (
                          <div className={styles.selectedReason}>
                            <p><strong>Lý do đã chọn:</strong> {cancelReason}</p>
                          </div>
                        )}
                        <textarea
                          value={cancelNote}
                          onChange={(e) => setCancelNote(e.target.value)}
                          placeholder="Nhập thêm ghi chú (nếu có)"
                          style={{
                            width: "100%",
                            minHeight: "100px",
                            padding: "8px",
                            marginBottom: "12px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                          }}
                        />
                        {cancelNote && (
                          <div className={styles.selectedNote}>
                            <p><strong>Ghi chú:</strong> {cancelNote}</p>
                          </div>
                        )}
                        <div>
                          <button
                            className={styles.submitCancelButton}
                            style={{
                              background: "#e74c3c",
                              color: "#fff",
                              padding: "8px 20px",
                              borderRadius: 6,
                              border: "none",
                              cursor: "pointer",
                              marginRight: "12px",
                            }}
                            onClick={() => {
                              if (!cancelReason) {
                                showToast("error", "Vui lòng chọn lý do hủy đơn hàng");
                                return;
                              }
                              cancelOrder(selectedOrder._id);
                            }}
                            disabled={!cancelReason}
                          >
                            Xác nhận hủy
                          </button>
                          <button
                            className={styles.cancelButton}
                            style={{
                              background: "#95a5a6",
                              color: "#fff",
                              padding: "8px 20px",
                              borderRadius: 6,
                              border: "none",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setShowCancelForm(false);
                              setCancelReason("");
                              setCancelNote("");
                            }}
                          >
                            Đóng
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {canRequestReturn(selectedOrder) && (
                  <button
                    className={styles.returnButton}
                    style={{
                      background: "#8B4513",
                      color: "#fff",
                      padding: "8px 20px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      marginTop: "16px",
                      marginLeft: "16px",
                    }}
                    onClick={() => setShowReturnForm(true)}
                  >
                    Yêu cầu hoàn hàng
                  </button>
                )}

                {showReturnForm && (
                  <div className={styles.returnForm}>
                    <h3>Lý do yêu cầu hoàn hàng</h3>
                    <textarea
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="Vui lòng nhập lý do hoàn hàng"
                      style={{
                        width: "100%",
                        minHeight: "100px",
                        padding: "8px",
                        marginBottom: "12px",
                        borderRadius: 4,
                        border: "1px solid #ccc",
                      }}
                    />
                    <div>
                      <button
                        className={styles.submitReturnButton}
                        style={{
                          background: "#2d8cf0",
                          color: "#fff",
                          padding: "8px 20px",
                          borderRadius: 6,
                          border: "none",
                          cursor: "pointer",
                          marginRight: "12px",
                        }}
                        onClick={() => requestOrderReturn(selectedOrder._id, returnReason)}
                        disabled={!returnReason.trim()}
                      >
                        Gửi yêu cầu
                      </button>
                      <button
                        className={styles.cancelReturnButton}
                        style={{
                          background: "#e74c3c",
                          color: "#fff",
                          padding: "8px 20px",
                          borderRadius: 6,
                          border: "none",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          setShowReturnForm(false);
                          setReturnReason("");
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}

                <button
                  className={styles.backButton}
                  onClick={() => {
                    setSelectedOrder(null);
                    setShowReturnForm(false);
                    setReturnReason("");
                  }}
                >
                  Trở lại
                </button>
              </div>
            )}
          </>
        )}

        {selectedSection === "wishlist" && (
          <>
            <h2 className={styles.title}>Sản phẩm yêu thích</h2>
            {wishlistLoading && <p className={styles.loading}>Đang tải danh sách yêu thích...</p>}
            {wishlistError && (
              <div className={styles.error}>
                <p>{wishlistError}</p>
                <button onClick={fetchWishlist} className={styles.editButton}>
                  Thử lại
                </button>
              </div>
            )}
            {!wishlistLoading && !wishlistError && (
              <>
                {products.length === 0 ? (
                  <p className={styles.infoRow}>Chưa có sản phẩm yêu thích</p>
                ) : (
                  <div className={styles.wishlistCards}>
                    {products.map((product) => (
                      <Link
                        href={`/user/detail/${product.slug || product._id}`}
                        key={product._id}
                        className={styles.wishlistCard}
                        style={{ textDecoration: "none" }}
                      >
                        <Image
                          src={product.images && product.images.length > 0 ? product.images[0] : ERROR_IMAGE_URL}
                          alt={product.name}
                          width={100}
                          height={100}
                          quality={100}
                          onError={(e) => {
                            console.error(`Image load failed for product "${product.name}"`);
                            (e.target as HTMLImageElement).src = ERROR_IMAGE_URL;
                          }}
                        />
                        <div className={styles.wishlistInfo}>
                          <h3>{product.name}</h3>
                          <p>{formatPrice(product.price)}</p>
                          <span
                            className={styles.removeIcon}
                            onClick={(e) => {
                              e.preventDefault();
                              removeFromWishlist(product._id);
                            }}
                            style={{ cursor: "pointer", color: "#e74c3c", fontSize: "20px" }}
                          >
                            ×
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {selectedSection === "coupons" && !selectedCoupon && (
          <>
            <h2 className={styles.title}>Mã giảm giá</h2>
            {couponsLoading && <p className={styles.loading}>Đang tải danh sách mã giảm giá...</p>}
            {couponsError && (
              <div className={styles.error}>
                <p>{couponsError}</p>
                <button onClick={retryFetchCoupons} className={styles.editButton}>
                  Thử lại
                </button>
              </div>
            )}
            {!couponsLoading && !couponsError && (
              <>
                {coupons.length === 0 ? (
                  <p className={styles.infoRow}>Chưa có mã giảm giá hợp lệ</p>
                ) : (
                  <div className={styles.orderCards}>
                    {coupons.map((coupon) => (
                      <div key={coupon._id} className={styles.orderCard}>
                        <div className={styles.orderHeader}>
                          <span>Mã: {coupon.code}</span>
                          <span
                            className={`${styles.statusButton} ${
                              coupon.isActive ? styles.completed : styles.cancelled
                            }`}
                          >
                            {coupon.isActive ? "Đang hoạt động" : "Không hoạt động"}
                          </span>
                        </div>
                        <p>Giảm: {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue)}</p>
                        <p>Đơn tối thiểu: {formatPrice(coupon.minOrderValue)}</p>
                        <p>Hết hạn: {formatDate(coupon.expiryDate)}</p>
                        <button
                          className={styles.detailButton}
                          onClick={() => fetchCouponById(coupon._id)}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {selectedSection === "coupons" && selectedCoupon && (
          <>
            <h2 className={styles.title}>Chi tiết mã giảm giá: {selectedCoupon.code}</h2>
            {loading && <p className={styles.loading}>Đang tải chi tiết mã giảm giá...</p>}
            {error && <p className={styles.error}>{error}</p>}
            {!loading && !error && (
              <div className={styles.userInfo}>
                <p className={styles.infoRow}><strong>Mã giảm giá:</strong> {selectedCoupon.code}</p>
                <p className={styles.infoRow}>
                  <strong>Loại giảm giá:</strong>{" "}
                  {selectedCoupon.discountType === "percentage" ? "Phần trăm" : "Cố định"}
                </p>
                <p className={styles.infoRow}>
                  <strong>Giá trị giảm:</strong>{" "}
                  {selectedCoupon.discountType === "percentage"
                    ? `${selectedCoupon.discountValue}%`
                    : formatPrice(selectedCoupon.discountValue)}
                </p>
                <p className={styles.infoRow}>
                  <strong>Đơn hàng tối thiểu:</strong> {formatPrice(selectedCoupon.minOrderValue)}
                </p>
                <p className={styles.infoRow}>
                  <strong>Hạn sử dụng:</strong> {formatDate(selectedCoupon.expiryDate)}
                </p>
                <p className={styles.infoRow}>
                  <strong>Giới hạn sử dụng:</strong> {selectedCoupon.usageLimit} 
                </p>
                <p className={styles.infoRow}>
                  <strong>Trạng thái:</strong> {selectedCoupon.isActive ? "Đang hoạt động" : "Không hoạt động"}
                </p>
                <p className={styles.infoRow}>
                  <strong>Ngày tạo:</strong> {formatDate(selectedCoupon.createdAt)}
                </p>
                <p className={styles.infoRow}>
                  <strong>Ngày cập nhật:</strong> {formatDate(selectedCoupon.updatedAt)}
                </p>
                <button
                  className={styles.backButton}
                  onClick={() => setSelectedCoupon(null)}
                >
                  Trở lại
                </button>
              </div>
            )}
          </>
        )}

        {message && (
          <div className={styles.toastNotification}>
            <p className={`${styles[message.type]}`}>{message.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}