# Dominio IONOS → Vercel — checklist

Stato al 2026-11-04: dominio acquistato su IONOS; su Vercel il progetto `versus-comparatore` ha solo `versus-comparatore.vercel.app` (nessun dominio personalizzato). `<dominio>` = il nome acquistato (es. `versus-energia.it`).

Scelta consigliata per la SEO: **un solo indirizzo canonico `https://<dominio>`** (senza www). `www.<dominio>` e `versus-comparatore.vercel.app` rimandano lì con redirect permanente.

## 1. Vercel — aggiungi il dominio (prima di toccare IONOS)
- [ ] Vercel → progetto `versus-comparatore` → Settings → Domains → Add → `<dominio>`, ambiente **Production**.
- [ ] Alla domanda sul www scegli **"Add www.<dominio> and redirect it to <dominio>"** (redirect 308).
- [ ] Annota i record che Vercel mostra (servono al punto 2):
  - `A` per `@` (di solito `216.198.79.1`; `76.76.21.21` è il valore storico, funziona ancora);
  - `CNAME` per `www` (es. `xxxx.vercel-dns-0xx.com` oppure `cname.vercel-dns.com`).
  - Usa **esattamente** i valori di Vercel, non quelli di esempio.

## 2. IONOS — record DNS (Domini e SSL → `<dominio>` → DNS)

| Record attuale | Azione | Perché |
|---|---|---|
| `A @ 217.160.0.165` (Default Site) | **Modifica** → valore `A` di Vercel | Oggi punta al parcheggio IONOS |
| `AAAA @ 2001:8d8:100f:f000::200` (Default Site) | **Elimina** | Vercel non usa IPv6: chi ha IPv6 finirebbe sul parcheggio IONOS e il certificato può fallire |
| `TXT _dep_ws_mutex` (Default Site) | Elimina (o lascia, è innocuo) | Residuo del sito predefinito IONOS |
| `CNAME _domainconnect` | Lascia | Servizio IONOS, non interferisce |
| `MX @ mx00 / mx01.ionos.it` | Lascia | Posta IONOS (es. `info@<dominio>`) |
| `TXT @ v=spf1 include:_spf-eu.ionos.com ~all` | Lascia, **non duplicare** | Un solo SPF sul dominio principale; Resend va su un sottodominio (punto 5) |
| `CNAME _dmarc → dmarc.ionos.it` | Lascia | DMARC della posta |
| `CNAME s1/s2-ionos._domainkey` | Lascia | DKIM della posta IONOS |
| `CNAME autodiscover` | Lascia | Configurazione automatica dei client di posta |
| *(nuovo)* `CNAME www` | **Aggiungi** → valore `CNAME` di Vercel | Nella lista non c'è `www` |

- [ ] Se IONOS chiede di "scollegare il dominio dal sito predefinito" quando modifichi l'`A`, conferma.
- [ ] Se aggiungendo `www` IONOS dice che esiste già: vai in **Sottodomini → www** e lì elimina i suoi `A`/`AAAA`, poi crea il `CNAME` (un `CNAME` non può convivere con altri record sullo stesso nome).
- [ ] Controlla che non ci siano record `CAA` che escludono `letsencrypt.org` (Vercel usa Let's Encrypt per l'HTTPS). Se la lista ne ha, mandami uno screen.
- [ ] TTL: lascia quello di IONOS (1 ora). La propagazione richiede da pochi minuti a qualche ora.

## 3. Verifica
- [ ] Vercel → Domains: `<dominio>` e `www.<dominio>` su **Valid Configuration**, certificato emesso.
- [ ] `https://<dominio>` apre il sito; `http://<dominio>`, `https://www.<dominio>` e `http://www.<dominio>` finiscono su `https://<dominio>` con **un solo** redirect 308.
- [ ] Da terminale: `dig +short <dominio> A` = IP di Vercel, `dig +short <dominio> AAAA` = vuoto.

## 4. Aggiornamenti dopo il dominio
- [ ] Vercel → Settings → Environment Variables: `NEXT_PUBLIC_SITE_URL` = `https://<dominio>` (Production, senza `/` finale) → **Redeploy** (il valore entra nella build).
- [ ] Supabase → Authentication → URL Configuration: Site URL = `https://<dominio>`; Redirect URLs = `https://<dominio>/**` (tieni anche `https://versus-comparatore.vercel.app/**` finché il redirect del punto 6 non è attivo).
- [ ] `/admin/login` sul nuovo dominio: login + TOTP funzionano.

## 5. Resend (email del nuovo lead ad Aldo) su sottodominio
- [ ] resend.com → Domains → Add → `mail.<dominio>`, regione **EU (Ireland)**.
- [ ] Su IONOS aggiungi **esattamente** i record che Resend mostra (di solito: `TXT resend._domainkey.mail`, `MX send.mail`, `TXT send.mail` con `v=spf1 include:amazonses.com ~all`). Non tocca l'SPF della posta IONOS sul dominio principale.
- [ ] Resend: dominio **Verified** → API key "Sending access" limitata a quel dominio.
- [ ] Vercel: `RESEND_API_KEY`, `RESEND_FROM` = `VERSUS <notifiche@mail.<dominio>>` → Redeploy.
- [ ] `/admin/impostazioni` → "Invia email di prova": arriva (controlla anche lo spam).

## 6. SEO e GEO — redirect e indicizzazione
Situazione oggi in produzione: niente `robots.txt` (404), niente `sitemap.xml` (404), nessun `canonical`/`metadataBase`, nessuna immagine social, nessun dato strutturato; `/offerte` e `/grazie` sono indicizzabili (sono pagine personali del flusso). Lavoro di codice da fare **dopo** che il dominio è attivo:
- [ ] Redirect 308 `versus-comparatore.vercel.app/*` → `https://<dominio>/*` (solo quell'host esatto; le preview restano com'erano). Evita due copie del sito su Google.
- [ ] `metadataBase` + `canonical` su ogni pagina pubblica, dal valore di `NEXT_PUBLIC_SITE_URL`.
- [ ] `robots.txt` (blocca `/admin`, `/api`, `/attivazione`, `/offerte`, `/grazie`) e `sitemap.xml` (home; `/privacy` resta `noindex` come deciso).
- [ ] `noindex` su `/offerte` e `/grazie`.
- [ ] Immagine social (Open Graph 1200×630) e titolo/descrizione per condivisioni WhatsApp/Facebook.
- [ ] JSON-LD `Organization` + `WebSite` (+ `FAQPage` per le FAQ della home) quando ci sono i dati aziendali di Aldo (`company.ts`).
- [ ] `llms.txt` per gli assistenti AI (cosa fa VERSUS, per chi, come funziona, chi è il titolare).
- [ ] Google Search Console: proprietà **Dominio** verificata con record `TXT @` su IONOS (convive con l'SPF), invio della sitemap. Stesso per Bing Webmaster Tools (importa da Search Console).
- [ ] Storico del dominio: controllare su Wayback Machine e con `site:<dominio>` se il nome aveva un sito prima. Se esistono vecchi URL con link in ingresso → redirect 301 alla pagina più vicina; altrimenti 410.
