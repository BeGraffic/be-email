import { describe, it, expect } from "vitest";
import { sanitizeRichHtml } from "./sanitizeHtml";

describe("sanitizeRichHtml", () => {
  it("keeps ordinary inline formatting untouched", () => {
    const html = '<strong>Hola</strong> <a href="https://x.test">link</a><br><span style="color:#111">x</span>';
    expect(sanitizeRichHtml(html)).toBe(html);
  });

  it("drops active-content elements with their contents", () => {
    expect(sanitizeRichHtml('<p>a</p><script>alert(1)</script>')).toBe("<p>a</p>");
    expect(sanitizeRichHtml('<iframe src="https://evil.test"></iframe>b')).toBe("b");
  });

  it("strips event handlers whatever separator precedes them", () => {
    // The HTML tokenizer returns to before-attribute-name after "/" and after the
    // closing quote of a value, so those are real handlers too.
    for (const html of [
      '<img src="x" onerror="alert(1)">',
      '<img src="x"onerror="alert(1)">',
      '<img src=x/onerror=alert(1)>',
      "<img src='x'onerror='alert(1)'>",
    ]) {
      expect(sanitizeRichHtml(html).toLowerCase()).not.toContain("onerror");
    }
  });

  it("removes back-to-back handlers and preserves quoting", () => {
    const out = sanitizeRichHtml('<img src="x"onerror="a()"onload="b()">');
    expect(out.toLowerCase()).not.toContain("onerror");
    expect(out.toLowerCase()).not.toContain("onload");
    expect(out).toContain('src="x"');
  });

  it("neutralizes javascript: urls", () => {
    expect(sanitizeRichHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a href="#">x</a>');
  });
});
