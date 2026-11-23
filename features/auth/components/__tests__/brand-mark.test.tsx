import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BrandMark } from "../brand-mark";

describe("BrandMark", () => {
  it("shows the client logo", () => {
    render(<BrandMark logoUrl="https://auth.test/branding/orgs/pt/logo" />);
    expect(screen.getByRole("img", { name: "Monexa App" })).toHaveAttribute(
      "src",
      "https://auth.test/branding/orgs/pt/logo"
    );
  });

  it("falls back to the app name when the logo can't load", () => {
    render(<BrandMark logoUrl="https://auth.test/branding/orgs/none/logo" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Monexa App")).toBeInTheDocument();
  });

  it("shows the app name without a logo", () => {
    render(<BrandMark logoUrl={null} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Monexa App")).toBeInTheDocument();
  });

  describe("a logo that already failed before hydration", () => {
    afterEach(() => vi.restoreAllMocks());

    it("falls back once mounted, even though no error event reaches React", () => {
      vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
      vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(0);
      render(<BrandMark logoUrl="https://auth.test/branding/orgs/none/logo" />);
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("Monexa App")).toBeInTheDocument();
    });

    it("keeps a logo that loaded before hydration", () => {
      vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
      vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(120);
      render(<BrandMark logoUrl="https://auth.test/branding/orgs/pt/logo" />);
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });
});
