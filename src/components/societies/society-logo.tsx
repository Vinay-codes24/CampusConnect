"use client";

import { useEffect, useState } from "react";
import { SocietyIcon } from "@/components/societies/society-icon";

export type SocietyLogoProps = {
  /** Web-root path of the real logo (e.g. /images/societies/junoon.png). */
  src?: string | null;
  /** Icon key used when no logo exists or the image fails to load. */
  icon?: string | null;
  /** Pixel size of the logo image inside its tile. Ignored when `fill`. */
  size?: number;
  /**
   * Stretch to the parent box instead of using a fixed `size`. Used by the
   * large showcase stages, where the artwork should dominate the area rather
   * than sit in a small fixed square. The fallback icon scales with the stage
   * via CSS instead of a hard-coded pixel size.
   */
  fill?: boolean;
  className?: string;
  /** Accessible label; omit for decorative logos (the default). */
  alt?: string;
};

/**
 * Renders a society's real logo, falling back to the society's icon when there
 * is no logo or the file fails to load.
 *
 * - A failed load is remembered, so the browser never retries a broken path.
 * - The box is always the same size, so swapping to the fallback icon causes
 *   no layout shift.
 * - The image keeps its aspect ratio (`object-fit: contain`) so transparent
 *   PNGs and wide JPGs are never cropped or distorted.
 */
export function SocietyLogo({ src, icon, size = 40, fill = false, className, alt }: SocietyLogoProps) {
  const [failed, setFailed] = useState(false);
  // A new src (e.g. after a data update) deserves a fresh attempt.
  useEffect(() => setFailed(false), [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <span className={`society-logo${fill ? " society-logo--fill" : ""}${className ? ` ${className}` : ""}`}>
      {showImage ? (
        // Verified local path only (public/images/societies/…).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={alt ?? ""}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={
            fill
              ? { width: "100%", height: "100%", objectFit: "contain" }
              : { width: size, height: size, objectFit: "contain" }
          }
        />
      ) : (
        <SocietyIcon icon={icon} size={Math.round(size * 0.6)} />
      )}
    </span>
  );
}
