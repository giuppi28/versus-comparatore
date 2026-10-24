import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import {
  DEFAULT_DURATION_MS,
  LoadingScreen,
  blackLogoUrl,
  commodityPhrase,
  getLoadingMessage,
  getLoadingMessageParts,
} from "./LoadingScreen";

const SUPPLIERS = [
  { id: "a", name: "Alfa Energia" },
  { id: "b", name: "Beta Luce", logoUrl: "/logos/beta-luce.svg" },
  { id: "c", name: "Gamma Gas", logoUrl: "https://cdn.example.com/gamma.png" },
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
const realIds = () => screen.getAllByTestId("loading-supplier").map((el) => el.dataset.supplierId);

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
    render(<LoadingScreen suppliers={SUPPLIERS} commodities={["luce"]} durationMs={6000} onComplete={() => {}} />);
    expect(screen.getByTestId("loading-screen")).toBeInTheDocument();
    expect(message()).toBe("Analizziamo i tuoi consumi");
    advance(800);
    expect(message()).toBe("Stiamo confrontando le offerte luce per te");
    advance(700);
    expect(message()).toBe("Analizziamo i migliori fornitori");
    advance(700);
    expect(message()).toBe("Calcoliamo la tua spesa mensile");
    advance(700);
    expect(message()).toBe("Stiamo ricercando per te l'offerta più bassa");
    // Longest message: still on screen ~2.3 s later (t = 5.2 s), gone shortly after 5.3 s.
    advance(2300);
    expect(message()).toBe("Stiamo ricercando per te l'offerta più bassa");
    advance(200);
    expect(message()).toBe("Ecco le migliori offerte per te!");
  });

  it("highlights the key words in green with a readable (700) shade", () => {
    render(<LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={() => {}} />);
    const em = screen.getByTestId("loading-message").querySelector("span span");
    expect(em?.textContent).toBe("tuoi consumi");
    expect(em?.className).toContain("text-brand-700");
  });

  it("highlights 'offerta più bassa' with the same green markup as the other messages", () => {
    expect(getLoadingMessageParts(0.6)).toEqual(["Stiamo ricercando per te l'", { em: "offerta più bassa" }]);
    render(<LoadingScreen suppliers={SUPPLIERS} durationMs={6000} onComplete={() => {}} />);
    advance(3000);
    const em = screen.getByTestId("loading-message").querySelector("span span");
    expect(em?.textContent).toBe("offerta più bassa");
    expect(em?.className).toContain("text-brand-700");
  });

  it("words the comparison message per commodity", () => {
    expect(commodityPhrase(["luce"])).toBe("offerte luce");
    expect(commodityPhrase(["gas"])).toBe("offerte gas");
    expect(commodityPhrase(["luce", "gas"])).toBe("offerte luce e gas");
    expect(commodityPhrase(undefined)).toBe("offerte");
    expect(getLoadingMessage(0.15, ["gas"])).toBe("Stiamo confrontando le offerte gas per te");
    expect(getLoadingMessage(0.15, ["luce", "gas"])).toBe("Stiamo confrontando le offerte luce e gas per te");
    expect(getLoadingMessageParts(0.95)).toEqual(["Ecco le ", { em: "migliori offerte" }, " per te!"]);
  });

  it("never renders the excluded supplier, in the real list nor in the copies", () => {
    const { container } = render(
      <LoadingScreen suppliers={SUPPLIERS} excludeSupplierIds={["a"]} durationMs={1000} onComplete={() => {}} />,
    );
    expect(realIds()).toEqual(["b", "c", "d"]);
    expect(container.querySelectorAll('[data-supplier-id="a"]')).toHaveLength(0);
    expect(screen.queryByText("Alfa Energia")).not.toBeInTheDocument();
  });

  it("never renders anything when the only supplier is excluded", () => {
    render(
      <LoadingScreen suppliers={[SUPPLIERS[0]]} excludeSupplierIds={["a"]} durationMs={1000} onComplete={() => {}} />,
    );
    expect(screen.queryAllByTestId("loading-supplier")).toHaveLength(0);
    expect(screen.queryByTestId("loading-suppliers")).not.toBeInTheDocument();
  });

  it("shows every supplier once in the real list, dedupes, and hides the loop copies from assistive tech", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ id: `s${i}`, name: `Fornitore ${i}` }));
    const { container } = render(
      <LoadingScreen suppliers={[...many, many[0]]} durationMs={1000} onComplete={() => {}} />,
    );
    expect(screen.getAllByTestId("loading-supplier")).toHaveLength(15);
    // Every item outside the first real set is a hidden copy.
    const copies = container.querySelectorAll('[data-testid="loading-supplier-copy"]');
    expect(copies.length).toBeGreaterThanOrEqual(15);
    copies.forEach((el) => expect(el).toHaveAttribute("aria-hidden", "true"));
    expect(container.querySelector('ul[aria-hidden="true"]')).not.toBeNull();
  });

  it("repeats a short supplier list so the loop track is wider than the screen", () => {
    const { container } = render(
      <LoadingScreen suppliers={SUPPLIERS.slice(0, 2)} durationMs={1000} onComplete={() => {}} />,
    );
    expect(screen.getAllByTestId("loading-supplier")).toHaveLength(2);
    // 12 minimum items per cycle -> 6 repeats x 2 cycles = 24 items in total.
    expect(container.querySelectorAll("li")).toHaveLength(24);
    expect(container.querySelector(".vs-marquee-mask")).not.toBeNull();
  });

  it("renders black logos, a filtered fallback for remote ones, and a text chip without logo", () => {
    render(<LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={() => {}} />);
    const local = screen.getByAltText("Beta Luce");
    expect(local).toHaveAttribute("src", "/logos/black/beta-luce.svg");
    expect(local.className).not.toContain("brightness-0");
    const remote = screen.getByAltText("Gamma Gas");
    expect(remote).toHaveAttribute("src", "https://cdn.example.com/gamma.png");
    expect(remote.className).toContain("brightness-0");
    expect(screen.getAllByText("Alfa Energia").length).toBeGreaterThan(0);
  });

  it("maps local colour logos to their black twin", () => {
    expect(blackLogoUrl("/logos/enel-energia.svg")).toEqual({ src: "/logos/black/enel-energia.svg", needsFilter: false });
    expect(blackLogoUrl("/logos/black/enel-energia.svg").needsFilter).toBe(true);
    expect(blackLogoUrl("https://x.test/a.svg").needsFilter).toBe(true);
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

  it("uses the 6 second default duration", () => {
    expect(DEFAULT_DURATION_MS).toBe(6000);
    const onComplete = vi.fn();
    render(<LoadingScreen suppliers={SUPPLIERS} onComplete={onComplete} />);
    advance(5900);
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

  it("drives the ring with stroke-dashoffset, in sync with the total duration", () => {
    render(<LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={() => {}} />);
    const ring = screen.getByTestId("loading-ring");
    expect(ring.tagName.toLowerCase()).toBe("circle");
    expect(ring).toHaveAttribute("stroke-dasharray", "100");
    expect(ring).toHaveAttribute("stroke-dashoffset", "100");
    advance(500);
    expect(ring).toHaveAttribute("stroke-dashoffset", "50");
    advance(500);
    expect(ring).toHaveAttribute("stroke-dashoffset", "0");
  });

  it("uses the black VERSUS icon without any square background", () => {
    render(<LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={() => {}} />);
    const mark = screen.getByTestId("versus-mark");
    expect(mark).toHaveAttribute("aria-hidden", "true");
    expect(mark.getAttribute("class")).toContain("h-24");
    expect(mark.getAttribute("class")).toContain("sm:h-32");
  });

  it("reserves a fixed height for the message (no layout shift)", () => {
    render(<LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={() => {}} />);
    expect(screen.getByTestId("loading-message").className).toContain("h-[5.5rem]");
  });

  it("with prefers-reduced-motion: static centred row, no copies, still progresses and completes", () => {
    mockReducedMotion(true);
    const onComplete = vi.fn();
    const { container } = render(
      <LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={onComplete} />,
    );
    const screenEl = screen.getByTestId("loading-screen");
    expect(screenEl).toHaveAttribute("data-reduced-motion", "true");
    expect(screenEl.querySelector('[data-animate="true"]')).toBeNull();
    expect(container.querySelector(".vs-marquee-track")).toBeNull();
    expect(screen.queryAllByTestId("loading-supplier-copy")).toHaveLength(0);
    expect(realIds()).toEqual(["a", "b", "c", "d"]);
    const row = screen.getByTestId("loading-suppliers");
    expect(row.className).toContain("flex-wrap");
    expect(row.className).toContain("justify-center");
    expect(row.className).toContain("gap-x-10");
    // Symmetric: gaps live on the container, no per-item right padding (would shift the row left).
    screen.getAllByTestId("loading-supplier").forEach((li) => expect(li.className).not.toMatch(/(^|\s)(sm:)?pr-/));
    advance(500);
    expect(screen.getByTestId("loading-ring")).toHaveAttribute("stroke-dashoffset", "50");
    // Reduced motion keeps the sequence (scaled to a 1 s run): the lowest-offer message still shows.
    expect(message()).toBe("Stiamo ricercando per te l'offerta più bassa");
    advance(500);
    expect(message()).toBe("Ecco le migliori offerte per te!");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("animates the marquee and the messages when motion is allowed", () => {
    const { container } = render(<LoadingScreen suppliers={SUPPLIERS} durationMs={1000} onComplete={() => {}} />);
    expect(screen.getByTestId("loading-screen")).toHaveAttribute("data-reduced-motion", "false");
    expect(container.querySelector(".vs-marquee-track")).not.toBeNull();
    expect(container.querySelector('.vs-msg[data-animate="true"]')).not.toBeNull();
  });

  it("completes immediately for a zero duration and handles no suppliers", () => {
    const onComplete = vi.fn();
    render(<LoadingScreen suppliers={[]} durationMs={0} onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(message()).toBe("Ecco le migliori offerte per te!");
  });

  it("never uses call or demo wording", () => {
    render(<LoadingScreen suppliers={SUPPLIERS} commodities={["luce", "gas"]} durationMs={1000} onComplete={() => {}} />);
    for (const t of [0, 800, 700, 700, 700, 3000]) {
      advance(t);
      expect(screen.getByTestId("loading-screen").textContent).not.toMatch(/chiam|telefon|call|demo/i);
    }
  });
});
