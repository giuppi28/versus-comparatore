import { describe, expect, it } from "vitest";
import { createMockRepository } from "@/lib/data";
import { page1Data } from "@/lib/lead/test-fixtures";
import { fetchLeadList, leadDisplayName, listHref, parseListParams } from "./list-params";

describe("parseListParams", () => {
  it("defaults to the completed tab, page 1, no filters", () => {
    expect(parseListParams({})).toEqual({ tab: "completati", step: null, status: null, q: "", page: 1 });
  });

  it("accepts valid values and ignores unknown ones", () => {
    expect(parseListParams({ tab: "parziali", step: "results", status: "closed", q: "  rossi ", page: "3" })).toEqual({
      tab: "parziali",
      step: "results",
      status: "closed",
      q: "rossi",
      page: 3,
    });
    expect(parseListParams({ tab: "x", step: "nope", status: "zzz", page: "-4" })).toEqual({
      tab: "completati",
      step: null,
      status: null,
      q: "",
      page: 1,
    });
    expect(parseListParams({ page: "abc" }).page).toBe(1);
    expect(parseListParams({ tab: ["tutti", "parziali"] }).tab).toBe("tutti");
  });

  it("restricts the step filter to the steps allowed by the tab", () => {
    expect(parseListParams({ tab: "completati", step: "page1" }).step).toBeNull();
    expect(parseListParams({ tab: "parziali", step: "completed" }).step).toBeNull();
    expect(parseListParams({ tab: "tutti", step: "completed" }).step).toBe("completed");
  });
});

describe("listHref", () => {
  it("omits defaults and round-trips through parseListParams", () => {
    expect(listHref({})).toBe("/admin/leads");
    expect(listHref({ tab: "completati", page: 1 })).toBe("/admin/leads");
    const params = { tab: "tutti" as const, step: "results" as const, status: "new" as const, q: "a b", page: 2 };
    const url = new URL(listHref(params), "http://x");
    expect(parseListParams(Object.fromEntries(url.searchParams))).toEqual(params);
  });
});

describe("leadDisplayName", () => {
  it("prefers company, then person, then a placeholder", () => {
    expect(leadDisplayName({ company_name: "Acme Srl", first_name: "A", last_name: "B" })).toBe("Acme Srl");
    expect(leadDisplayName({ company_name: null, first_name: "Mario", last_name: "Rossi" })).toBe("Mario Rossi");
    expect(leadDisplayName({ company_name: " ", first_name: null, last_name: null })).toBe("Senza nome");
  });
});

describe("fetchLeadList", () => {
  async function seed() {
    const repo = createMockRepository();
    const completed = await repo.createLead(page1Data({ first_name: "Anna", last_name: "Completa" }));
    await repo.completeLead(completed.token, { commodity: "luce" });
    await repo.createLead(page1Data({ first_name: "Paolo", last_name: "Pagina" }));
    const results = await repo.createLead(page1Data({ first_name: "Rita", last_name: "Risultati" }));
    await repo.updateLead(results.token, { step_reached: "results" });
    return repo;
  }
  const params = (o: Partial<Parameters<typeof fetchLeadList>[1]> = {}) => ({
    tab: "completati" as const,
    step: null,
    status: null,
    q: "",
    page: 1,
    ...o,
  });

  it("completati / parziali / tutti split completed from partial leads", async () => {
    const repo = await seed();
    const done = await fetchLeadList(repo, params());
    expect(done.items.map((l) => l.first_name)).toEqual(["Anna"]);
    const partial = await fetchLeadList(repo, params({ tab: "parziali" }));
    expect(partial.items.map((l) => l.first_name).sort()).toEqual(["Paolo", "Rita"]);
    expect(partial.total).toBe(2);
    const all = await fetchLeadList(repo, params({ tab: "tutti" }));
    expect(all.total).toBe(3);
    const step = await fetchLeadList(repo, params({ tab: "parziali", step: "results" }));
    expect(step.items.map((l) => l.first_name)).toEqual(["Rita"]);
  });

  it("applies search and status filters and paginates", async () => {
    const repo = await seed();
    expect((await fetchLeadList(repo, params({ tab: "tutti", q: "pagina" }))).total).toBe(1);
    expect((await fetchLeadList(repo, params({ tab: "tutti", status: "closed" }))).total).toBe(0);
    const paged = await fetchLeadList(repo, params({ tab: "tutti" }), 2);
    expect(paged.pageCount).toBe(2);
    expect(paged.items).toHaveLength(2);
    const p2 = await fetchLeadList(repo, params({ tab: "tutti", page: 2 }), 2);
    expect(p2.items).toHaveLength(1);
    const partialP2 = await fetchLeadList(repo, params({ tab: "parziali", page: 2 }), 1);
    expect(partialP2.items).toHaveLength(1);
    expect(partialP2.pageCount).toBe(2);
  });
});
