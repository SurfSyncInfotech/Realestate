import { useState } from "react";
import { FALLBACK_IMAGE } from "../data/media.js";

// <img> that fades in once loaded and falls back to a local photo on error.
export default function SmartImage({ src, alt = "", className = "", ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <img
      {...rest}
      src={failed ? FALLBACK_IMAGE : src}
      alt={alt}
      loading={rest.loading || "lazy"}
      decoding="async"
      className={`smart-img ${loaded ? "is-loaded" : ""} ${className}`}
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (!failed) setFailed(true);
      }}
    />
  );
}
