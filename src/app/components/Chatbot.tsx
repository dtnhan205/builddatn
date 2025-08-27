"use client";

import React, { useState, useEffect, useRef } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

const convertToSlug = (text: string): string => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
};

interface Product {
  _id?: string;
  name: string;
  price: number | null;
  images: string[];
  slug?: string;
}

interface Coupon {
  code: string;
  discountValue: number;
  discountType: string;
  minOrderValue: number;
  expiryDate?: string;
}

interface News {
  title: string;
  slug: string;
  thumbnailUrl: string;
  publishedAt: string;
}

interface Brand {
  name: string;
  logoImg: string;
}

interface Category {
  name: string;
}

interface Message {
  _id?: string;
  sessionId: string;
  role: "user" | "model";
  content: string;
  file?: { data: string; mime_type: string } | null;
  timestamp: string;
  products?: Product[];
  coupons?: Coupon[];
  news?: News[];
  brands?: Brand[];
  categories?: Category[];
}

const API_BASE_URL = "https://api-zeal.onrender.com/api/chatbot";

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<{ data: string; mime_type: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const createOrGetSession = async () => {
      try {
        let storedSessionId = localStorage.getItem("chatbotSessionId");

        const response = await fetch(`${API_BASE_URL}/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: storedSessionId || "" }),
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();

        setSessionId(data.sessionId);
        localStorage.setItem("chatbotSessionId", data.sessionId);
        await fetchChatHistory(data.sessionId);
      } catch (error) {
        const errorMsg = (error as Error).message;
        console.error("Lỗi tạo session:", error);
        setError(`Không thể khởi tạo Chatbot: ${errorMsg}`);
        MySwal.fire({
          icon: "error",
          title: "Lỗi",
          text: `Không thể khởi tạo Chatbot: ${errorMsg}`,
        });
      }
    };

    createOrGetSession();
  }, []);

  const fetchChatHistory = async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/${sessionId}`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        if (response.status === 404) {
          localStorage.removeItem("chatbotSessionId");
          setSessionId(null);
          const newSessionResponse = await fetch(`${API_BASE_URL}/session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: "" }),
          });
          if (!newSessionResponse.ok) throw new Error(`HTTP error! Status: ${newSessionResponse.status}`);
          const newSessionData = await newSessionResponse.json();
          setSessionId(newSessionData.sessionId);
          localStorage.setItem("chatbotSessionId", newSessionData.sessionId);
          setMessages([]); // Bắt đầu mới nếu không có lịch sử
          return;
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setMessages(data.messages || []); // Đảm bảo mảng messages chứa products
    } catch (error) {
      console.error("Lỗi lấy lịch sử chat:", error);
      setError(`Không thể lấy lịch sử chat: ${(error as Error).message}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || error) return;

    const newMessage: Message = {
      sessionId: sessionId,
      role: "user",
      content: input,
      file: file ? file : null,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, newMessage]);
    setInput("");
    setFile(null);
    setIsLoading(true);

    try {
      const sendData = {
        sessionId,
        message: newMessage.content,
        ...(file && { file: file }),
      };
      const response = await fetch(`${API_BASE_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendData),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          sessionId,
          role: "model",
          content: data.message,
          timestamp: new Date().toISOString(),
          products: data.products || [],
          coupons: data.coupons || [],
          news: data.news || [],
          brands: data.brands || [],
          categories: data.categories || [],
        },
      ]);
    } catch (error) {
      console.error("Send message error:", error);
      setMessages((prev) => [
        ...prev,
        {
          sessionId,
          role: "model",
          content: `Lỗi: ${(error as Error).message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileInput = e.target.files?.[0];
    if (!fileInput) return;

    const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validImageTypes.includes(fileInput.type)) {
      MySwal.fire({
        icon: "error",
        title: "Lỗi",
        text: "Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WEBP)",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(",")[1];
      setFile({ data: base64String, mime_type: fileInput.type });
    };
    reader.readAsDataURL(fileInput);
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    setInput((prev) => prev + emoji.native);
    inputRef.current?.focus();
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && input.trim() && window.innerWidth > 768) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
    // Cuộn xuống khi messages thay đổi
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({ behavior: "smooth", top: chatBodyRef.current.scrollHeight });
    }
  }, [input]); // Chỉ phụ thuộc vào input thay vì messages

  // Thêm useEffect riêng để xử lý cuộn khi messages thay đổi
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({ behavior: "smooth", top: chatBodyRef.current.scrollHeight });
    }
  }, [messages.length]); // Chỉ phụ thuộc vào độ dài của messages

  if (error) {
    return (
      <div style={{ color: "red", textAlign: "center", padding: "20px" }}>
        Chatbot không khả dụng: {error}
      </div>
    );
  }

  return (
    <div className="chatbot-container">
      <button className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}>
        <img
          src="https://app.preny.ai/gif/preny_2.gif"
          alt="Chatbot Toggle"
          className="chatbot-toggle-img"
        />
      </button>
      <div className={`chatbot-popup ${isOpen ? "scale-100" : "scale-20"}`}>
        <div className="chat-header">
          <div className="header-info">
            <img
              src="https://res.cloudinary.com/dgud3sqyn/image/upload/v1756088068/uploads/1756088067315-e2a6w0.png"
              alt="Bot Avatar"
              className="chatbot-logo"
            />
            <h2 className="logo-text">PURE BOTANICA</h2>
          </div>
          <button id="close-chatbot" onClick={() => setIsOpen(false)}>
            ↓
          </button>
        </div>
        <div ref={chatBodyRef} className="chat-body">
          {isLoading && <div className="loading">Đang xử lý...</div>}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.role === "user" ? "user-message" : "bot-message"}`}
            >
              {msg.role === "model" && (
                <img
                  src="https://res.cloudinary.com/dgud3sqyn/image/upload/v1756088068/uploads/1756088067315-e2a6w0.png"
                  alt="Bot Avatar"
                  className="bot-avatar"
                />
              )}
              <div className="message-content">
                <div className="message-text">
                  {msg.content.split(" ").map((part, index) => {
                    const urlRegex = /^(https?:\/\/[^\s]+)$/;
                    if (urlRegex.test(part)) {
                      return (
                        <a
                          key={index}
                          href={part}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="message-link"
                          style={{ color: "#1e90ff", textDecoration: "underline" }}
                        >
                          {part}
                        </a>
                      );
                    }
                    return <span key={index}>{part} </span>;
                  })}
                </div>
                {msg.file?.data && (
                  <img
                    src={`data:${msg.file.mime_type};base64,${msg.file.data}`}
                    alt="Attachment"
                    className="attachment"
                  />
                )}
                {msg.products && msg.products.length > 0 && (
                  <div className="products-list">
                    <div className="products-grid">
                      {msg.products.slice(0, 2).map((product, idx) => (
                        <div key={idx} className="product-card">
                          {product.images && product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="product-image"
                            />
                          ) : (
                            <div className="no-image">No image</div>
                          )}
                          <div className="product-info">
                            <h5 className="product-name">{product.name}</h5>
                            <a
                              href={`http://localhost:3000/user/detail/${product.slug || convertToSlug(product.name)}`}
                              className="product-link"
                            >
                              Xem
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {msg.coupons && msg.coupons.length > 0 && (
                  <div className="coupons-list">
                    <div className="coupons-grid">
                      {msg.coupons.slice(0, 2).map((coupon, idx) => (
                        <div key={idx} className="coupon-card">
                          <div className="coupon-code">{coupon.code}</div>
                          <p>
                            {coupon.discountType === "percentage"
                              ? `${coupon.discountValue}%`
                              : `${coupon.discountValue.toLocaleString("vi-VN")} VNĐ`}
                          </p>
                          <button
                            className="copy-coupon-btn"
                            onClick={() => navigator.clipboard.writeText(coupon.code)}
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {msg.news && msg.news.length > 0 && (
                  <div className="news-list">
                    <div className="news-grid">
                      {msg.news.slice(0, 2).map((news, idx) => (
                        <div key={idx} className="news-card">
                          <h5 className="news-title">{news.title}</h5>
                          <a
                            href={`https://purebotanice.com/news/${news.slug}`}
                            className="news-link"
                          >
                            Đọc
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {msg.brands && msg.brands.length > 0 && (
                  <div className="brands-list">
                    <p>{msg.brands.slice(0, 2).map((brand) => brand.name).join(", ")}</p>
                  </div>
                )}
                {msg.categories && msg.categories.length > 0 && (
                  <div className="categories-list">
                    <p>{msg.categories.slice(0, 2).map((category) => category.name).join(", ")}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="chat-footer">
          <form onSubmit={handleSendMessage} className="chat-form">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhắn..."
              className="message-input"
              required
            />
            <div className="chat-controls">
              <button type="submit" id="send-message" disabled={isLoading}>
                ↑
              </button>
            </div>
          </form>
          {showEmojiPicker && (
            <div className="emoji-picker">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                onClickOutside={() => setShowEmojiPicker(false)}
                theme="light"
                previewPosition="none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chatbot;