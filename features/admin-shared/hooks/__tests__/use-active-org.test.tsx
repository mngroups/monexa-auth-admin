import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActiveOrgProvider, useActiveOrgId } from "../use-active-org";

function Probe() {
  return <p>{`org:${useActiveOrgId()}`}</p>;
}

describe("ActiveOrgProvider", () => {
  it("provides the active org id", () => {
    render(
      <ActiveOrgProvider orgId="o1">
        <Probe />
      </ActiveOrgProvider>
    );
    expect(screen.getByText("org:o1")).toBeInTheDocument();
  });

  it("is null without a provider", () => {
    render(<Probe />);
    expect(screen.getByText("org:null")).toBeInTheDocument();
  });
});
