import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Ensure the jsdom DOM is fully torn down between tests so that
// stale React trees from one test file cannot bleed into another.
afterEach(cleanup);

// recharts uses ResizeObserver internally; mock it for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom does not implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = function () {};
