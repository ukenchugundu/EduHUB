const { buildAllowedOrigins } = require("../dist/utils/corsOrigins");

describe("buildAllowedOrigins", () => {
  test("includes local defaults plus configured frontend and extra origins", () => {
    const origins = buildAllowedOrigins(
      "https://frontend.example.com/",
      "https://preview.example.com/, https://admin.example.com",
    );

    expect(origins).toEqual(
      expect.arrayContaining([
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "https://eduhub-frontend.vercel.app",
        "https://ukenchugundu-project-svce.vercel.app",
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