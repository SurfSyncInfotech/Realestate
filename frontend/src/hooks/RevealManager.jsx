import { useEffect } from "react";

// Elements that fade/slide in as they scroll into view, on every page.
const AUTO_SELECTOR = [
  "main section:not(.hm-hero):not(.hm-search-wrap)",
  "main article",
  ".listing-card",
  ".footer-column",
  ".footer-brand",
].join(",");

// Mounted once in App. Tags content with `.reveal` and adds `.is-visible`
// the first time each element enters the viewport. Re-scans whenever
// React renders new nodes (route changes, search results) (e.g. search results).
export default function RevealManager() {
  useEffect(() => {
    const supportsObserver = "IntersectionObserver" in window;
    const observer = supportsObserver
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
        )
      : null;

    // Per-run bookkeeping (a DOM attribute would survive StrictMode's
    // mount/unmount/mount and leave nodes unobserved).
    const seen = new WeakSet();

    const scan = () => {
      document.querySelectorAll(AUTO_SELECTOR).forEach((node) => {
        node.classList.add("reveal");
      });
      document.querySelectorAll(".reveal").forEach((node) => {
        if (seen.has(node) || node.classList.contains("is-visible")) return;
        seen.add(node);
        if (observer) observer.observe(node);
        else node.classList.add("is-visible");
      });
    };

    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      mutations.disconnect();
      observer?.disconnect();
    };
  }, []);

  return null;
}
