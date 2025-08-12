"use client";

import React, { useEffect } from "react";

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  onErrorMessage?: string; // Optional message for debugging
}

export default function ImageWithFallback({ src, alt, className, onErrorMessage }: ImageWithFallbackProps) {
  useEffect(() => {
    console.log("ImageWithFallback: Received src:", src); // Debug initial src
  }, [src]);

  const handleError = () => {
    console.log("ImageWithFallback: Error loading image, switching to fallback:", { originalSrc: src, onErrorMessage });
  };

  return (
    <img
      src={src || "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg"}
      alt={alt}
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
        handleError();
      }}
      style={{ maxWidth: "100%" }} // Ensure visibility and sizing
    />
  );
}