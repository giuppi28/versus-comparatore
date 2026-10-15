/**
 * MOCK data. Used while NEXT_PUBLIC_DATA_SOURCE=mock.
 * - Suppliers: PRD §6 Block E dropdown list (+ special options).
 * - Offers: the 8 test offers of TASKS.md T1.4 (invented names, price_verified = false).
 * - Comuni: a SMALL SAMPLE (not the full ISTAT dataset) covering climate zones A-F (+ one comune with an unknown zone, null).
 */
import type { Comune, Offer, Supplier } from "../types";

function supplier(
  slug: string,
  name: string,
  sort_order: number,
  opts: { sells_luce?: boolean; sells_gas?: boolean } = {},
): Supplier {
  return {
    id: slug,
    name,
    slug,
    logo_path: null,
    sells_luce: opts.sells_luce ?? true,
    sells_gas: opts.sells_gas ?? true,
    show_in_dropdown: true,
    sort_order,
    active: true,
  };
}

export const MOCK_SUPPLIERS: Supplier[] = [
  supplier("enel-energia", "Enel Energia", 1),
  supplier("eni-plenitude", "Eni Plenitude", 2),
  supplier("edison-energia", "Edison Energia", 3),
  supplier("a2a-energia", "A2A Energia", 4),
  supplier("hera-comm", "Hera Comm", 5),
  supplier("iren", "Iren", 6),
  supplier("acea-energia", "Acea Energia", 7),
  supplier("sorgenia", "Sorgenia", 8),
  supplier("engie", "Engie", 9),
  supplier("eon-energia", "E.ON Energia", 10),
  supplier("iberdrola", "Iberdrola", 11),
  // Special dropdown options: no offers, never excluded from results.
  supplier("tutela", "Servizio di Tutela / Tutele Graduali", 100),
  supplier("altro-fornitore", "Altro fornitore", 101),
  supplier("non-lo-so", "Non lo so", 102),
];

const MOCK_UPDATED_AT = "2026-10-15T00:00:00.000Z";

interface OfferSpec {
  supplier: string;
  name: string;
  commodity: "luce" | "gas";
  price: number;
  fee: number;
  months: number;
  featured: boolean;
  promo: string | null;
}

function offer(spec: OfferSpec): Offer {
  const advantages = [
    `Prezzo **bloccato** ${spec.months} mesi`,
    "Tariffa **monoraria**",
    ...(spec.promo ? [spec.promo] : []),
    "Attivala **online** con noi, **gratis** e in **1 minuto**",
    "Puoi **revocare** il contratto entro 14 giorni",
  ];
  return {
    id: `offer-${spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    supplier_id: spec.supplier,
    name: spec.name,
    commodity: spec.commodity,
    customer_type: "both",
    price_type: "fixed",
    energy_price: spec.price,
    other_variable_costs: spec.commodity === "luce" ? 0.06 : 0.26,
    fixed_fee_monthly: spec.fee,
    other_fixed_costs_monthly: 0,
    locked_months: spec.months,
    activation_cost: 0,
    promo_text: spec.promo,
    advantages,
    details: null,
    featured: spec.featured,
    active: true,
    price_verified: false,
    updated_at: MOCK_UPDATED_AT,
  };
}

export const MOCK_OFFERS: Offer[] = [
  offer({ supplier: "edison-energia", name: "Edison Luce Fissa 12", commodity: "luce", price: 0.129, fee: 9, months: 12, featured: true, promo: "Fino a 60€ di sconto il primo anno" }),
  offer({ supplier: "sorgenia", name: "Sorgenia Luce Sicura 24", commodity: "luce", price: 0.135, fee: 8, months: 24, featured: false, promo: null }),
  offer({ supplier: "a2a-energia", name: "A2A Luce Smart", commodity: "luce", price: 0.125, fee: 12, months: 12, featured: false, promo: null }),
  offer({ supplier: "iberdrola", name: "Iberdrola Luce Stabile", commodity: "luce", price: 0.139, fee: 7.5, months: 12, featured: false, promo: null }),
  offer({ supplier: "eni-plenitude", name: "Plenitude Gas Fisso 12", commodity: "gas", price: 0.49, fee: 9, months: 12, featured: true, promo: "Fino a 50€ di sconto il primo anno" }),
  offer({ supplier: "hera-comm", name: "Hera Gas Sereno", commodity: "gas", price: 0.51, fee: 8, months: 24, featured: false, promo: null }),
  offer({ supplier: "engie", name: "Engie Gas Facile", commodity: "gas", price: 0.475, fee: 11, months: 12, featured: false, promo: null }),
  offer({ supplier: "iren", name: "Iren Gas Chiaro", commodity: "gas", price: 0.52, fee: 7, months: 12, featured: false, promo: null }),
];

function comune(
  istat_code: string,
  name: string,
  province_code: string,
  province_name: string,
  region: string,
  caps: string[],
  climate_zone: Comune["climate_zone"],
): Comune {
  return { istat_code, name, province_code, province_name, region, caps, climate_zone };
}

/** Small sample of real comuni (ISTAT codes) across climate zones A-F. */
export const MOCK_COMUNI: Comune[] = [
  comune("084020", "Lampedusa e Linosa", "AG", "Agrigento", "Sicilia", ["92010"], "A"),
  comune("080063", "Reggio di Calabria", "RC", "Reggio di Calabria", "Calabria", ["89121", "89122", "89123", "89124", "89125", "89126", "89127", "89128", "89129", "89131", "89132", "89133", "89134", "89135"], "B"),
  comune("082053", "Palermo", "PA", "Palermo", "Sicilia", ["90121", "90122", "90123", "90124", "90125", "90126", "90127", "90128", "90129", "90131"], "B"),
  comune("087015", "Catania", "CT", "Catania", "Sicilia", ["95121", "95122", "95123", "95124", "95125", "95126", "95127", "95128", "95129", "95131"], "B"),
  comune("063049", "Napoli", "NA", "Napoli", "Campania", ["80121", "80122", "80123", "80124", "80125", "80126", "80127", "80128", "80129", "80131"], "C"),
  comune("072006", "Bari", "BA", "Bari", "Puglia", ["70121", "70122", "70123", "70124", "70125", "70126", "70127", "70128", "70129", "70131"], "C"),
  comune("092009", "Cagliari", "CA", "Cagliari", "Sardegna", ["09121", "09122", "09123", "09124", "09125", "09126", "09127", "09128", "09129", "09131"], "C"),
  comune("058091", "Roma", "RM", "Roma", "Lazio", ["00118", "00119", "00120", "00121", "00122", "00123", "00124", "00125", "00126", "00127"], "D"),
  comune("048017", "Firenze", "FI", "Firenze", "Toscana", ["50121", "50122", "50123", "50124", "50125", "50126", "50127", "50128", "50129", "50131"], "D"),
  comune("010025", "Genova", "GE", "Genova", "Liguria", ["16121", "16122", "16123", "16124", "16125", "16126", "16127", "16128", "16129", "16131"], "D"),
  comune("015146", "Milano", "MI", "Milano", "Lombardia", ["20121", "20122", "20123", "20124", "20125", "20126", "20127", "20128", "20129", "20131"], "E"),
  comune("001272", "Torino", "TO", "Torino", "Piemonte", ["10121", "10122", "10123", "10124", "10125", "10126", "10127", "10128", "10129", "10131"], "E"),
  comune("037006", "Bologna", "BO", "Bologna", "Emilia-Romagna", ["40121", "40122", "40123", "40124", "40125", "40126", "40127", "40128", "40129", "40131"], "E"),
  comune("027042", "Venezia", "VE", "Venezia", "Veneto", ["30121", "30122", "30123", "30124", "30125", "30126", "30131", "30132", "30133", "30135"], "E"),
  comune("023091", "Verona", "VR", "Verona", "Veneto", ["37121", "37122", "37123", "37124", "37125", "37126", "37127", "37128", "37129", "37131"], "E"),
  comune("022205", "Trento", "TN", "Trento", "Trentino-Alto Adige", ["38121", "38122", "38123"], "E"),
  comune("040012", "Forlì", "FC", "Forlì-Cesena", "Emilia-Romagna", ["47121", "47122", "47123"], "E"),
  comune("066049", "L'Aquila", "AQ", "L'Aquila", "Abruzzo", ["67100"], "E"),
  comune("035033", "Reggio nell'Emilia", "RE", "Reggio nell'Emilia", "Emilia-Romagna", ["42121", "42122", "42123", "42124"], "E"),
  comune("025006", "Belluno", "BL", "Belluno", "Veneto", ["32100"], "F"),
  comune("025016", "Cortina d'Ampezzo", "BL", "Belluno", "Veneto", ["32043"], "F"),
  // Zone unknown in the DB dataset (merger of comuni in different zones): exercises the UI fallback.
  comune("025074", "Borgo Valbelluna", "BL", "Belluno", "Veneto", ["32026"], null),
  comune("007003", "Aosta", "AO", "Aosta", "Valle d'Aosta", ["11100"], "E"),
  comune("021008", "Bolzano", "BZ", "Bolzano", "Trentino-Alto Adige", ["39100"], "E"),
];
