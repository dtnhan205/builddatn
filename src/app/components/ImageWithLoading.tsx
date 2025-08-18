"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export default function ImageWithLoading({ src, alt, width, height, className }: Props) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="relative">
      {/* Skeleton khi đang loading */}
      {loading && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg"
          style={{ width, height }}
        />
      )}

      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${loading ? "opacity-0" : "opacity-100"} transition-opacity duration-500`}
        onLoadingComplete={() => setLoading(false)}
      />
    </div>
  );
}
