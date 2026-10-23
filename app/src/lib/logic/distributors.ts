import {
  COMUNE_FORMELLO,
  COMUNE_MILANO,
  COMUNE_ROMA,
  POD_DISTRIBUTORS,
  type Distributor,
} from "../../config/distributors";
import { normalizePod } from "./validators/pod";

export function podDistributor(pod: string): Distributor | null {
  const v = normalizePod(pod);
  const m = /^(IT\d{3})/.exec(v);
  const name = m ? POD_DISTRIBUTORS[m[1]] : undefined;
  return name ? { code: m![1], name } : null;
}

export const POD_COMUNE_WARNING =
  "Controlla il POD: il distributore indicato non serve di solito questo comune.";

/** Non-blocking warning, mapped cases only. Unknown distributor or unmapped comune -> null. */
export function podDistributorComuneWarning(pod: string, comuneIstat: string): string | null {
  const d = podDistributor(pod);
  if (!d) return null;
  if (comuneIstat === COMUNE_ROMA && d.name !== "areti") return POD_COMUNE_WARNING;
  if (comuneIstat === COMUNE_MILANO && d.name !== "unareti") return POD_COMUNE_WARNING;
  if (d.name === "areti" && comuneIstat !== COMUNE_ROMA && comuneIstat !== COMUNE_FORMELLO) {
    return POD_COMUNE_WARNING;
  }
  return null;
}
