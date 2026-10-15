import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { FlowProvider, useFlow } from "./flow-context";
import { createFlowStore, FLOW_STORAGE_KEY } from "./flow-state";

function Probe() {
  const { state, hydrated, update, reset } = useFlow();
  return (
    <div>
      <span data-testid="name">{state.firstName || "-"}</span>
      <span data-testid="hydrated">{String(hydrated)}</span>
      <button onClick={() => update({ firstName: "Anna" })}>set</button>
      <button onClick={reset}>reset</button>
    </div>
  );
}

beforeEach(() => window.sessionStorage.clear());

describe("FlowProvider / useFlow", () => {
  it("reads the persisted state and updates it", () => {
    window.sessionStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify({ version: 1, firstName: "Luca" }));
    render(
      <FlowProvider>
        <Probe />
      </FlowProvider>,
    );
    expect(screen.getByTestId("name")).toHaveTextContent("Luca");
    expect(screen.getByTestId("hydrated")).toHaveTextContent("true");

    act(() => screen.getByText("set").click());
    expect(screen.getByTestId("name")).toHaveTextContent("Anna");
    expect(JSON.parse(window.sessionStorage.getItem(FLOW_STORAGE_KEY)!).firstName).toBe("Anna");

    act(() => screen.getByText("reset").click());
    expect(screen.getByTestId("name")).toHaveTextContent("-");
    expect(window.sessionStorage.getItem(FLOW_STORAGE_KEY)).toBeNull();
  });

  it("server render uses the initial state and hydrated = false", () => {
    const store = createFlowStore(null);
    store.update({ firstName: "Zed" });
    const html = renderToString(
      <FlowProvider store={store}>
        <Probe />
      </FlowProvider>,
    );
    expect(html).toContain("false");
    expect(html).not.toContain("Zed");
  });

  it("useFlow outside the provider throws a clear error", () => {
    const original = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow(/FlowProvider/);
    console.error = original;
  });
});
