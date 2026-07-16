import { describe, expect, it } from "vitest";
import { createTranslator } from "./i18n.js";

describe("createTranslator", () => {
  it("uses Simplified Chinese copy and interpolates variables", () => {
    const t = createTranslator("zh");

    expect(t("wonTender", { name: "Atlas Research" })).toBe("Atlas Research 已中标");
    expect(t("minutes", { count: 12 })).toBe("12 分钟");
  });

  it("switches to English without changing protocol values", () => {
    const t = createTranslator("en");

    expect(t("logSettled", { amount: "5.80 USDC" })).toBe("5.80 USDC settled over x402");
  });

  it("falls back to the translation key for unknown copy", () => {
    expect(createTranslator("zh")("unknownKey")).toBe("unknownKey");
  });
});
