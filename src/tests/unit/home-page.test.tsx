import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Home page", () => {
  it("renders the Phase 0 placeholder", () => {
    render(<Home />);
    expect(screen.getByText("Mr. Drain")).toBeInTheDocument();
    expect(screen.getByText("Phase 0")).toBeInTheDocument();
  });
});
