# Checklist go-live — Giuseppe

Dettagli tecnici completi: `app/DEPLOY.md` §10. PDF per Aldo: `docs/consegna/VERSUS_Consegna_Aldo.pdf` (sorgente `.html` accanto).

## A. Prima dell'incontro con Aldo
- [x] Verifica della produzione: un lead completato su https://versus-comparatore.vercel.app con «Richiamami»; richiamo registrato (2026-11-02, lead `b361d409-e2c6-4099-a063-1471444a2f05`).
- [x] Supabase → Authentication → Sign In / Providers: disattiva "Allow new users to sign up" (verificato 2026-11-02: `disable_signup = true`, provider email attivo).
- [~] Supabase → Authentication: "Leaked password protection" — non disponibile sul piano Free (solo Pro, verificato 2026-11-02). Compensare con password lunga e unica per Aldo + TOTP obbligatorio. L'avviso resta negli Advisors.
- [x] Vercel → Settings → Cron Jobs: il keep-alive di Supabase è elencato e ha girato (verificato dai log Supabase: 2026-11-02 04:58 UTC, GET comuni 200).
- [x] Controllo del sito a 390 px e su desktop; cookie del lead `HttpOnly; Secure` (verificato 2026-11-02 in produzione: cookie invisibili a JS con lead attivo, `secure` attivo con NODE_ENV=production; home e /privacy a 375 px senza scroll orizzontale; risultati e passo B a 375 px verificati in locale).
- [x] Caricamento di una foto HEIC da iPhone Safari (verificato 2026-11-03: lead `29760ea3-c0ac-4d7d-8927-ea985bbd65aa`, documento salvato come `.jpg` `image/jpeg`, 409 KB; i dati del documento non vengono letti dalla foto, è previsto: solo la bolletta PDF viene letta).
- [x] «Salva il nostro numero» dal telefono: apre la scheda contatto (su desktop scarica un file `.vcf`, è normale) (verificato da Giuseppe 2026-11-03).
- [x] Stampa del PDF per Aldo (2026-11-03; PDF allineato al sorgente .html).

## B. Durante l'incontro (insieme ad Aldo, pagina 5 del PDF)
- [x] Dominio acquistato su IONOS (2026-11-04).
- [ ] Account di Aldo creato in Supabase → Authentication → Users, poi nell'SQL Editor:
  ```sql
  insert into public.admins (user_id) select id from auth.users where email = '<email di Aldo>';
  ```
- [ ] TOTP attivato sul telefono di Aldo.
- [ ] Raccolti: dati aziendali, email privacy, periodo di conservazione, call center esterno, conferma codici POD.
- [ ] Offerte attive con "Prezzo verificato" spuntato; scelte quelle "In evidenza".
- [ ] Decisione su Vercel Pro.

## C. Dopo l'incontro
- [x] Dati di KEHILA S.r.l.s. in `app/src/lib/legal/company.ts` e `/privacy`, nessun testo tra parentesi quadre (2026-11-04). T13.11 resta aperto: codici POD da aggiornare più avanti con i lead reali.
- [x] Dominio (passo passo: `docs/consegna/DOMINIO_IONOS_VERCEL.md`):
  - [x] Vercel → Settings → Domains: aggiungi il dominio, crea i record DNS dal registrar, attendi "Valid Configuration".
  - [x] Vercel: `NEXT_PUBLIC_SITE_URL` = `https://<dominio>` e nuovo deploy.
  - [x] Supabase → Authentication → URL Configuration: Site URL e Redirect URLs sul dominio (confermato da Giuseppe, non visibile a Claude; login sul dominio funzionante).
- [x] Resend:
  - [x] Dominio di invio verificato (SPF/DKIM) sul dominio principale (decisione T16.3).
  - [x] Vercel: `RESEND_API_KEY` e `RESEND_FROM` impostati, nuovo deploy.
  - [x] `/admin/impostazioni` → "Invia email di prova": arriva (Giuseppe, 2026-11-04).
- [x] Email di notifica = `info@versuscomparatorelucegas.it`, sia in `/admin/impostazioni` sia in `NOTIFICATION_EMAIL` su Vercel.
- [ ] Numero reale per i richiami in `/admin/impostazioni`.
- [ ] `/admin/impostazioni` mostra "Pronto per la pubblicazione".
- [x] Lead di prova finale sul dominio: email arrivata su info@ (Giuseppe), richiamo registrato (`8a9589a7-b946-4b5b-a50d-70d89aacf0e7`, 2026-11-04).
- [ ] Pulizia lead di prova: il 2026-11-04 nel database c'è solo `8a9589a7-b946-4b5b-a50d-70d89aacf0e7` e nessun file in archivio: eliminarlo da `/admin/leads`.
- [x] Supabase → Advisors → Security: solo gli avvisi già noti (funzioni SECURITY DEFINER dei lead, `is_admin`, `app_secrets`, password compromesse) (2026-11-04).

## D. Decisioni tue
- [ ] Visibilità del repo GitHub (oggi privato).
- [ ] Testo della casella privacy in pagina 1 ("Acconsento…" o "presa visione").
