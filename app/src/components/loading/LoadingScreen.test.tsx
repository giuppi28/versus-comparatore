import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import {
  LoadingScreen,
  MAX_ORBIT_SUPPLIERS,
  MAX_VISIBLE_LOGOS,
  getHighlightIndex,
  getLoadingMessage,
} from "./LoadingScreen";

const SUPPLIERS = [
  { id: "a", name: "Alfa Energia" },
  { id: "b", name: "Beta Luce", logoUrl: "/logos/beta.svg" },
  { id: "c", name: "Gamma Gas" },
  { id: "d", name: "Delta Power" },
];

function mockReducedMotion(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const message = () => screen.getByTestId("loading-message").textContent;
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("LoadingScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReducedMotion(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    // @ts-expect-error cleanup of the test mock
    delete window.matchMedia;
  });

  it("shows the messages in order, ending with the final one", () => {
    render(<LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={() => {}} />);
    expect(screen.getByTestId("loading-screen")).toBeInTheDocument();
    expect(message()).toBe("Analizziamo i tuoi consumi…");
    advance(300);
    expect(message()).toBe("Confrontiamo le offerte di 4 fornitori…");
    advance(300);
    expect(message()).toBe("Calcoliamo la tua spesa mensile…");
    advance(400);
    expect(message()).toBe("Ecco le migliori offerte per te!");
  });

  it("counts only displayed suppliers, excluding the current one", () => {
    render(
      <LoadingScreen
        suppliers={SUPPLIERS}
        excludeSupplierIds={["a"]}
        durationMs={1000}
        onComplete={() => {}}
      />,
    );
    advance(300);
    expect(message()).toBe("Confrontiamo le offerte di 3 fornitori…");
    const ids = screen.getAllByTestId("loading-supplier").map((el) => el.dataset.supplierId);
    expect(ids).toEqual(["b", "c", "d"]);
    expect(screen.queryByText("Alfa Energia")).not.toBeInTheDocument();
  });

  it("dedupes suppliers, caps the count and shows at most 6 small logos", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ id: `s${i}`, name: `Fornitore ${i}` }));
    render(<LoadingScreen suppliers={[...many, many[0]]} durationMs={1000} onComplete={() => {}} />);
    expect(screen.getAllByTestId("loading-supplier")).toHaveLength(MAX_VISIBLE_LOGOS);
    advance(300);
    expect(message()).toBe(`Confrontiamo le offerte di ${MAX_ORBIT_SUPPLIERS} fornitori…`);
  });

  it("never renders the excluded supplier even when it is the only one", () => {
    render(
      <LoadingScreen suppliers={[SUPPLIERS[0]]} excludeSupplierIds={["a"]} durationMs={1000} onComplete={() => {}} />,
    );
    expect(screen.queryAllByTestId("loading-supplier")).toHaveLength(0);
    advance(300);
    expect(message()).toBe("Confrontiamo le offerte disponibili…");
  });

  it("renders a text fallback, or a greyscale image when logoUrl is given", () => {
    render(<LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={() => {}} />);
    expect(screen.getByText("Alfa Energia")).toBeInTheDocument();
    const img = screen.getByAltText("Beta Luce");
    expect(img).toHaveAttribute("src", "/logos/beta.svg");
    expect(img.className).toContain("grayscale");
    expect(screen.queryByText("Beta Luce")).not.toBeInTheDocument();
  });

  it("highlights the suppliers one at a time during the compare phase", () => {
    render(<LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={() => {}} />);
    const active = () =>
      screen
        .getAllByTestId("loading-supplier")
        .filter((el) => el.dataset.active === "true")
        .map((el) => el.dataset.supplierId);
    expect(active()).toEqual([]);
    advance(250);
    expect(active()).toEqual(["a"]);
    advance(250);
    expect(active()).toHaveLength(1);
    advance(600);
    expect(active()).toEqual([]);
  });

  it("calls onStart once and onComplete once after the duration", () => {
    const onStart = vi.fn();
    const onComplete = vi.fn();
    const { rerender } = render(
      <LoadingScreen suppliers={SUPPLIERS} durationMs={2000} onStart={onStart} onComplete={onComplete} />,
    );
    expect(onStart).toHaveBeenCalledTimes(1);
    advance(1900);
    expect(onComplete).not.toHaveBeenCalled();
    // Parent re-render with new callbacks must not restart the timer or re-fire onStart.
    const onComplete2 = vi.fn();
    rerender(
      <LoadingScreen suppliers={SUPPLIERS} durationMs={2000} onStart={vi.fn()} onComplete={onComplete2} />,
    );
    advance(200);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onComplete2).toHaveBeenCalledTimes(1);
    advance(5000);
    expect(onComplete2).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("uses the 4 second default duration", () => {
    const onComplete = vi.fn();
    render(<LoadingScreen suppliers={SUPPLIERS} onComplete={onComplete} />);
    advance(3900);
    expect(onComplete).not.toHaveBeenCalled();
    advance(200);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("exposes progress through an accessible progressbar and a polite status region", () => {
    render(<LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={() => {}} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    advance(500);
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    advance(500);
    expect(bar).toHaveAttribute("aria-valuenow", "100");
  });

  it("still progresses and completes with prefers-reduced-motion, without animations", () => {
    mockReducedMotion(true);
    const onComplete = vi.fn();
    render(<LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={onComplete} />);
    const screenEl = screen.getByTestId("loading-screen");
    expect(screenEl).toHaveAttribute("data-reduced-motion", "true");
    expect(screenEl.querySelector('[data-animate="true"]')).toBeNull();
    // All logos are visible (static layout).
    expect(screen.getAllByTestId("loading-supplier")).toHaveLength(4);
    expect(screen.getByTestId("loading-progress")).toBeInTheDocument();
    advance(600);
    expect(message()).toBe("Calcoliamo la tua spesa mensile…");
    advance(400);
    expect(message()).toBe("Ecco le migliori offerte per te!");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("animates when motion is allowed", () => {
    render(<LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={() => {}} />);
    expect(screen.getByTestId("loading-screen")).toHaveAttribute("data-reduced-motion", "false");
    expect(screen.getByTestId("loading-screen").querySelector('[data-animate="true"]')).not.toBeNull();
  });

  it("completes immediately for a zero duration and handles no suppliers", () => {
    const onComplete = vi.fn();
    render(<LoadingScreen suppliers={[]} durationMs={0} onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(message()).toBe("Ecco le migliori offerte per te!");
  });

  it("never uses call or demo wording", () => {
    render(<LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={() => {}} />);
    for (const t of [0, 300, 300, 400]) {
      advance(t);
      expect(screen.getByTestId("loading-screen").textContent).not.toMatch(/chiam|telefon|call|demo/i);
    }
  });
});

describe("getHighlightIndex", () => {
  it("is -1 before and after the compare phase and walks through every logo", () => {
    expect(getHighlightIndex(0.1, 4)).toBe(-1);
    expect(getHighlightIndex(0.9, 4)).toBe(-1);
    expect(getHighlightIndex(0.2, 0)).toBe(-1);
    const seq = [0.21, 0.4, 0.6, 0.84].map((p) => getHighlightIndex(p, 4));
    expect(seq).toEqual([0, 1, 2, 3]);
  });
});

describe("getLoadingMessage", () => {
  it("handles singular and empty supplier counts", () => {
    expect(getLoadingMessage(0.3, 1)).toBe("Confrontiamo le offerte di 1 fornitore…");
    expect(getLoadingMessage(0.3, 0)).toBe("Confrontiamo le offerte disponibili…");
  });
});
