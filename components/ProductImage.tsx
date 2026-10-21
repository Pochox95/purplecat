"use client";
import { useEffect, useState } from "react";
/** Keep the real gallery as a fallback when a product's primary image is unavailable. */
export default function ProductImage({
  sources,
  alt,
  className,
  loading,
}: {
  sources: (string | null | undefined)[];
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const candidates = Array.from(
    new Set([
      ...sources
        .map((src) => src?.trim())
        .filter((src): src is string => Boolean(src)),
      "/logo-purple-cat.png",
    ]),
  );
  const fingerprint = candidates.join("\n");
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [fingerprint]);
  return (
    <img
      src={candidates[index] || "/logo-purple-cat.png"}
      alt={alt}
      className={className}
      loading={loading}
      onError={() =>
        setIndex((current) => Math.min(current + 1, candidates.length - 1))
      }
    />
  );
}
