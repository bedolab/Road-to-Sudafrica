# Road to Sudafrica

Guida di viaggio consultabile per **Sudafrica & eSwatini — Kruger Discovery**, 15–27 agosto 2026, Avventure nel Mondo, 16 partecipanti.

Pagina statica singola, senza build e senza dipendenze esterne: tutto — stile, script e dati — è dentro `index.html`. Si apre anche in locale con un doppio clic, offline.

## Contenuto

| Sezione | Cosa contiene |
|---|---|
| Itinerario | 13 giorni, con notte, struttura, mezzo e dettaglio |
| Voli | andata via Il Cairo, ritorno via Johannesburg |
| Alloggi | 9 voci, prezzi a persona, quali sono prepagati |
| Costi | previsione di cassa, contante vs carta |
| Escursioni | 34 voci filtrabili, in programma / facoltative / solo contanti |
| Info pratiche | documenti, guida, sicurezza, clima, valuta, salute, bagaglio |
| Noleggio auto | vademecum e testo della manleva |

## Fonte dei dati

Tutti i dati provengono dal file `ANM Sudafrica Kruget Discovery 2026 - Proposta viaggio v00.xlsx`
(fogli *Info Utili*, *Piano di viaggio*, *Piano voli*, *Escursioni*, *Previsione Cassa*,
*Vademecum auto a noleggio*). Nessun dato è stato aggiunto o stimato oltre a quanto presente
nel file.

## Aggiornare

I dati sono in strutture JavaScript in fondo a `index.html`: `DAYS` (itinerario), `FL` (voli),
`HOTELS`, `COST` e `CASH` (previsione di cassa), `EXC` (escursioni), `T` (info pratiche),
`AUTO` (noleggio). Si modifica il valore, si committa e Vercel ridistribuisce da solo.

## Deploy

Progetto statico su Vercel. `vercel.json` forza `charset=utf-8` — necessario perché il file
venga letto correttamente anche aprendolo in locale — e imposta `noindex` per tenere la
pagina fuori dai motori di ricerca.
