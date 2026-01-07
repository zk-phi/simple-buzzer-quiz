import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",

  use: {
    baseURL: "http://localhost:8080",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 7"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 15"] } },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: false,
  },
});
