const {
  buildAllowedOrigins,
  isAllowedOrigin,
} = require("../dist/utils/corsOrigins");

describe("buildAllowedOrigins", () => {
  test("includes local defaults plus configured frontend and extra origins", () => {
    const origins = buildAllowedOrigins(
      "https://frontend.example.com/",
      "https://preview.example.com/, https://admin.example.com",
    );

    expect(origins).toEqual(
      expect.arrayContaining([
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "https://frontend.example.com",
        "https://preview.example.com",
        "https://admin.example.com",
      ]),
    );
  });

  test("deduplicates and removes empty values", () => {
    const origins = buildAllowedOrigins(
      "https://frontend.example.com",
      "https://frontend.example.com, , https://frontend.example.com/",
    );

    expect(
      origins.filter((origin) => origin === "https://frontend.example.com"),
    ).toHaveLength(1);
  });
});

describe("isAllowedOrigin", () => {
  test("allows configured origins and supported deployment preview domains", () => {
    const origins = buildAllowedOrigins(
      "https://frontend.example.com",
      "https://admin.example.com",
    );

    expect(isAllowedOrigin("https://frontend.example.com", origins)).toBe(true);
    expect(
      isAllowedOrigin("https://eduhub-git-main-preview.vercel.app", origins),
    ).toBe(true);
    expect(
      isAllowedOrigin("https://eduhub-learning-platform.onrender.com", origins),
    ).toBe(true);
  });

  test("blocks unknown origins", () => {
    const origins = buildAllowedOrigins("https://frontend.example.com", "");

    expect(isAllowedOrigin("https://malicious.example.com", origins)).toBe(
      false,
    );
  });
});
