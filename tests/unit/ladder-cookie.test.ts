import { describe, expect, it } from "vitest";
import { ladderCookie } from "@/lib/ladder";

describe("ladderCookie", () => {
  it("laat een volledige cookie staan", () => {
    expect(ladderCookie("connect.sid=s%3Aabc.def")).toBe("connect.sid=s%3Aabc.def");
  });

  it("zet connect.sid= voor alleen de waarde", () => {
    expect(ladderCookie("s%3Aabc.def")).toBe("connect.sid=s%3Aabc.def");
    expect(ladderCookie("s:abc.def")).toBe("connect.sid=s:abc.def");
  });

  it("haalt aanhalingstekens, spaties en Cookie: weg", () => {
    expect(ladderCookie(' "s%3Aabc.def" ')).toBe("connect.sid=s%3Aabc.def");
    expect(ladderCookie("Cookie: connect.sid=s%3Aabc.def")).toBe("connect.sid=s%3Aabc.def");
  });

  it("geeft null zonder waarde", () => {
    expect(ladderCookie("")).toBeNull();
    expect(ladderCookie(null)).toBeNull();
  });
});
