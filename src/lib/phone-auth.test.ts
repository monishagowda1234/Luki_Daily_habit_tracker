import { describe, expect, it } from "vitest";
import { fullPhone, phoneToEmail, PHONE_RE } from "./phone-auth";

describe("phone sign-in", () => {
  it("joins the country code and number into one international number", () => {
    expect(fullPhone("+91", "98765 43210")).toBe("+919876543210");
    expect(fullPhone("91", "98765-43210")).toBe("+919876543210");
  });
  it("gives the same sign-in address for the same number", () => {
    expect(phoneToEmail("+919876543210")).toBe("919876543210@phone.luki.app");
  });
  it("rejects numbers that are too short", () => {
    expect(PHONE_RE.test("+91123")).toBe(false);
    expect(PHONE_RE.test("+919876543210")).toBe(true);
  });
});
