#!/usr/bin/env python3
"""
Build the `public.comuni` dataset (T1.3) and emit it as chunked SQL migrations.

Sources (downloaded into ./.cache/, which is gitignored):
  1. ISTAT "Elenco comuni italiani" (xlsx, official list of municipalities, CC BY 4.0)
     https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx
  2. ISTAT "Variazioni amministrative e territoriali dal 1991" (zip/csv, CC BY 4.0)
     -> predecessors of comuni created/renamed/moved after Tabella A (renames, mergers, transfers).
  3. Samurai016/Comuni-ITA data/comuni.json (MIT), pinned commit -> CAP list per comune.
  4. Openpolis "Le zone climatiche dei comuni italiani" (Flourish table, elaboration of the
     DPR 412/93 Tabella A as updated by the Ministry, last update 2016)
     -> climate zone per comune (matched by name + region).

Climate zone resolution (column climate_zone_source):
  'dpr412'         exact match of the current comune (name + region) in Tabella A
  'dpr412_renamed' current comune not in Tabella A under its current name, but it has exactly
                   one predecessor (rename / province or region transfer, same territory) that is
  'dpr412_merged'  comune created by a merger whose predecessors are ALL in Tabella A and ALL
                   share the same zone (unambiguous)
  NULL             no reliable zone (merger of comuni in different zones, or predecessor not
                   found) -> climate_zone left NULL and flagged.
Run with --no-derive to keep only exact matches.

Usage:
  python3 -I app/supabase/scripts/build_comuni.py [--no-derive] [--chunk-size N]
Output:
  app/supabase/migrations/<TS>_comuni_data_NN.sql
  prints statistics (copy them into app/supabase/README.md)
"""
from __future__ import annotations

import argparse
import collections
import csv
import io
import json
import re
import sys
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE = HERE / ".cache"
MIGRATIONS = HERE.parent / "migrations"
MIGRATION_TS_PREFIX = "2026101512"  # chunk N -> 2026101512 + (10 + N) + "00"

# Variations not (yet) in the ISTAT variations file (it stops at 2024) or spelling differences
# between the ISTAT name and Tabella A (entries REPLACE the ISTAT predecessors). Each entry: current ISTAT code -> [(code, name in Tabella A, region code)].
MANUAL_PREDECESSORS: dict[str, list[tuple[str, str, str]]] = {
    "024129": [("024027", "Castegnero", "05"), ("024071", "Nanto", "05")],  # merger 20/02/2026 (ISTAT list 21/02/2026)
    "083100": [("083100", "Tripi", "19")],  # renamed "Tripi - Abakainon" (2025)
    "006113": [("006113", "Murisengo", "01")],  # renamed "Murisengo Monferrato" (2025)
    "102017": [("102017", "Ionadi", "18")],  # ISTAT "Jonadi" is spelled "Ionadi" in Tabella A
}

COMUNI_ITA_COMMIT = "433eb7e707ea9e04bf3859610a40e098f4f82ba5"
SOURCES = {
    "istat/Elenco-comuni-italiani.xlsx":
        "https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx",
    "comuni-ita/comuni.json":
        f"https://raw.githubusercontent.com/Samurai016/Comuni-ITA/{COMUNI_ITA_COMMIT}/data/comuni.json",
    "istat-var/Variazioni-amministrative-e-territoriali-dal-1991.zip":
        "https://www.istat.it/storage/codici-unita-amministrative/Variazioni-amministrative-e-territoriali-dal-1991.zip",
    "openpolis/flourish-11460270.html":
        "https://flo.uri.sh/visualisation/11460270/embed",
}



def fetch_sources() -> None:
    for rel, url in SOURCES.items():
        dest = CACHE / rel
        if dest.exists() and dest.stat().st_size > 0:
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        print(f"downloading {url}", file=sys.stderr)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (versus build_comuni)"})
        with urllib.request.urlopen(req, timeout=120) as resp:  # noqa: S310 (fixed https URLs)
            dest.write_bytes(resp.read())


def norm(s: str) -> str:
    """Same normalization as app/src/lib/data/normalize.ts and public.normalize_search()."""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"['’`´.\-]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def italian(s: str) -> str:
    """'Trentino-Alto Adige/Südtirol' -> 'Trentino-Alto Adige'; 'Bolzano/Bozen' -> 'Bolzano'."""
    return s.split("/")[0].strip()


# ---------------------------------------------------------------- ISTAT xlsx (stdlib only)
_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def _col(ref: str) -> int:
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_istat(path: Path) -> list[dict]:
    z = zipfile.ZipFile(path)
    shared = [
        "".join(t.text or "" for t in si.iter(f"{_NS}t"))
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(f"{_NS}si")
    ]
    sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    rows = []
    for r in sheet.iter(f"{_NS}row"):
        cells = {}
        for c in r.findall(f"{_NS}c"):
            v = c.find(f"{_NS}v")
            t = c.get("t")
            if t == "s":
                val = shared[int(v.text)]
            elif t == "inlineStr":
                val = "".join(x.text or "" for x in c.iter(f"{_NS}t"))
            else:
                val = v.text if v is not None else ""
            cells[_col(c.get("r"))] = (val or "").strip()
        rows.append(cells)
    header = rows[0]
    assert header[4].startswith("Codice Comune formato alfanumerico"), header[4]
    assert header[6] == "Denominazione in italiano", header[6]
    assert header[10] == "Denominazione Regione", header[10]
    assert header[11].startswith("Denominazione dell'Unità territoriale sovracomunale"), header[11]
    assert header[14] == "Sigla automobilistica", header[14]
    out = []
    for cells in rows[1:]:
        if not cells.get(4):
            continue
        out.append({
            "istat": cells[4],
            "region_code": cells[0],
            "name": cells[6],
            "province_code": cells[14],
            "province_name": italian(cells[11]),
            "region": italian(cells[10]),
        })
    return out


def read_openpolis(path: Path) -> list[dict]:
    html = path.read_text(encoding="utf-8")
    cols = json.loads(re.search(r"_Flourish_data_column_names = (\{.*?\}),\s*\n", html, re.S).group(1))
    assert cols["rows"]["columns"][0] == "Comune" and cols["rows"]["columns"][4] == "Zona climatica", cols
    data = json.loads(re.search(r"_Flourish_data = (\{.*?\}),\s*\n", html, re.S).group(1))
    out = []
    for r in data["rows"]:
        name, region, gg, _alt, zone = r["columns"]
        out.append({"name": name, "region": italian(region), "gg": gg, "zone": zone.strip().upper()})
    return out


def read_variations(path: Path) -> dict[str, list[tuple[str, str, str]]]:
    """
    ISTAT administrative variations since 1991 -> {new_code: [(pred_code, pred_name, pred_region_code)]}.
      CS  new comune constituted (col 4) from comune/territory of col 8   (merger or split)
      CD  name change: col 4/5 (old) -> col 8/9 (new)
      AP  province change: col 4/5 (old code) -> col 8/9 (new code)
    """
    z = zipfile.ZipFile(path)
    name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
    text = z.read(name).decode("latin-1")
    rows = list(csv.reader(io.StringIO(text), delimiter=";"))
    h = rows[0]
    assert h[1].startswith("Tipo variazione") and h[4].startswith("Codice Comune") and h[8].startswith("Codice del Comune associato"), h
    preds: dict[str, list[tuple[str, str, str]]] = collections.defaultdict(list)
    for r in rows[1:]:
        if len(r) < 10:
            continue
        kind = r[1].strip()
        if kind == "CS":
            item, new = (r[8].strip(), r[9].strip(), r[6].strip()), r[4].strip()
        elif kind in ("CD", "AP"):
            item, new = (r[4].strip(), r[5].strip(), r[2].strip()), r[8].strip()
        else:
            continue
        if new and item[0] != new or kind == "CD":
            if item not in preds[new]:
                preds[new].append(item)
    return preds


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-derive", action="store_true", help="only exact Tabella A matches")
    ap.add_argument("--chunk-size", type=int, default=1000)
    args = ap.parse_args()

    fetch_sources()
    istat = read_istat(CACHE / "istat/Elenco-comuni-italiani.xlsx")
    cita = {c["codice"]: c for c in json.loads((CACHE / "comuni-ita/comuni.json").read_text("utf-8"))}
    preds = read_variations(CACHE / "istat-var/Variazioni-amministrative-e-territoriali-dal-1991.zip")
    preds.update(MANUAL_PREDECESSORS)  # manual entries replace the ISTAT ones
    op = read_openpolis(CACHE / "openpolis/flourish-11460270.html")
    region_by_code = {c["region_code"]: c["region"] for c in istat}

    # --- Tabella A lookups
    by_name_region: dict[tuple[str, str], set[str]] = collections.defaultdict(set)
    by_name: dict[str, set[str]] = collections.defaultdict(set)
    by_name_count: collections.Counter = collections.Counter()
    for r in op:
        if r["zone"] not in {"A", "B", "C", "D", "E", "F"}:
            continue
        by_name_count[norm(r["name"])] += 1
        by_name[norm(r["name"])].add(r["zone"])
        if r["region"]:
            by_name_region[(norm(r["name"]), norm(r["region"]))].add(r["zone"])

    def lookup(name: str, region: str | None, allow_name_only: bool) -> str | None:
        zones = by_name_region.get((norm(name), norm(region or "")))
        if zones and len(zones) == 1:
            return next(iter(zones))
        # Name-only fallback (predecessors only): Tabella A rows of long-ceased comuni have no
        # region; accept only names that are unique in the whole table.
        if allow_name_only and by_name_count[norm(name)] == 1:
            return next(iter(by_name[norm(name)]))
        return None

    def resolve(code: str, name: str, region: str, depth: int, seen: frozenset) -> tuple[str | None, bool]:
        """Zone of a predecessor (recursively through ISTAT variations). Returns (zone, merged)."""
        z = lookup(name, region, allow_name_only=True)
        if z:
            return z, False
        ps = [p for p in preds.get(code, []) if p[0] not in seen]
        if not ps or depth > 6:
            return None, False
        results = [resolve(pc, italian(pn), region_by_code.get(pr, ""), depth + 1, seen | {code}) for pc, pn, pr in ps]
        zones = {r[0] for r in results}
        if None in zones or len(zones) != 1:
            return None, False
        return zones.pop(), len(ps) > 1 or any(r[1] for r in results)

    # --- provinces: sigla must map to exactly one (name, region)
    provinces: dict[str, tuple[str, str]] = {}
    for c in istat:
        key = (c["province_name"], c["region"])
        prev = provinces.setdefault(c["province_code"], key)
        assert prev == key, f"province code {c['province_code']} maps to {prev} and {key}"

    stats = collections.Counter()
    missing_zone: list[dict] = []
    missing_caps: list[str] = []
    rows = []
    for c in istat:
        zone = lookup(c["name"], c["region"], allow_name_only=False)
        source = "dpr412" if zone else None
        if not zone and not args.no_derive:
            ps = preds.get(c["istat"], [])
            if ps:
                results = [resolve(pc, italian(pn), region_by_code.get(pr, ""), 1, frozenset({c["istat"]})) for pc, pn, pr in ps]
                zones = {r[0] for r in results}
                if None not in zones and len(zones) == 1:
                    zone = zones.pop()
                    merged = len(ps) > 1 or any(r[1] for r in results)
                    source = "dpr412_merged" if merged else "dpr412_renamed"
        if zone:
            stats[f"source:{source}"] += 1
        else:
            missing_zone.append({**c, "predecessors": sorted({p[1] for p in preds.get(c["istat"], [])})})
        caps: list[str] = []
        ci = cita.get(c["istat"])
        if ci:
            caps = sorted(set(ci.get("cap") or []) | set(ci.get("capAlternativi") or []))
            caps = [x for x in caps if re.fullmatch(r"\d{5}", x)]
        if not caps:
            missing_caps.append(f"{c['istat']} {c['name']}")
        rows.append({**c, "zone": zone, "source": source, "caps": caps})

    # --- emit chunked migrations, grouped by region so the province lookup per chunk stays small
    region_order = []
    for r in rows:
        if r["region"] not in region_order:
            region_order.append(r["region"])
    chunks: list[list[dict]] = []
    cur: list[dict] = []
    for region in region_order:
        rr = [r for r in rows if r["region"] == region]
        if cur and len(cur) + len(rr) > args.chunk_size:
            chunks.append(cur)
            cur = []
        cur.extend(rr)
    if cur:
        chunks.append(cur)

    for old in MIGRATIONS.glob("*_comuni_data_*.sql"):
        old.unlink()
    src_code = {"dpr412": "d", "dpr412_renamed": "r", "dpr412_merged": "m", None: None}
    for i, chunk in enumerate(chunks, start=1):
        ts = f"{MIGRATION_TS_PREFIX}{10 + i:02d}00"
        path = MIGRATIONS / f"{ts}_comuni_data_{i:02d}.sql"
        provs = sorted({r["province_code"] for r in chunk})
        regions = sorted({r["region"] for r in chunk})
        lines = [
            f"-- T1.3 comuni dataset, chunk {i}/{len(chunks)}: {len(chunk)} comuni ({', '.join(regions)}).",
            "-- GENERATED by app/supabase/scripts/build_comuni.py - do not edit by hand.",
            "-- Sources: ISTAT Elenco comuni italiani (CC BY 4.0), Samurai016/Comuni-ITA CAPs (MIT),",
            "-- DPR 412/93 Tabella A climate zones via Openpolis. See app/supabase/README.md.",
            "-- Idempotent: re-running updates existing rows.",
            "insert into public.comuni",
            "  (istat_code, name, province_code, province_name, region, caps, climate_zone, climate_zone_source)",
            "select v.istat_code, v.name, v.province_code, p.province_name, p.region, v.caps::text[], v.zone,",
            "       case v.src when 'd' then 'dpr412' when 'r' then 'dpr412_renamed' when 'm' then 'dpr412_merged' end",
            "from (values",
        ]
        vals = []
        for r in chunk:
            caps = "{" + ",".join(r["caps"]) + "}"
            z = sql_str(r["zone"]) if r["zone"] else "null"
            s = sql_str(src_code[r["source"]]) if r["source"] else "null"
            vals.append(f"  ({sql_str(r['istat'])},{sql_str(r['name'])},{sql_str(r['province_code'])},{z},{s},{sql_str(caps)})")
        lines.append(",\n".join(vals))
        lines.append(") as v(istat_code, name, province_code, zone, src, caps)")
        lines.append("join (values")
        lines.append(",\n".join(
            f"  ({sql_str(code)},{sql_str(provinces[code][0])},{sql_str(provinces[code][1])})" for code in provs))
        lines.append(") as p(province_code, province_name, region) on p.province_code = v.province_code")
        lines.append("on conflict (istat_code) do update set")
        lines.append("  name = excluded.name, province_code = excluded.province_code,")
        lines.append("  province_name = excluded.province_name, region = excluded.region, caps = excluded.caps,")
        lines.append("  climate_zone = excluded.climate_zone, climate_zone_source = excluded.climate_zone_source;")
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"wrote {path.relative_to(HERE.parent.parent)} ({len(chunk)} rows, {path.stat().st_size} bytes)")

    zc = collections.Counter(r["zone"] for r in rows)
    print(json.dumps({
        "comuni": len(rows),
        "provinces": len(provinces),
        "regions": len(region_order),
        "zones": {k or "null": zc[k] for k in ["A", "B", "C", "D", "E", "F", None]},
        "zone_source": dict(stats),
        "without_zone": len(missing_zone),
        "without_caps": missing_caps,
        "tabella_a_rows": len(op),
        "comuni_ita_commit": COMUNI_ITA_COMMIT,
    }, indent=2, ensure_ascii=False))
    (CACHE / "missing_zone.json").write_text(json.dumps(missing_zone, indent=1, ensure_ascii=False), "utf-8")
    print(f"comuni without zone listed in {CACHE / 'missing_zone.json'}", file=sys.stderr)


if __name__ == "__main__":
    main()
