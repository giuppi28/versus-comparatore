# Canonical facts — VERSUS

Rule: every listing, schema block, `llms.txt` and page copies these values byte-identical. ⚠ values never ship: omit them until confirmed. Updated 2026-11-05.

## Confirmed
| Fact | Value | Source |
|---|---|---|
| ✅ Brand | VERSUS — comparatore luce e gas | PRD, live site |
| ✅ Canonical domain | https://versuscomparatorelucegas.it | Vercel, `DOMINIO_IONOS_VERCEL.md` |
| ✅ Legal entity | KEHILA S.r.l.s. | Visura, `app/src/lib/legal/company.ts` |
| ✅ Registered office | Via Umberto 326 B, 95055 San Pietro Clarenza (CT) | Visura |
| ✅ P.IVA / registro imprese | 06237360877 (CCIAA Sud Est Sicilia) | Visura |
| ✅ REA | CT-481759 | Visura |
| ✅ Email | info@versuscomparatorelucegas.it | Giuseppe, 2026-11-04 |
| ✅ Service | Free online comparison of luce, gas, luce + gas offers; casa and partita IVA; cambio fornitore, subentro, voltura, primo allaccio; online activation | PRD, live FAQ |
| ✅ Cost to the customer | Comparison is free | Live FAQ |
| ✅ Estimates | Shown excluding IVA | Live FAQ |
| ✅ Market coverage | "Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato" | Live results footnote, SPEC decision #31 |
| ✅ How VERSUS is paid | "VERSUS opera come agente ed è remunerato dai venditori." | Live results footnote, SPEC decision #31 |
| ✅ Ordering | "In evidenza" offers first (commercial choice of VERSUS), then fixed offers by estimated monthly cost, then variable offers | Live results footnote, SPEC decision #18, #31 |
| ✅ Suppliers with active offers on 2026-11-05 | A2A Energia, Asti Energy, Edison Energia, Enegan, Enel Energia, Eni Plenitude, Estra Energia, Iren, Sentra Energia | Live `/offerte` payload; always read this list from the DB, never hard-code it |

## Unconfirmed: do not publish
| Fact | Why | Who |
|---|---|---|
| ⚠ Offer prices are current | Source list dated 2026-10-27; Aldo's confirmation still open (`docs/HANDOFF.md`) | Aldo |
| ⚠ Fees and 12-month lock | Values not in Aldo's list | Aldo |
| ⚠ Telephone number | Current value +39 095 123 4567 is a placeholder; number also barred from UI before the thank-you page | Aldo |
| ⚠ Savings claims | No calculation method defined | Aldo, Giuseppe |
| ⚠ Social profiles, Wikidata, reviews | None exist; no `sameAs`, no ratings | Giuseppe |

Six suppliers appear in the home logo strip without active offers (Acea Energia, E.ON Energia, Engie, Hera Comm, Iberdrola, Sorgenia): do not name them as compared suppliers in schema, `llms.txt` or new pages. Giuseppe chose on 2026-11-05 to keep all 15 logos on the home (T17.3).
