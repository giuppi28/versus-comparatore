# Checklist go-live — Giuseppe

Dettagli tecnici completi: `app/DEPLOY.md` §10. PDF per Aldo: `docs/consegna/VERSUS_Consegna_Aldo.pdf` (sorgente `.html` accanto).

## A. Prima dell'incontro con Aldo
- [x] Verifica della produzione: un lead completato su https://versus-comparatore.vercel.app con «Richiamami»; richiamo registrato (2026-11-02, lead `b361d409-e2c6-4099-a063-1471444a2f05`).
- [ ] Supabase → Authentication → Sign In / Providers: disattiva "Allow new users to sign up".
- [ ] Supabase → Authentication: attiva "Leaked password protection".
- [ ] Vercel → Settings → Cron Jobs: il keep-alive di Supabase è elencato e ha girato.
- [ ] Controllo del sito a 390 px e su desktop; cookie del lead `HttpOnly; Secure` (DevTools → Application → Cookies).
- [ ] Caricamento di una foto HEIC da iPhone Safari.
- [ ] «Salva il nostro numero» dal telefono: apre la scheda contatto (su desktop scarica un file `.vcf`, è normale).
- [ ] Stampa del PDF per Aldo.

## B. Durante l'incontro (insieme ad Aldo, pagina 5 del PDF)
- [ ] Dominio acquistato: annota registrar e accesso al pannello DNS.
- [ ] Account di Aldo creato in Supabase → Authentication → Users, poi nell'SQL Editor:
  ```sql
  insert into public.admins (user_id) select id from auth.users where email = '<email di Aldo>';
  ```
- [ ] TOTP attivato sul telefono di Aldo.
- [ ] Raccolti: dati aziendali, email privacy, periodo di conservazione, call center esterno, conferma codici POD.
- [ ] Offerte attive con "Prezzo verificato" spuntato; scelte quelle "In evidenza".
- [ ] Decisione su Vercel Pro.

## C. Dopo l'incontro
- [ ] Dati di Aldo a Claude: inserimento in `app/src/lib/legal/company.ts` e `/privacy` (nessun testo tra parentesi quadre deve restare); T13.11 chiuso con i codici POD.
- [ ] Dominio:
  - [ ] Vercel → Settings → Domains: aggiungi il dominio, crea i record DNS dal registrar, attendi "Valid Configuration".
  - [ ] Vercel: `NEXT_PUBLIC_SITE_URL` = `https://<dominio>` e nuovo deploy.
  - [ ] Supabase → Authentication → URL Configuration: Site URL e Redirect URLs sul dominio.
- [ ] Resend:
  - [ ] Dominio di invio verificato (SPF/DKIM, meglio un sottodominio come `mail.<dominio>`).
  - [ ] Vercel: `RESEND_API_KEY` e `RESEND_FROM` impostati, nuovo deploy.
  - [ ] `/admin/impostazioni` → "Invia email di prova": arriva.
- [ ] Email di notifica = quella di Aldo, sia in `/admin/impostazioni` sia in `NOTIFICATION_EMAIL` su Vercel.
- [ ] Numero reale per i richiami in `/admin/impostazioni`.
- [ ] `/admin/impostazioni` mostra "Pronto per la pubblicazione".
- [ ] Lead di prova finale sul dominio: email ad Aldo arrivata, richiamo registrato.
- [ ] Pulizia lead di prova: `859362c5-3670-427c-98e1-0cef27aa95c5`, `3e987e81-8a3d-49b0-a10c-f0c554ee29fe`, `b361d409-e2c6-4099-a063-1471444a2f05`, quelli `TEST-SECURITY` e quelli di prova in produzione.
- [ ] Supabase → Advisors → Security: solo gli avvisi già noti (funzioni SECURITY DEFINER dei lead, `is_admin`).

## D. Decisioni tue
- [ ] Visibilità del repo GitHub (oggi privato).
- [ ] Testo della casella privacy in pagina 1 ("Acconsento…" o "presa visione").
