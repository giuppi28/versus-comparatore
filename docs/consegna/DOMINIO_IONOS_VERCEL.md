# Dominio IONOS → Vercel — checklist

Dominio: **`versuscomparatorelucegas.it`** (IONOS, registrato il 2026-11-04, scade il 2027-11-04: attiva il rinnovo automatico).
Stato al 2026-11-04: nameserver IONOS (`ns1085.ui-dns.com` …); `@` punta ancora al parcheggio IONOS; `www` non ha record; nessun `CAA`. Su Vercel il progetto `versus-comparatore` ha solo `versus-comparatore.vercel.app`.
Storico: dominio nuovo, nessuna copia su Wayback Machine → **nessun vecchio URL da reindirizzare**.

Scelta consigliata per la SEO: **un solo indirizzo canonico `https://versuscomparatorelucegas.it`** (senza www). `www.versuscomparatorelucegas.it` e `versus-comparatore.vercel.app` rimandano lì con redirect permanente.

## 1. Vercel — aggiungi il dominio (prima di toccare IONOS)
- [x] Vercel → progetto `versus-comparatore` → Settings → Domains → Add → `versuscomparatorelucegas.it`, ambiente **Production**. (fatto il 2026-11-04 da Claude Code via Vercel MCP)
- [x] `www.versuscomparatorelucegas.it` aggiunto con redirect 308 verso `versuscomparatorelucegas.it` (2026-11-04).
- [x] Valori raccomandati da Vercel per questo progetto (letti il 2026-11-04; se la schermata di Vercel mostra altro, vale Vercel):
  - `A` `@` → `216.198.79.1` **e** `A` `@` → `64.29.17.1` (due record);
  - `CNAME` `www` → `43d622a61e774c70.vercel-dns-017.com`.

## 2. IONOS — record DNS (Domini e SSL → `versuscomparatorelucegas.it` → DNS)
Fatto da Giuseppe il 2026-11-04 (verificato 19:29 su tutti e 4 i nameserver IONOS e su 8.8.8.8). Nota: i record "Default Site" non hanno il cestino; modificando l'`A` IONOS scollega il sito predefinito e rimuove da solo `AAAA` e `_dep_ws_mutex`.

| Record attuale | Azione | Perché |
|---|---|---|
| `A @ 217.160.0.165` (Default Site) | **Modifica** → `216.198.79.1` | Oggi punta al parcheggio IONOS |
| *(nuovo)* `A @` | **Aggiungi** → `64.29.17.1` | Secondo IP raccomandato da Vercel |
| `AAAA @ 2001:8d8:100f:f000::200` (Default Site) | **Elimina** | Vercel non usa IPv6: chi ha IPv6 finirebbe sul parcheggio IONOS e il certificato può fallire |
| `TXT _dep_ws_mutex` (Default Site) | Elimina (o lascia, è innocuo) | Residuo del sito predefinito IONOS |
| `CNAME _domainconnect` | Lascia | Servizio IONOS, non interferisce |
| `MX @ mx00 / mx01.ionos.it` | Lascia | Posta IONOS (es. `info@versuscomparatorelucegas.it`) |
| `TXT @ v=spf1 include:_spf-eu.ionos.com ~all` | Lascia, **non duplicare** | Un solo SPF sul dominio principale; Resend va su un sottodominio (punto 5) |
| `CNAME _dmarc → dmarc.ionos.it` | Lascia | DMARC della posta |
| `CNAME s1/s2-ionos._domainkey` | Lascia | DKIM della posta IONOS |
| `CNAME autodiscover` | Lascia | Configurazione automatica dei client di posta |
| *(nuovo)* `CNAME www` | **Aggiungi** → `43d622a61e774c70.vercel-dns-017.com` | Oggi `www` non ha record |

- [x] Se IONOS chiede di "scollegare il dominio dal sito predefinito" quando modifichi l'`A`, conferma.
- [x] Se aggiungendo `www` IONOS dice che esiste già: vai in **Sottodomini → www** e lì elimina i suoi `A`/`AAAA`, poi crea il `CNAME` (un `CNAME` non può convivere con altri record sullo stesso nome).
- [x] Nessun record `CAA` (verificato 2026-11-04): il certificato HTTPS di Vercel non è bloccato.
- [ ] TTL: lascia quello di IONOS (1 ora). La propagazione richiede da pochi minuti a qualche ora.

## 3. Verifica
- [x] Vercel → Domains: `versuscomparatorelucegas.it` e `www.versuscomparatorelucegas.it` su **Valid Configuration**, certificato emesso (2026-11-04: emissione automatica non partita dopo 10 min, richiesta a mano via Vercel MCP `issue_cert` → Let's Encrypt, rinnovo automatico).
- [x] `https://versuscomparatorelucegas.it` → 200 (HSTS attivo). `http://` apex, `https://www` e `https://www/<percorso>?query` → un solo 308 verso `https://versuscomparatorelucegas.it/<percorso>?query`. `http://www` fa due salti (→ `https://www` → apex): comportamento standard di Vercel, accettabile.
- [x] Da terminale: `dig +short versuscomparatorelucegas.it A` = `216.198.79.1` e `64.29.17.1`, `dig +short versuscomparatorelucegas.it AAAA` = vuoto, `dig +short www.versuscomparatorelucegas.it CNAME` = `43d622a61e774c70.vercel-dns-017.com.`

## 4. Aggiornamenti dopo il dominio
- [ ] Vercel → Settings → Environment Variables: `NEXT_PUBLIC_SITE_URL` = `https://versuscomparatorelucegas.it` (Production, senza `/` finale) → **Redeploy** (il valore entra nella build).
- [ ] Supabase → Authentication → URL Configuration: Site URL = `https://versuscomparatorelucegas.it`; Redirect URLs = `https://versuscomparatorelucegas.it/**` (tieni anche `https://versus-comparatore.vercel.app/**` finché il redirect del punto 6 non è attivo).
- [ ] `/admin/login` sul nuovo dominio: login + TOTP funzionano.

## 5. Resend (email del nuovo lead ad Aldo) su sottodominio
- [ ] resend.com → Domains → Add → `mail.versuscomparatorelucegas.it`, regione **EU (Ireland)**.
- [ ] Su IONOS aggiungi **esattamente** i record che Resend mostra (di solito: `TXT resend._domainkey.mail`, `MX send.mail`, `TXT send.mail` con `v=spf1 include:amazonses.com ~all`). Non tocca l'SPF della posta IONOS sul dominio principale.
- [ ] Resend: dominio **Verified** → API key "Sending access" limitata a quel dominio.
- [ ] Vercel: `RESEND_API_KEY`, `RESEND_FROM` = `VERSUS <notifiche@mail.versuscomparatorelucegas.it>` → Redeploy.
- [ ] `/admin/impostazioni` → "Invia email di prova": arriva (controlla anche lo spam).

## 6. SEO e GEO — redirect e indicizzazione
Situazione oggi in produzione: niente `robots.txt` (404), niente `sitemap.xml` (404), nessun `canonical`/`metadataBase`, nessuna immagine social, nessun dato strutturato; `/offerte` e `/grazie` sono indicizzabili (sono pagine personali del flusso). Lavoro di codice da fare **dopo** che il dominio è attivo:
- [ ] Redirect 308 `versus-comparatore.vercel.app/*` → `https://versuscomparatorelucegas.it/*` (solo quell'host esatto; le preview restano com'erano). Evita due copie del sito su Google.
- [ ] `metadataBase` + `canonical` su ogni pagina pubblica, dal valore di `NEXT_PUBLIC_SITE_URL`.
- [ ] `robots.txt` (blocca `/admin`, `/api`, `/attivazione`, `/offerte`, `/grazie`) e `sitemap.xml` (home; `/privacy` resta `noindex` come deciso).
- [ ] `noindex` su `/offerte` e `/grazie`.
- [ ] Immagine social (Open Graph 1200×630) e titolo/descrizione per condivisioni WhatsApp/Facebook.
- [ ] JSON-LD `Organization` + `WebSite` (+ `FAQPage` per le FAQ della home) quando ci sono i dati aziendali di Aldo (`company.ts`).
- [ ] `llms.txt` per gli assistenti AI (cosa fa VERSUS, per chi, come funziona, chi è il titolare).
- [ ] Google Search Console: proprietà **Dominio** verificata con record `TXT @` su IONOS (convive con l'SPF), invio della sitemap. Stesso per Bing Webmaster Tools (importa da Search Console).
- [x] Storico del dominio: registrato il 2026-11-04, nessuna copia su Wayback Machine → nessun redirect 301 da vecchi URL.
