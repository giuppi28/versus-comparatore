/**
 * Company data shown in the footer of every public page (SPEC decision #30).
 * Single source: fill the values in when Aldo provides them; `null` = unknown, not rendered.
 * Required: ragioneSociale, sedeLegale, email, partitaIva (art. 35 c.1 DPR 633/1972).
 * Company-only (S.r.l. / S.p.A., art. 2250 c.c.): registro imprese office + number, capitale versato, socio unico.
 */
export interface CompanyData {
  ragioneSociale: string | null;
  sedeLegale: string | null;
  email: string | null;
  partitaIva: string | null;
  rea: string | null;
  registroImpreseUfficio: string | null;
  registroImpreseNumero: string | null;
  /** Free text, e.g. "10.000,00". */
  capitaleVersato: string | null;
  /** true = "Socio unico"; false/null = not shown. */
  socioUnico: boolean | null;
}

export const COMPANY: CompanyData = {
  ragioneSociale: null,
  sedeLegale: null,
  email: null,
  partitaIva: null,
  rea: null,
  registroImpreseUfficio: null,
  registroImpreseNumero: null,
  capitaleVersato: null,
  socioUnico: null,
};

const filled = (v: string | null): v is string => !!v && v.trim() !== "";

/** True when every required field is set. */
export function isComplete(company: CompanyData = COMPANY): boolean {
  return (
    filled(company.ragioneSociale) &&
    filled(company.sedeLegale) &&
    filled(company.email) &&
    filled(company.partitaIva)
  );
}

/** Footer lines made of the known values only (empty array when nothing is known). */
export function companyLines(company: CompanyData = COMPANY): string[] {
  const main: string[] = [];
  if (filled(company.ragioneSociale)) main.push(company.ragioneSociale.trim());
  if (filled(company.sedeLegale)) main.push(`Sede legale ${company.sedeLegale.trim()}`);
  if (filled(company.partitaIva)) main.push(`P.IVA ${company.partitaIva.trim()}`);
  if (filled(company.rea)) main.push(`REA ${company.rea.trim()}`);
  if (filled(company.email)) main.push(company.email.trim());

  const extra: string[] = [];
  if (filled(company.registroImpreseUfficio) && filled(company.registroImpreseNumero)) {
    extra.push(
      `Registro imprese di ${company.registroImpreseUfficio.trim()} n. ${company.registroImpreseNumero.trim()}`,
    );
  } else if (filled(company.registroImpreseNumero)) {
    extra.push(`Registro imprese n. ${company.registroImpreseNumero.trim()}`);
  } else if (filled(company.registroImpreseUfficio)) {
    extra.push(`Registro imprese di ${company.registroImpreseUfficio.trim()}`);
  }
  if (filled(company.capitaleVersato)) extra.push(`Capitale sociale versato € ${company.capitaleVersato.trim()}`);
  if (company.socioUnico === true) extra.push("Socio unico");

  return [main.join(" · "), extra.join(" · ")].filter((l) => l !== "");
}
