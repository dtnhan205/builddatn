"use client";
import { useEffect, useState, useMemo, useCallback, Key } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./Detail.module.css";
import Image from "next/image";
import ToastNotification from "../../ToastNotification/ToastNotification";
import { Product } from "@/app/components/product_interface";
import { Comment } from "@/app/components/comment_interface";

// Biến môi trường
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api-zeal.onrender.com";
const ERROR_IMAGE_URL = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";

// Hằng số
const DEFAULT_TIMEOUT_DURATION = 10000; // 10 giây cho các request thông thường
const UPLOAD_TIMEOUT_DURATION = 120000; // 120 giây cho upload file lớn
const MIN_COMMENT_LENGTH = 3;
const TOAST_DURATION = 3000;
const MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100MB to support videos
const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm"
];

const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null || isNaN(price)) {
    return "0đ";
  }
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
};

// Hàm tiện ích: Lấy URL hình ảnh
const getImageUrl = (image: string): string => {
  if (!image || typeof image !== "string" || image.trim() === "") {
    console.warn("Invalid image URL detected, using fallback:", ERROR_IMAGE_URL);
    return ERROR_IMAGE_URL;
  }
  try {
    new URL(image);
    return image;
  } catch (e) {
    console.warn("Invalid URL format for image:", image, "using fallback:", ERROR_IMAGE_URL);
    return ERROR_IMAGE_URL;
  }
};

// Hàm tiện ích: Giải mã token JWT
const decodeToken = (token: string) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Lỗi khi giải mã token:", error);
    return null;
  }
};

// Hook tùy chỉnh: Lấy thông tin người dùng từ token
const useUserInfo = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("Người dùng");
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        const userIdFromToken = decoded.id || decoded._id;
        const usernameFromToken = decoded.username || "Người dùng";
        const roleFromToken = decoded.role || "user";
        if (userIdFromToken) {
          setUserId(userIdFromToken);
          setUsername(usernameFromToken);
          setRole(roleFromToken);
        }
      }
    }
    setLoading(false);
  }, []);

  return { userId, username, role, loading };
};

// Hook tùy chỉnh: Quản lý thông báo toast
const useToast = () => {
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  const showToast = useCallback((type: "success" | "error" | "warning", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), TOAST_DURATION);
  }, []);

  const hideToast = useCallback(() => setMessage(null), []);

  return { message, showToast, hideToast };
};

// Hàm API: Gửi yêu cầu đến API với xử lý timeout động
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const defaultHeaders: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const isFormData = options.body instanceof FormData;
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  };

  const timeoutDuration = endpoint.includes("/comments") ? 300000 : DEFAULT_TIMEOUT_DURATION;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      const response = await fetch(url, { ...config, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: await response.text() };
        }
        throw new Error(errorData.error || `Lỗi HTTP: ${response.status} - ${response.statusText}`);
      }

      const contentType = response.headers.get("Content-Type") || "";
      return contentType.includes("application/json") ? await response.json() : await response.text();
    } catch (error) {
      attempt++;
      if (attempt === maxAttempts || !(error instanceof Error && error.name === "AbortError")) {
        clearTimeout(timeoutId);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Retry sau 1s, 2s, 3s
    }
  }
  throw new Error("Đã thử lại tối đa nhưng không thành công!");
};

const MediaModal = ({ src, type, onClose }: { src: string; type: 'image' | 'video'; onClose: () => void }) => {
  console.log("Rendering MediaModal:", { src, type });
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {type === 'image' ? (
          <Image src={src} alt="Media preview" fill style={{ objectFit: 'contain' }} />
        ) : (
          <video src={src} controls autoPlay className={styles.modalVideo} />
        )}
        <button className={styles.closeButton} onClick={onClose}>×</button>
      </div>
    </div>
  );
};

export default function DetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const identifier = useMemo(() => (Array.isArray(id) ? id[0] : id), [id]);
  const [cacheBuster, setCacheBuster] = useState("");
  const [filterRating, setFilterRating] = useState<number | "all">("all");

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingAdminReply, setSubmittingAdminReply] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [favoriteProducts, setFavoriteProducts] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(0);
  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [canReview, setCanReview] = useState<boolean>(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [adminReplyContent, setAdminReplyContent] = useState<string>("");
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null);
  const [showAdminReply, setShowAdminReply] = useState<{ [key: string]: boolean }>({});

  // State cho modal preview media
  const [modalMedia, setModalMedia] = useState<{ src: string; type: 'image' | 'video' } | null>(null);

  const { userId, username, role, loading: userLoading } = useUserInfo();
  const { message: cartMessage, showToast: showCartToast, hideToast: hideCartToast } = useToast();
  const { message: commentMessage, showToast: showCommentToast, hideToast: hideCommentToast } = useToast();

  useEffect(() => {
    setCacheBuster(`t=${Date.now()}`);
  }, []);

  useEffect(() => {
    setQuantity(1);
  }, [selectedOptionIndex]);

  // Xử lý thay đổi media và tạo preview
const handleMediaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;

  const newImages: File[] = [];
  const newVideos: File[] = [];
  const newPreviews: string[] = [];

  Array.from(files).forEach((file) => {
    if (newImages.length + newVideos.length >= 5) {
      showCommentToast("error", "Tối đa 5 tệp (hình ảnh hoặc video)!");
      return;
    }
    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      showCommentToast("error", "Chỉ hỗ trợ định dạng JPEG, PNG, MP4, MPEG, MOV, hoặc WEBM!");
      return;
    }
    if (file.size > MAX_MEDIA_SIZE) {
      showCommentToast("error", `Tệp ${file.name} vượt quá 100MB! Vui lòng nén trước khi upload.`);
      return;
    }
    if (file.type.startsWith("image/")) {
      newImages.push(file);
      newPreviews.push(URL.createObjectURL(file));
    } else if (file.type.startsWith("video/")) {
      newVideos.push(file);
      // Tạo thumbnail nhanh hơn bằng cách giới hạn thời gian xử lý
      const videoUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.src = videoUrl;
      video.crossOrigin = "anonymous";
      video.onloadedmetadata = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;
        const context = canvas.getContext("2d");
        video.currentTime = 0.1; // Lấy frame đầu tiên nhanh
        video.onseeked = () => {
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL("image/jpeg");
            newPreviews.push(thumbnailUrl);
            setMediaPreviews([...mediaPreviews, ...newPreviews]);
          }
          URL.revokeObjectURL(videoUrl);
        };
        video.onerror = () => {
          showCommentToast("error", `Lỗi khi xử lý video ${file.name}.`);
          URL.revokeObjectURL(videoUrl);
        };
      };
    }
  });

  setImages([...images, ...newImages]);
  setVideos([...videos, ...newVideos]);
  if (newVideos.length === 0) {
    setMediaPreviews([...mediaPreviews, ...newPreviews]);
  }
}, [showCommentToast, images, videos, mediaPreviews]);

  // Xóa media khỏi danh sách preview
  const removeMedia = useCallback((index: number) => {
    // Xóa preview
    const previewToRemove = mediaPreviews[index];
    if (previewToRemove) {
      URL.revokeObjectURL(previewToRemove);
    }
    
    // Xóa khỏi images hoặc videos dựa trên index
    const isImage = index < images.length;
    if (isImage) {
      setImages((prevImages) => prevImages.filter((_, i) => i !== index));
    } else {
      const videoIndex = index - images.length;
      setVideos((prevVideos) => prevVideos.filter((_, i) => i !== videoIndex));
    }

    // Cập nhật mediaPreviews
    setMediaPreviews((prevPreviews) => prevPreviews.filter((_, i) => i !== index));
  }, [images, videos, mediaPreviews]);

  useEffect(() => {
    return () => {
      mediaPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [mediaPreviews]);

  useEffect(() => {
    const checkReviewEligibility = async () => {
      if (!userId || !product?._id || userLoading) {
        setCanReview(false);
        return;
      }

      try {
        const orders = await apiRequest(`/api/orders/user/${userId}`);
        if (!Array.isArray(orders) || orders.length === 0) {
          console.log("No orders found for user:", userId);
          setCanReview(false);
          return;
        }

        const existingComments = await apiRequest(`/api/comments/product/${product._id}`);
        const hasCommented = existingComments.some((comment: Comment) => comment.user?._id === userId);
        if (hasCommented) {
          console.log("User has already commented on this product:", product._id);
          setCanReview(false);
          return;
        }

        const eligibleOrder = orders.find((order: any) => {
          console.log("Checking order:", order);
          return (
            order.paymentStatus === "completed" &&
            order.shippingStatus === "delivered" &&
            order.items.some((item: any) => item.product?._id === product._id)
          );
        });

        setCanReview(!!eligibleOrder);
        console.log("canReview set to:", !!eligibleOrder);
      } catch (error) {
        console.error("Error checking review eligibility:", error);
        setCanReview(false);
      }
    };

    checkReviewEligibility();
  }, [userId, product?._id, userLoading]);

useEffect(() => {
  const fetchData = async () => {
    if (!identifier) {
      setLoading(false);
      setProduct(null);
      showCartToast("error", "Identifier sản phẩm không hợp lệ!");
      return;
    }

    try {
      setLoading(true);
      const data = await apiRequest(`/api/products/${identifier}`);
      console.log("Raw data from API:", data);
      console.log("Raw price:", data.option[0]?.price);
      console.log("Raw discount_price:", data.option[0]?.discount_price);
      const normalizedProduct = {
        ...data,
        option: data.option.map((opt: any) => ({
          ...opt,
        })),
      };
      setProduct(normalizedProduct);

      const fetchFavoriteProducts = async () => {
        const token = localStorage.getItem("token");
        if (token && normalizedProduct._id) {
          try {
            const data = await apiRequest("/api/users/favorite-products");
            const productIds = data.favoriteProducts.map((item: any) => item._id);
            setFavoriteProducts(productIds);
            setIsFavorite(productIds.includes(normalizedProduct._id));
            localStorage.setItem("favoriteProducts", JSON.stringify(productIds));
          } catch (error) {
            console.error("Lỗi khi lấy danh sách yêu thích:", error);
            const savedFavorites = localStorage.getItem("favoriteProducts");
            if (savedFavorites) {
              const productIds = JSON.parse(savedFavorites);
              setFavoriteProducts(productIds);
              setIsFavorite(productIds.includes(normalizedProduct._id));
            } else {
              setFavoriteProducts([]);
              setIsFavorite(false);
            }
          }
        }
      };
      await fetchFavoriteProducts();

      const fetchComments = async () => {
        const data = await apiRequest(`/api/comments/product/${normalizedProduct._id}`);
        setComments(Array.isArray(data) ? data : []);
      };
      await fetchComments();
    } catch (error) {
      console.error("Lỗi khi lấy sản phẩm:", error);
      setProduct(null);
      if (error instanceof Error && error.message.includes("400")) {
        showCartToast("error", "Identifier không hợp lệ!");
      } else if (error instanceof Error && error.message.includes("404")) {
        showCartToast("error", "Không tìm thấy sản phẩm!");
      } else {
        showCartToast("error", "Lỗi khi lấy thông tin sản phẩm!");
      }
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [identifier, userId, userLoading, showCartToast]);

const getProductPrice = (product: Product): number => {
  if (product.option && product.option.length > 0) {
    const opt = product.option[0];
    return Number(opt.discount_price) || Number(opt.price) || 0;
  }
  return 0;
};

  useEffect(() => {
    const fetchComments = async () => {
      if (!product?._id) {
        setComments([]);
        return;
      }
      try {
        const data = await apiRequest(`/api/comments/product/${product._id}`);
        setComments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Lỗi khi lấy bình luận:", error);
        setComments([]);
        showCommentToast("error", "Không thể tải bình luận, vui lòng thử lại sau!");
      }
    };
    fetchComments();
  }, [product?._id, showCommentToast]);

  const increaseQty = useCallback(() => setQuantity((prev) => prev + 1), []);
  const decreaseQty = useCallback(() => setQuantity((prev) => (prev > 1 ? prev - 1 : 1)), []);

  const addToCart = useCallback(async () => {
    if (!product || !product.option.length || !product.option[selectedOptionIndex]) return;

    const selectedOption = product.option[selectedOptionIndex];
    if (selectedOption.stock < quantity) {
      showCartToast("error", "Số lượng vượt quá tồn kho!");
      return;
    }

    const token = localStorage.getItem("token");
    if (!userId || !token) {
      showCartToast("warning", "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!");
      setTimeout(() => {
        window.location.href = "/user/login";
      }, 2000);
      return;
    }

    setAddingToCart(true);
    try {
      await apiRequest("/api/carts/add", {
        method: "POST",
        body: JSON.stringify({
          userId,
          productId: product._id,
          optionIds: [selectedOption._id],
          quantity,
        }),
      });

      showCartToast("success", "Đã thêm sản phẩm vào giỏ hàng!");
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      showCartToast("error", `Lỗi: ${error instanceof Error ? error.message : "Không thể thêm vào giỏ hàng"}`);
    } finally {
      setAddingToCart(false);
    }
  }, [product, selectedOptionIndex, quantity, userId, showCartToast]);

  const addToWishlist = useCallback(async () => {
    if (!product?._id) return;
    const token = localStorage.getItem("token");
    if (!token) {
      showCartToast("error", "Vui lòng đăng nhập để sử dụng chức năng này!");
      return;
    }

    try {
      if (isFavorite) {
        const response = await apiRequest(`/api/users/favorite-products/${product._id}`, {
          method: "DELETE",
        });
        const updatedFavorites = favoriteProducts.filter((id) => id !== product._id);
        setFavoriteProducts(updatedFavorites);
        setIsFavorite(false);
        localStorage.setItem("favoriteProducts", JSON.stringify(updatedFavorites));
        showCartToast("success", response.message || "Đã xóa khỏi danh sách yêu thích!");
      } else {
        const response = await apiRequest("/api/users/favorite-products", {
          method: "POST",
          body: JSON.stringify({ productId: product._id }),
        });
        const updatedFavorites = [...favoriteProducts, product._id];
        setFavoriteProducts(updatedFavorites);
        setIsFavorite(true);
        localStorage.setItem("favoriteProducts", JSON.stringify(updatedFavorites));
        showCartToast("success", response.message || "Đã thêm vào danh sách yêu thích!");
      }
    } catch (error) {
      console.error("Lỗi khi quản lý danh sách yêu thích:", error);
      if (error instanceof Error && error.message.includes("401")) {
        showCartToast("error", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        localStorage.removeItem("token");
        setTimeout(() => router.push("/user/login"), TOAST_DURATION);
      } else if (error instanceof Error && error.message.includes("400")) {
        showCartToast("error", "ProductId không hợp lệ!");
      } else if (error instanceof Error && error.message.includes("404")) {
        showCartToast("error", "Không tìm thấy người dùng!");
      } else if (error instanceof Error && error.message.includes("500")) {
        showCartToast("error", "Lỗi server. Vui lòng thử lại sau!");
      } else {
        showCartToast("error", "Lỗi khi cập nhật danh sách yêu thích!");
      }
    }
  }, [product?._id, isFavorite, favoriteProducts, showCartToast, router]);

  const submitComment = useCallback(async () => {
    if (!product?._id || !newComment.trim() || newComment.length < MIN_COMMENT_LENGTH) {
      showCommentToast("error", "Vui lòng nhập đánh giá (ít nhất 3 ký tự)!");
      return;
    }
    if (rating === 0) {
      showCommentToast("error", "Vui lòng chọn số sao (ít nhất 1 sao)!");
      return;
    }
    if (userLoading) {
      showCommentToast("error", "Đang tải thông tin người dùng, vui lòng đợi!");
      return;
    }
    if (!userId) {
      showCommentToast("error", "Vui lòng đăng nhập để gửi bình luận!");
      setTimeout(() => router.push("/user/login"), TOAST_DURATION);
      return;
    }
    if (images.length + videos.length > 5) {
      showCommentToast("error", "Tối đa 5 tệp (hình ảnh hoặc video)!");
      return;
    }

    setSubmittingComment(true);
    try {
      const productData = await apiRequest(`/api/products/${product._id}`);
      if (productData.id_brand && productData.id_brand.status === "hidden") {
        throw new Error("Không thể đánh giá vì thương hiệu của sản phẩm đang bị ẩn!");
      }

      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("productId", product._id);
      formData.append("content", newComment.trim());
      formData.append("rating", rating.toString());
      images.forEach((image) => formData.append("images", image));
      videos.forEach((video) => formData.append("commentVideo", video));

      const response = await apiRequest("/api/comments", {
        method: "POST",
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const updatedComments = await apiRequest(`/api/comments/product/${product._id}`);
      setComments(Array.isArray(updatedComments) ? updatedComments : []);

      setNewComment("");
      setRating(0);
      setImages([]);
      setVideos([]);
      setMediaPreviews([]);
      showCommentToast("success", "Đánh giá đã được gửi!");
      setCanReview(false);
    } catch (error) {
      console.error("Lỗi khi gửi bình luận:", error);
      const message = error instanceof Error ? error.message : "Lỗi khi gửi đánh giá!";
      if (message.includes("Chỉ hỗ trợ định dạng")) {
        showCommentToast("error", "Chỉ hỗ trợ định dạng JPEG, PNG, MP4, MPEG, MOV, hoặc WEBM!");
      } else if (message.includes("fileSize")) {
        showCommentToast("error", "Tệp vượt quá kích thước cho phép (100MB)!");
      } else if (message.includes("files")) {
        showCommentToast("error", "Số lượng tệp vượt quá giới hạn (5 tệp)!");
      } else if (message.includes("500")) {
        showCommentToast("error", "Lỗi server, vui lòng thử lại sau!");
      } else if (message.includes("403")) {
        showCommentToast("error", "Bạn không có quyền gửi đánh giá!");
      } else if (message.includes("timeout")) {
        showCommentToast("error", "Yêu cầu bị timeout, vui lòng thử lại với file nhỏ hơn!");
      } else {
        showCommentToast("error", message);
      }
    } finally {
      setSubmittingComment(false);
    }
  }, [product?._id, newComment, rating, userId, userLoading, images, videos, showCommentToast, router]);

  const editComment = useCallback(async (commentId: string) => {
    if (!product?._id || !newComment.trim() || newComment.length < MIN_COMMENT_LENGTH) {
      showCommentToast("error", "Vui lòng nhập đánh giá (ít nhất 3 ký tự)!");
      return;
    }
    if (rating === 0) {
      showCommentToast("error", "Vui lòng chọn số sao (ít nhất 1 sao)!");
      return;
    }
    if (userLoading) {
      showCommentToast("error", "Đang tải thông tin người dùng, vui lòng đợi!");
      return;
    }
    if (!userId) {
      showCommentToast("error", "Vui lòng đăng nhập để chỉnh sửa bình luận!");
      setTimeout(() => router.push("/user/login"), TOAST_DURATION);
      return;
    }
    if (images.length + videos.length > 5) {
      showCommentToast("error", "Tối đa 5 tệp (hình ảnh hoặc video)!");
      return;
    }

    setSubmittingComment(true);
    try {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("content", newComment.trim());
      formData.append("rating", rating.toString());
      images.forEach((image) => formData.append("images", image));
      videos.forEach((video) => formData.append("commentVideo", video));

      const response = await apiRequest(`/api/comments/${commentId}`, {
        method: "PUT",
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const updatedComments = await apiRequest(`/api/comments/product/${product._id}`);
      setComments(Array.isArray(updatedComments) ? updatedComments : []);

      setNewComment("");
      setRating(0);
      setImages([]);
      setVideos([]);
      setMediaPreviews([]);
      setEditingCommentId(null);
      showCommentToast("success", "Bình luận đã được cập nhật!");
    } catch (error) {
      console.error("Lỗi khi chỉnh sửa bình luận:", error);
      const message = error instanceof Error ? error.message : "Lỗi khi chỉnh sửa bình luận!";
      if (message.includes("timeout")) {
        showCommentToast("error", "Yêu cầu bị timeout, vui lòng thử lại với file nhỏ hơn!");
      } else {
        showCommentToast("error", message);
      }
    } finally {
      setSubmittingComment(false);
    }
  }, [product?._id, newComment, rating, userId, userLoading, images, videos, showCommentToast, router]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!confirm("Bạn có chắc muốn xóa bình luận này?")) return;

    setSubmittingComment(true);
    try {
      await apiRequest(`/api/comments/${commentId}?userId=${userId}`, {
        method: "DELETE",
      });

      const updatedComments = await apiRequest(`/api/comments/product/${product?._id}`);
      setComments(Array.isArray(updatedComments) ? updatedComments : []);

      setCanReview(true);
      showCommentToast("success", "Xóa bình luận thành công!");
    } catch (error) {
      console.error("Lỗi khi xóa bình luận:", error);
      showCommentToast("error", error instanceof Error ? error.message : "Lỗi khi xóa bình luận!");
    } finally {
      setSubmittingComment(false);
    }
  }, [userId, product?._id, showCommentToast]);

  const submitAdminReply = useCallback(async (commentId: string) => {
    if (!adminReplyContent.trim()) {
      showCommentToast("error", "Vui lòng nhập nội dung phản hồi!");
      return;
    }
    if (!userId || role !== "admin") {
      showCommentToast("error", "Bạn không có quyền gửi phản hồi admin!");
      return;
    }

    setSubmittingAdminReply(true);
    try {
      await apiRequest(`/api/comments/${commentId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: adminReplyContent.trim() }),
      });

      const updatedComments = await apiRequest(`/api/comments/product/${product?._id}`);
      setComments(Array.isArray(updatedComments) ? updatedComments : []);
      setAdminReplyContent("");
      setShowReplyForm(null);
      showCommentToast("success", "Phản hồi đã được gửi!");
    } catch (error) {
      console.error("Lỗi khi gửi phản hồi admin:", error);
      showCommentToast("error", error instanceof Error ? error.message : "Lỗi khi gửi phản hồi admin!");
    } finally {
      setSubmittingAdminReply(false);
    }
  }, [adminReplyContent, product?._id, userId, role, showCommentToast]);

  const toggleReplyForm = useCallback((commentId: string) => {
    setShowReplyForm((prev) => (prev === commentId ? null : commentId));
    setAdminReplyContent("");
  }, []);

  const toggleAdminReply = useCallback((commentId: string) => {
    setShowAdminReply((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  }, []);

  const averageRating = useMemo(() => {
    if (comments.length === 0) return 0;
    const total = comments.reduce((sum, comment) => sum + (comment.rating || 0), 0);
    return Number((total / comments.length).toFixed(1));
  }, [comments]);

  const ratingCounts = useMemo(() => {
    return [5, 4, 3, 2, 1].reduce((acc, star) => {
      acc[star] = comments.filter((c) => c.rating === star).length;
      return acc;
    }, {} as Record<number, number>);
  }, [comments]);

  const filteredComments = useMemo(() => {
    return comments
      .filter((comment) => comment.status === "show")
      .filter((comment) => filterRating === "all" || comment.rating === filterRating);
  }, [comments, filterRating]);

  const startEditingComment = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setNewComment(comment.content);
    setRating(comment.rating || 0);
    setImages([]);
    setVideos([]);
    // Tạo mediaPreviews từ images và videos (lấy url từ đối tượng)
    const imagePreviews = (comment.images || []).map((img: { url: string }) => getImageUrl(img.url));
    const videoPreviews: string[] = [];
    
    (comment.videos || []).forEach((vid: { url: string }, index: string | number) => {
      const videoUrl = getImageUrl(vid.url);
      const video = document.createElement("video");
      video.src = videoUrl;
      video.crossOrigin = "anonymous"; // Nếu cần xử lý CORS
      video.onloadedmetadata = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 100; // Độ rộng thumbnail
        canvas.height = 100; // Độ cao thumbnail
        const context = canvas.getContext("2d");
        video.currentTime = 0.1; // Lấy frame đầu tiên
        video.onseeked = () => {
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL("image/jpeg");
            videoPreviews[Number(index)] = thumbnailUrl;
            setMediaPreviews([...imagePreviews, ...videoPreviews]); // Cập nhật state
          }
          URL.revokeObjectURL(videoUrl); // Giải phóng bộ nhớ
        };
      };
    });

    // Nếu không có video hoặc video chưa tải xong, chỉ dùng imagePreviews tạm thời
    if (comment.videos?.length === 0) {
      setMediaPreviews(imagePreviews);
    } else {
      setMediaPreviews([...imagePreviews, ...videoPreviews]); // Cập nhật ban đầu
    }

    const form = document.getElementById("writeReviewForm");
    if (form) {
      form.classList.add(styles.active);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const openReviewForm = useCallback(() => {
    setEditingCommentId(null);
    setNewComment("");
    setRating(0);
    setImages([]);
    setVideos([]);
    setMediaPreviews([]);
    const form = document.getElementById("writeReviewForm");
    if (form) {
      form.classList.add(styles.active);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  if (loading) return <p className="text-center py-10">Đang tải chi tiết sản phẩm...</p>;
  if (!product) return <p className="text-center py-10">Không tìm thấy sản phẩm.</p>;

  const selectedOption = product.option[selectedOptionIndex] || product.option[0];
  const isOutOfStock = !selectedOption?.stock || selectedOption.stock < quantity;

  return (
    <>
      <div className={styles.container}>
        <section className={styles['product-section']}>
          <div className={styles['product-thumbnails']}>
            {product.images?.map((image, index) => (
              <div
                key={`thumbnail-${index}`}
                className={`${styles.thumbnail} ${index === currentImageIndex ? styles.active : ""}`}
                onClick={() => setCurrentImageIndex(index)}
              >
                <Image
                  src={`${getImageUrl(image)}?${cacheBuster}`}
                  alt={`${product.name} thumbnail ${index + 1}`}
                  width={100}
                  height={100}
                  quality={100}
                  className={styles.thumbnailImg}
                  onError={(e) => {
                    console.log(`Thumbnail ${index + 1} for ${product.name} load failed, switched to 404 fallback`);
                    (e.target as HTMLImageElement).src = ERROR_IMAGE_URL;
                  }}
                />
              </div>
            ))}
          </div>

          <div className={styles['product-image-container']}>
            <div className={styles['product-main-image']}>
              <Image
                src={
                  product.images?.[currentImageIndex]
                    ? `${getImageUrl(product.images[currentImageIndex])}?${cacheBuster}`
                    : ERROR_IMAGE_URL
                }
                alt={product.name}
                width={480}
                height={530}
                quality={100}
                className={styles['mainImg']}
                onError={(e) => {
                  console.log(`Main image for ${product.name} load failed, switched to 404 fallback`);
                  (e.target as HTMLImageElement).src = ERROR_IMAGE_URL;
                }}
              />
            </div>
            <div className={styles['product-dots']}>
              {product.images?.map((_, index) => (
                <div
                  key={`dot-${index}`}
                  className={`${styles.dot} ${index === currentImageIndex ? styles.active : ""}`}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </div>
          </div>
          <div className={styles['product-thumbnails-mobile']}>
            {product.images?.map((image, index) => (
              <div
                key={`thumbnail-${index}`}
                className={`${styles.thumbnail} ${index === currentImageIndex ? styles.active : ""}`}
                onClick={() => setCurrentImageIndex(index)}
              >
                <Image
                  src={`${getImageUrl(image)}?${cacheBuster}`}
                  alt={`${product.name} thumbnail ${index + 1}`}
                  width={100}
                  height={100}
                  quality={100}
                  className={styles.thumbnailImg}
                  onError={(e) => {
                    console.log(`Thumbnail ${index + 1} for ${product.name} load failed, switched to 404 fallback`);
                    (e.target as HTMLImageElement).src = ERROR_IMAGE_URL;
                  }}
                />
              </div>
            ))}
          </div>

          <div className={styles['product-info']}>
            <h1 className={styles['product-title']}>{product.name}</h1>

         {selectedOption && (
        <p className={styles['product-price']}>
          {(selectedOption.discount_price ?? 0) > 0 && (selectedOption.discount_price ?? 0) < (selectedOption.price ?? 0) && (
            <>
              <span className={styles['discount-price']}>
                {formatPrice(selectedOption.discount_price)}
              </span>
              <span className={styles['original-price']}>
                {formatPrice(selectedOption.price)}
              </span>
              <span className={styles['discount-percent']}>
                {`-${Math.round((((selectedOption.price ?? 0) - (selectedOption.discount_price ?? 0)) / (selectedOption.price ?? 1)) * 100)}%`}
              </span>
            </>
          )}
          {((selectedOption.discount_price ?? 0) === 0 || !selectedOption.discount_price) && (
            <>
              {formatPrice(selectedOption.price)}
            </>
          )}
        </p>
      )}

            {product.option.length > 0 && (
              <div style={{ margin: "16px 0" }}>
                <span style={{ fontWeight: 500 }}>Lựa chọn dung tích:</span>
                <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
                  {product.option.map((opt, idx) => (
                    <button
                      key={opt._id}
                      type="button"
                      className={idx === selectedOptionIndex ? styles['option-button-selected'] : styles['option-button']}
                      onClick={() => setSelectedOptionIndex(idx)}
                      disabled={!opt.stock}
                    >
                      {opt.value} {opt.stock <= 0 && "(Hết hàng)"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p
              className={styles['product-description']}
              dangerouslySetInnerHTML={{ __html: product.short_description }}
            />

            <div className={styles['quantity-controls']}>
              <div className={styles['quantity-wrapper']}>
                <button
                  className={`${styles['quantity-btn']} ${styles.decrease}`}
                  onClick={decreaseQty}
                  aria-label="Giảm số lượng"
                >
                  −
                </button>
                <input
                  type="number"
                  className={styles['quantity-input']}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  aria-label="Số lượng sản phẩm"
                />
                <button
                  className={`${styles['quantity-btn']} ${styles.increase}`}
                  onClick={increaseQty}
                  aria-label="Tăng số lượng"
                >
                  +
                </button>
              </div>
              <button
                className={styles['add-to-cart']}
                onClick={addToCart}
                disabled={addingToCart || isOutOfStock}
                aria-label="Thêm sản phẩm vào giỏ hàng"
              >
                {addingToCart
                  ? "Đang thêm..."
                  : isOutOfStock
                  ? "Hết hàng"
                  : "Thêm vào giỏ hàng"}
              </button>
            </div>

            <div style={{ marginTop: "10px" }}>
              <button
                className={styles['wishlist-button']}
                onClick={addToWishlist}
                disabled={addingToCart}
                aria-label={isFavorite ? "Đã nằm trong danh sách yêu thích" : "Thêm vào danh sách yêu thích của bạn"}
              >
                <i
                  className={`fas fa-heart ${isFavorite ? styles.favorited : styles.notFavorited}`}
                  style={{ color: isFavorite ? "#ff0000" : "#000000" }}
                ></i>
                <span style={{ marginLeft: "8px" }}>
                  {isFavorite ? "Đã nằm trong danh sách yêu thích" : "Thêm vào danh sách yêu thích của bạn"}
                </span>
              </button>
            </div>
          </div>
        </section>

        <div className={styles['product-info']}>
          <h2 className={styles['product-info-title']}>Thông tin sản phẩm:</h2>
          <div dangerouslySetInnerHTML={{ __html: product.description || '' }} />
        </div>
      </div>

      <div id="reviewForm" className={styles['cr']}>
        <div className={styles['customer-review']}>
          <h1 className={styles['review-main-title']}>ĐÁNH GIÁ TỪ KHÁCH HÀNG ĐÃ MUA</h1>

          <div className={styles['rating-overview']}>
            <div className={styles['rating-summary']}>
              <div className={styles['average-rating']}>{averageRating}</div>
              <div className={styles['stars-display']}>
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <span
                      key={i}
                      className={`${styles['star-display']} ${i < Math.floor(averageRating) ? styles['star-filled'] : i < averageRating ? styles['star-half'] : styles['star-empty']}`}
                    >
                      ★
                    </span>
                  ))}
              </div>
              <div className={styles['rating-text']}>Theo {filteredComments.length} đánh giá</div>
            </div>

            <div className={styles['rating-breakdown']}>
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className={styles['rating-row']}>
                  <div className={styles['star-count']}>
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <span key={i} className={styles['star-icon']}>{i < star ? '★' : '☆'}</span>
                      ))}
                  </div>
                  <div className={styles['rating-bar-container']}>
                    <div
                      className={styles['rating-bar']}
                      style={{ width: `${(ratingCounts[star] / comments.length) * 100 || 0}%` }}
                    ></div>
                  </div>
                  <div className={styles['rating-count']}>{`(${ratingCounts[star]})`}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles['filter-section']}>
            <span className={styles['filter-label']}>Lọc đánh giá:</span>
            {(['all', 5, 4, 3, 2, 1] as const).map((rating) => (
              <button
                key={rating}
                className={`${styles['filter-button']} ${
                  filterRating === rating ? styles.active : ''
                }`}
                onClick={() => setFilterRating(rating)}
              >
                {rating === 'all' ? 'Tất cả' : `${rating} ★`}
              </button>
            ))}
          </div>

          <div className={styles['write-review-container']}>
            {canReview && (
              <button
                className={styles['write-review']}
                onClick={openReviewForm}
              >
                <span>✏️</span>
                VIẾT ĐÁNH GIÁ
              </button>
            )}
            {!canReview && (
              <p className={styles['review-eligibility-note']}>
                {userId
                  ? 'Bạn đã đánh giá sản phẩm này hoặc chưa mua và nhận hàng thành công.'
                  : 'Vui lòng đăng nhập và mua hàng để đánh giá.'}
              </p>
            )}
          </div>

          <div className={styles['write-review-section']} id="writeReviewForm">
            <h2 className={styles['review-form-title']}>
              {editingCommentId ? 'Chỉnh sửa đánh giá' : 'Viết đánh giá của bạn'}
            </h2>
            <div className={styles['star-rating']}>
              {Array(5)
                .fill(0)
                .map((_, index) => {
                  const starValue = index + 1;
                  return (
                    <span
                      key={starValue}
                      className={`${styles.star} ${starValue <= rating ? styles['star-filled'] : ''}`}
                      style={{ color: starValue <= rating ? '#ffa500' : '#ccc', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setRating(starValue)}
                    >
                      ★
                    </span>
                  );
                })}
            </div>
            <textarea
              className={styles['comment-input']}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Nhập đánh giá của bạn..."
              rows={4}
              maxLength={500}
              disabled={submittingComment}
            />
            <div className={styles['media-upload']}>
              <label htmlFor="media-upload" className={styles['media-upload-label']}>
                Tải lên hình ảnh hoặc video (tối đa 5):
              </label>
              <input
                id="media-upload"
                type="file"
                accept="image/jpeg,image/png,video/mp4,video/mpeg,video/quicktime,video/webm"
                multiple
                onChange={handleMediaChange}
                disabled={submittingComment}
                className={styles['media-upload-input']}
              />
              {mediaPreviews.length > 0 && (
                <div className={styles['media-preview-container']}>
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className={styles['media-preview']}>
                      <div className={styles['media-preview-wrapper']}>
                        {images[index]?.type.startsWith("image/") || (!videos[index] && preview) ? (
                          <Image
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            width={100}
                            height={100}
                            className={styles['preview-img']}
                            onClick={() => {
                              const isVideo = videos[index]?.type.startsWith("video/") || (filteredComments[index]?.videos && filteredComments[index].videos[index]?.url);
                              setModalMedia({ 
                                src: isVideo ? (videos[index] ? URL.createObjectURL(videos[index]) : getImageUrl(filteredComments[index]?.videos?.[0]?.url || "")) : preview, 
                                type: isVideo ? 'video' : 'image' 
                              });
                            }}
                          />
                        ) : (
                          <video
                            src={preview} // Sử dụng thumbnail làm preview
                            width={100}
                            height={100}
                            className={styles['preview-video']}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const videoSrc = videos[index] ? URL.createObjectURL(videos[index]) : getImageUrl(filteredComments[index]?.videos?.[0]?.url || "");
                              setModalMedia({ src: videoSrc, type: 'video' });
                            }}
                          />
                        )}
                        <button
                          className={styles['remove-media-button']}
                          onClick={() => removeMedia(index)}
                          disabled={submittingComment}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {commentMessage && (
              <ToastNotification
                message={commentMessage.text}
                type={commentMessage.type}
                onClose={hideCommentToast}
              />
            )}
            <div className={styles['form-buttons']}>
              <button
                className={styles['submit-comment']}
                onClick={() => (editingCommentId ? editComment(editingCommentId) : submitComment())}
                disabled={submittingComment || !newComment.trim() || userLoading || rating === 0}
              >
                {submittingComment ? 'Đang gửi...' : editingCommentId ? 'Lưu chỉnh sửa' : 'Gửi đánh giá'}
              </button>
              <button
                className={styles['cancel-comment']}
                onClick={() => {
                  const form = document.getElementById('writeReviewForm');
                  if (form) {
                    form.classList.remove(styles.active);
                  }
                  setNewComment('');
                  setRating(0);
                  setImages([]);
                  setVideos([]);
                  setMediaPreviews([]);
                  setEditingCommentId(null);
                }}
                disabled={submittingComment}
              >
                Hủy
              </button>
            </div>
          </div>

          <div className={styles['reviews-container']}>
            {submittingComment && <p className="text-center py-4">Đang tải...</p>}
            {filteredComments.length > 0 ? (
              filteredComments.map((comment, index) => (
                <div key={comment._id || `comment-${index}`} className={styles.review}>
                  <div className={styles['review-header']}>
                    <h3 className={styles['review-title']}>
                      {comment.user?.username || 'Ẩn danh'}
                      {comment.user?._id === userId && (
                        <>
                          <button
                            className={styles['delete-button']}
                            onClick={() => deleteComment(comment._id)}
                            disabled={submittingComment || submittingAdminReply}
                          >
                            Xóa
                          </button>
                          <button
                            className={styles['edit-button']}
                            onClick={() => startEditingComment(comment)}
                            disabled={submittingComment || submittingAdminReply}
                          >
                            Chỉnh sửa
                          </button>
                        </>
                      )}
                    </h3>
                  </div>
                  <div className={styles['star-rating']}>
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <span
                          key={i}
                          className={`${styles.star} ${i < (comment.rating || 0) ? styles['star-filled'] : ''}`}
                        >
                          ★
                        </span>
                      ))}
                  </div>
                  <time className={styles['review-date']}>
                    Ngày: {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                  </time>
                  <p className={styles.comment}>{comment.content}</p>
                  {(comment.images?.length > 0 || comment.videos?.length > 0) && (
                    <div className={styles['comment-media']}>
                      {comment.images?.map((image: { url: string }, imgIndex: number) => (
                        <Image
                          key={`comment-img-${imgIndex}`}
                          src={`${getImageUrl(image.url)}?${cacheBuster}`}
                          alt={`Comment image ${imgIndex + 1}`}
                          width={100}
                          height={100}
                          className={styles['comment-img']}
                          onClick={() => setModalMedia({ src: getImageUrl(image.url), type: 'image' })}
                          onError={(e) => {
                            console.log(`Comment image ${imgIndex + 1} load failed, switched to 404 fallback`);
                            (e.target as HTMLImageElement).src = ERROR_IMAGE_URL;
                          }}
                        />
                      ))}
                      {comment.videos?.map((video: { url: string }, vidIndex: number) => (
                        <video
                          key={`comment-video-${vidIndex}`}
                          src={`${getImageUrl(video.url)}?${cacheBuster}`}
                          width={100}
                          height={100}
                          controls
                          className={styles['comment-video']}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            console.log("Clicking comment video:", getImageUrl(video.url));
                            setModalMedia({ src: getImageUrl(video.url), type: 'video' });
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {role === 'admin' && !comment.adminReply && (
                    <>
                      <button
                        className={styles['reply-button']}
                        onClick={() => toggleReplyForm(comment._id)}
                        disabled={submittingAdminReply}
                      >
                        Trả lời
                      </button>
                      {showReplyForm === comment._id && (
                        <div className={styles['admin-reply-form']}>
                          <textarea
                            value={adminReplyContent}
                            onChange={(e) => setAdminReplyContent(e.target.value)}
                            placeholder="Nhập phản hồi của bạn..."
                            rows={2}
                            maxLength={500}
                            disabled={submittingAdminReply}
                            className={styles['admin-reply-input']}
                          />
                          <div className={styles['form-buttons']}>
                            <button
                              onClick={() => submitAdminReply(comment._id)}
                              disabled={submittingAdminReply || !adminReplyContent.trim()}
                              className={styles['submit-comment']}
                            >
                              {submittingAdminReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                            </button>
                            <button
                              className={styles['cancel-comment']}
                              onClick={() => toggleReplyForm(comment._id)}
                              disabled={submittingAdminReply}
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {comment.adminReply && (
                    <>
                      <button
                        className={styles['toggle-reply-button']}
                        onClick={() => toggleAdminReply(comment._id)}
                      >
                        {showAdminReply[comment._id] ? 'Ẩn phản hồi' : 'Xem phản hồi'}
                      </button>
                      {showAdminReply[comment._id] && (
                        <div className={styles['admin-reply']}>
                          <p>
                            <strong>Admin:</strong> {comment.adminReply.content}
                          </p>
                          <time>
                            {new Date(comment.adminReply.createdAt).toLocaleDateString('vi-VN')}{' '}
                            {new Date(comment.adminReply.createdAt).toLocaleTimeString('vi-VN')}
                          </time>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className={styles['no-reviews']}>
                Chưa có đánh giá nào cho sản phẩm này.
              </div>
            )}
          </div>
        </div>
      </div>

      <section className={styles['product-contact-section']}>
        <h2 className={styles['contact-section-title']}>
          Không tìm thấy được dòng sản phẩm mà bạn cần<br />hoặc thích hợp với da của bạn?
        </h2>
        <button className={styles['contact-button']}>
          Liên hệ với chúng tôi
        </button>
      </section>

      {cartMessage && (
        <ToastNotification
          message={cartMessage.text}
          type={cartMessage.type}
          onClose={hideCartToast}
        />
      )}
      {commentMessage && (
        <ToastNotification
          message={commentMessage.text}
          type={commentMessage.type}
          onClose={hideCommentToast}
        />
      )}

      {modalMedia && (
        <MediaModal
          src={modalMedia.src}
          type={modalMedia.type}
          onClose={() => setModalMedia(null)}
        />
      )}
    </>
  );
}