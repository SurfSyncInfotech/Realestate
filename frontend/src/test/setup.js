import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
window.scrollTo = () => {}; // jsdom does not implement scrolling
