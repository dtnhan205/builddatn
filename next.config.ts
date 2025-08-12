
const nextConfig = {
  images: {
    domains: ["via.placeholder.com", "api-zeal.onrender.com", "res.cloudinary.com", "png.pngtree.com"], // Thêm các hostname cần thiết
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api-zeal.onrender.com",
        pathname: "/images/**", // Tùy chọn: Chỉ cho phép đường dẫn /images/
      },
    ],
  },
};

module.exports = nextConfig;