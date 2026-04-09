import "@testing-library/jest-dom";

// recharts uses ResizeObserver internally; mock it for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
