import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Opens every new page at the top. Also scrolls up when a dashboard tab or a
// search filter changes. Browser Back/Forward keep their own position.
export default function ScrollToTop() {
  const { pathname, search } = useLocation();
  const type = useNavigationType();

  useEffect(() => {
    if (type === "POP") return;
    // "instant" overrides the page's smooth-scroll setting so it never animates from the bottom.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search, type]);

  return null;
}
