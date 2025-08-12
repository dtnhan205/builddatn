"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const refresh = searchParams.get("refresh");
    router.push(`/user${refresh === "true" ? "?refresh=true" : ""}`);
  }, [router, searchParams]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        fontSize: "1.5rem",
      }}
    >
      <p>Đang chuyển trang, vui lòng chờ...</p>
    </div>
  );
}

export default function RedirectPage() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <RedirectContent />
    </Suspense>
  );
}
