"use client";

import { useEffect, useRef, useState } from "react";

import { APP_NAME } from "@/lib/app-config";

/**
 * The client's logo (served by monexa-auth) above the auth card, or the app name when there
 * is none or it fails to load: never a broken-image icon.
 */
export function BrandMark({ logoUrl }: { logoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // /login is server-rendered: a 404 that lands before hydration fires its error event before
  // React listens, so check the image's state once mounted too.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setFailed(true);
  }, []);

  if (!logoUrl || failed) {
    return <p className="mb-8 text-2xl font-bold tracking-wide text-white">{APP_NAME}</p>;
  }
  return (
    // biome-ignore lint/performance/noImgElement: cross-origin logo from the auth portal; next/image would need a remotePatterns entry per deployment for a tiny cached file.
    <img
      ref={img}
      src={logoUrl}
      alt={APP_NAME}
      onError={() => setFailed(true)}
      className="mb-8 max-h-14 max-w-[200px] object-contain"
    />
  );
}
