import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Autocomplete, type AutocompleteOption } from "./Autocomplete";

const ALL: AutocompleteOption[] = [
  { value: "1", label: "Milano", description: "MI" },
  { value: "2", label: "Mantova", description: "MN" },
  { value: "3", label: "Roma", description: "RM" },
];

const makeSearch = () =>
  vi.fn(async (q: string) => ALL.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())));

function Demo({
  search,
  onPick,
  error,
}: {
  search: (q: string) => Promise<AutocompleteOption[]>;
  onPick?: (o: AutocompleteOption | null) => void;
  error?: string;
}) {
  const [value, setValue] = useState<AutocompleteOption | null>(null);
  return (
    <Autocomplete
      label="Comune"
      search={search}
      value={value}
      debounceMs={0}
      error={error}
      onChange={(o) => {
        setValue(o);
        onPick?.(o);
      }}
    />
  );
}

describe("Autocomplete", () => {
  it("has combobox semantics", () => {
    render(<Demo search={makeSearch()} />);
    const input = screen.getByRole("combobox", { name: "Comune" });
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input.getAttribute("aria-controls")).toBeTruthy();
  });

  it("does not search below minChars", async () => {
    const search = makeSearch();
    render(<Demo search={search} />);
    await userEvent.type(screen.getByRole("combobox"), "m");
    expect(search).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("searches asynchronously and shows options", async () => {
    const search = makeSearch();
    render(<Demo search={search} />);
    await userEvent.type(screen.getByRole("combobox"), "ma");
    expect(await screen.findByRole("option", { name: /Mantova/ })).toBeInTheDocument();
    expect(search).toHaveBeenLastCalledWith("ma");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
  });

  it("navigates with arrows and picks with Enter", async () => {
    const onPick = vi.fn();
    render(<Demo search={makeSearch()} onPick={onPick} />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "an"); // Milano, Mantova
    await screen.findByRole("option", { name: /Mantova/ });
    const opts = screen.getAllByRole("option");
    expect(opts.map((o) => o.textContent)).toEqual(["MilanoMI", "MantovaMN"]);
    expect(opts[0]).toHaveAttribute("aria-selected", "true");
    expect(input.getAttribute("aria-activedescendant")).toBe(opts[0].id);
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    expect(input.getAttribute("aria-activedescendant")).toBe(opts[1].id);
    await userEvent.keyboard("{ArrowDown}"); // wraps
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onPick).toHaveBeenLastCalledWith(expect.objectContaining({ label: "Mantova" }));
    expect(input).toHaveValue("Mantova");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("ArrowUp from the first option wraps to the last", async () => {
    render(<Demo search={makeSearch()} />);
    await userEvent.type(screen.getByRole("combobox"), "an");
    await screen.findByRole("option", { name: /Mantova/ });
    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
  });

  it("picks with the mouse", async () => {
    const onPick = vi.fn();
    render(<Demo search={makeSearch()} onPick={onPick} />);
    await userEvent.type(screen.getByRole("combobox"), "rom");
    await userEvent.click(await screen.findByRole("option", { name: /Roma/ }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ value: "3" }));
    expect(screen.getByRole("combobox")).toHaveValue("Roma");
  });

  it("closes with Escape without picking", async () => {
    const onPick = vi.fn();
    render(<Demo search={makeSearch()} onPick={onPick} />);
    await userEvent.type(screen.getByRole("combobox"), "rom");
    await screen.findByRole("option", { name: /Roma/ });
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    expect(onPick).not.toHaveBeenCalled();
  });

  it("shows an empty state", async () => {
    render(<Demo search={makeSearch()} />);
    await userEvent.type(screen.getByRole("combobox"), "zzz");
    expect(await screen.findByText("Nessun risultato")).toBeInTheDocument();
  });

  it("clears the selection when the text is edited after picking", async () => {
    const onPick = vi.fn();
    render(<Demo search={makeSearch()} onPick={onPick} />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "rom");
    await userEvent.click(await screen.findByRole("option", { name: /Roma/ }));
    await userEvent.type(input, "x");
    expect(onPick).toHaveBeenLastCalledWith(null);
  });

  it("ignores stale responses", async () => {
    const resolvers: Record<string, (v: AutocompleteOption[]) => void> = {};
    const search = vi.fn(
      (q: string) => new Promise<AutocompleteOption[]>((res) => (resolvers[q] = res)),
    );
    render(<Demo search={search} />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "ro");
    await waitFor(() => expect(search).toHaveBeenCalledWith("ro"));
    await userEvent.type(input, "m");
    await waitFor(() => expect(search).toHaveBeenCalledWith("rom"));
    resolvers["rom"]([ALL[2]]);
    await screen.findByRole("option", { name: /Roma/ });
    resolvers["ro"]([ALL[0]]); // late, stale
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("option", { name: /Milano/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Roma/ })).toBeInTheDocument();
  });

  it("shows loading indicator while searching", async () => {
    let resolve!: (v: AutocompleteOption[]) => void;
    const search = vi.fn(() => new Promise<AutocompleteOption[]>((r) => (resolve = r)));
    render(<Demo search={search} />);
    await userEvent.type(screen.getByRole("combobox"), "mi");
    expect(await screen.findByRole("status", { name: "Ricerca in corso" })).toBeInTheDocument();
    resolve([ALL[0]]);
    await screen.findByRole("option", { name: /Milano/ });
    expect(screen.queryByRole("status", { name: "Ricerca in corso" })).not.toBeInTheDocument();
  });

  it("handles search failures gracefully", async () => {
    const search = vi.fn().mockRejectedValue(new Error("boom"));
    render(<Demo search={search} />);
    await userEvent.type(screen.getByRole("combobox"), "mi");
    expect(await screen.findByText("Nessun risultato")).toBeInTheDocument();
  });

  it("shows inline errors", () => {
    render(<Demo search={makeSearch()} error="Seleziona un comune" />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Seleziona un comune");
  });
});

describe("Autocomplete controlled value", () => {
  it("shows a value set by the parent and clears when the parent resets it", () => {
    const search = makeSearch();
    const { rerender } = render(
      <Autocomplete label="Comune" search={search} value={ALL[0]} onChange={() => {}} />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("Milano");
    rerender(<Autocomplete label="Comune" search={search} value={null} onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveValue("");
    rerender(<Autocomplete label="Comune" search={search} value={ALL[2]} onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveValue("Roma");
  });
});
