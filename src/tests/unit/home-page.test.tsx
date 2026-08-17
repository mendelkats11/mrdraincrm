import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Home page", () => {
  it("renders the placeholder with a link to the public quote form", () => {
    render(<Home />);
    expect(screen.getByText("Mr. Drain")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "quote form" })).toHaveAttribute("href", "/contact");
  });
});
