# Documentatie proiect - PulseGuard AI

Data documentatiei: 18 mai 2026  
Proiect: PulseGuard AI  
Tip aplicatie: dashboard web pentru inteligenta operationala in spitale

## 1. Rezumat scurt

PulseGuard AI este o aplicatie web care ajuta echipele operationale din spitale sa monitorizeze riscul de epuizare al personalului medical, sa vada prognoze pe 14 zile, sa simuleze interventii si sa genereze rapoarte operationale asistate de AI.

Aplicatia este gandita ca un centru de comanda pentru manageri, medici coordonatori si asistenti sefi. Nu este un instrument de diagnostic medical. Scopul ei este suport decizional operational: ture, personal, ore suplimentare, grad de ocupare, presiune pe echipe si actiuni de reducere a riscului.

Pe scurt, proiectul face urmatoarele:

- afiseaza KPI-uri despre risc de epuizare, risc estimat, presiune pe personal si urgenta interventiei;
- genereaza scenarii din text scris natural de utilizator;
- poate folosi Azure AI Foundry / endpoint OpenAI-compatible pentru raspunsuri AI;
- are fallback local daca agentul AI nu este configurat;
- afiseaza grafice istorice si prognoze;
- simuleaza scenarii de interventie;
- genereaza rapoarte operationale;
- exporta raport PDF;
- are centru de alerte si actiuni recomandate;
- include configuratie pentru deploy pe Google Cloud Run.

## 2. Problema pe care o rezolva

In spitale, presiunea pe personal creste din combinatii de factori: volum mare de pacienti, ture de noapte, deficit de personal, concedii medicale, ore suplimentare si stres operational. Aceste semnale sunt de obicei imprastiate in sisteme diferite si sunt observate tarziu.

PulseGuard AI aduce aceste semnale intr-un singur dashboard si le transforma in:

- scoruri de risc usor de citit;
- prognoze pe urmatoarele zile;
- recomandari concrete de personal;
- comparatii intre planul actual si planul recomandat;
- rapoarte care pot fi distribuite.

## 3. Tehnologii folosite

Frontend:

- React 19;
- TypeScript;
- Vite 7;
- TanStack Router si TanStack Start;
- TanStack React Query;
- Tailwind CSS v4;
- componente UI bazate pe Radix UI / shadcn-style;
- Recharts pentru grafice;
- lucide-react pentru iconuri;
- Sonner pentru toast notifications;
- jsPDF pentru export PDF.

Backend / server runtime:

- TanStack Start server entry;
- endpoint custom in `src/server.ts`;
- Node.js 22 pentru Cloud Run;
- wrapper custom `scripts/cloud-run-server.mjs`.

AI:

- endpoint `/api/generate-scenario`;
- suport pentru Azure AI Foundry sau alt endpoint compatibil OpenAI chat completions;
- variabile de mediu: `FOUNDRY_ENDPOINT`, `FOUNDRY_API_KEY`, `FOUNDRY_MODEL`, `FOUNDRY_DEPLOYMENT`;
- fallback local bazat pe reguli daca AI-ul extern nu este disponibil.

Deployment:

- Dockerfile;
- Google Cloud Run;
- Cloud Build;
- script `deploy.sh`;
- configuratie optionala Cloudflare Workers prin `wrangler.jsonc`.

## 4. Structura proiectului

Fisiere importante:

- `src/routes`: paginile aplicatiei, folosind file-based routing;
- `src/components/pulse`: componentele specifice aplicatiei PulseGuard;
- `src/components/ui`: componente UI generice;
- `src/lib/pulse/data.ts`: date legacy/mock folosite in multe pagini;
- `src/lib/pulse/services`: strat de servicii backend-ready, cu tipuri si mock API;
- `src/lib/pulse/scenario-context.tsx`: logica pentru scenarii generate si scenariul activ;
- `src/lib/pulse/profile.tsx`: profil, unitate medicala, coordonator si tema;
- `src/lib/pulse/export-pdf.ts`: export PDF cu jsPDF;
- `src/server.ts`: server wrapper, endpoint AI, health check, CORS, fallback error page;
- `scripts/cloud-run-server.mjs`: server Node pentru Cloud Run;
- `Dockerfile`, `cloudbuild.yaml`, `deploy.sh`: fisiere de deployment.

## 5. Arhitectura aplicatiei

Aplicatia are trei zone principale:

1. UI si pagini

Fiecare pagina este definita in `src/routes`. TanStack Router genereaza rutele, iar fiecare pagina este afisata in interiorul `AppShell`.

2. Context global

In `src/routes/__root.tsx`, aplicatia este impachetata in:

- `QueryClientProvider`;
- `ProfilProvider`;
- `ActiveScenarioProvider`;
- `RouteSplash`;
- `Toaster`.

Acest lucru permite acces global la profil, tema, scenariu activ si notificari.

3. Server si AI

`src/server.ts` intercepteaza requesturile catre:

- `/health`;
- `/api/generate-scenario`;
- `OPTIONS` pentru CORS.

Daca ruta nu este una custom, requestul este trimis catre handlerul TanStack Start.

## 6. Paginile implementate

### 6.1 Panou principal - `/`

Pagina principala afiseaza un rezumat operational:

- salut personalizat pentru coordonator;
- unitatea medicala monitorizata;
- KPI-uri:
  - risc curent epuizare;
  - risc estimat pe 14 zile;
  - indice presiune personal;
  - urgenta interventie;
- generator GenAI;
- panou de raport AI.

Daca exista un scenariu activ, KPI-urile se actualizeaza pe baza acelui scenariu.

### 6.2 Prognoza AI - `/forecast`

Afiseaza prognoza pe 14 zile:

- grafic pentru risc de epuizare si presiune de lucru;
- grafic de descompunere a riscului;
- eticheta modelului `Pulse-v2.4`;
- incredere afisata in UI.

Datele sunt mock/deterministe, generate local.

### 6.3 Simulator Scenarii - `/simulator`

Este una dintre cele mai importante parti ale proiectului. Permite testarea unor interventii operationale:

- selectarea unitatii medicale;
- orizont de prognoza: 7, 14 sau 30 zile;
- adaugare personal temporar;
- reducere ore suplimentare;
- redistribuire tura de noapte;
- buffer de recuperare dupa ture intense;
- numar maxim de ture consecutive;
- ipoteza de crestere a pacientilor.

Rezultatele afisate:

- risc inainte;
- risc dupa interventie;
- reducere estimata;
- incredere;
- impact cost;
- fezabilitate operationala;
- grafic inainte vs dupa;
- impact pe fiecare factor de risc;
- recomandare AI.

Actiunile `Salveaza` si `Aplica la Raport` afiseaza toasturi si navigheaza catre raport, dar nu salveaza inca intr-un backend real.

### 6.4 Alerte Epuizare - `/alerts`

Afiseaza alerte operationale:

- alerte critice;
- avertizari;
- informari;
- departamentul afectat;
- detalii;
- timpul alertei;
- butoane de tip `Marcheaza citit` si `Verifica`.

Datele sunt mock.

### 6.5 Rapoarte - `/reports`

Biblioteca de rapoarte generate pentru fiecare departament:

- card pentru fiecare unitate;
- scor de risc;
- nivel risc;
- link catre raportul detaliat.

### 6.6 Raport Prognoza - `/forecast-report`

Pagina de raport complet:

- rezumat executiv AI;
- metadate: unitate, coordonator, data generarii, orizont, incredere;
- scor risc;
- semnale istorice;
- prognoza pe 14 zile;
- factori principali de risc;
- actiuni operationale recomandate;
- indicatori de urmarit;
- comparatie plan curent vs plan recomandat;
- export PDF;
- distribuire raport;
- salvare scenariu.

Daca exista scenariu activ, raportul foloseste datele acelui scenariu.

### 6.7 Generator Scenarii GenAI - `/generator`

Pagina dedicata agentului conversational:

- utilizatorul scrie natural o situatie din spital;
- agentul raspunde conversational;
- daca are suficiente date, genereaza scenariu;
- daca lipsesc date, cere informatii;
- scenariul poate fi aplicat in panou;
- scenariul poate genera raport.

Exemple de informatii pe care agentul le foloseste:

- sectia;
- numar pacienti;
- numar medici/asistente;
- grad de ocupare;
- ture de noapte;
- ore suplimentare;
- concedii medicale;
- deficit de personal;
- nivel de stres.

### 6.8 Exemple Pregenerate - `/examples`

Biblioteca de scenarii exemplu:

- scenarii ATI, UPU, Chirurgie, Pediatrie, Oncologie, Weekend;
- filtrare dupa tag;
- cautare text;
- mini-grafic pentru fiecare scenariu;
- actiune recomandata;
- buton de incarcare scenariu;
- buton de previzualizare raport.

Observatie importanta: momentan pagina scrie un scenariu simplificat in `localStorage`, dar providerul de scenariu activ nu il citeste inapoi. Din cauza asta, fluxul de incarcare scenariu din exemple poate sa nu actualizeze efectiv panoul asa cum promite UI-ul.

### 6.9 Incarcare Personal - `/staff-load`

Afiseaza carduri pentru departamente:

- risc de epuizare;
- indice oboseala;
- volum de lucru;
- risc de deficit;
- numar angajati;
- ocupare;
- trend.

### 6.10 Tendinte Risc - `/risk-trends`

Afiseaza:

- volum de lucru si ore suplimentare pe ultimele 30 zile;
- oboseala, deficit si urgenta interventie.

### 6.11 Planificator Interventii - `/intervention-planner`

Afiseaza lista de recomandari:

- titlu interventie;
- detalii;
- departament;
- ETA;
- impact;
- butoane `Aproba` si `Amana`.

Actiunile sunt demo, afiseaza UI dar nu trimit date catre un backend.

### 6.12 Setari - `/settings`

Contine sectiuni de configurare:

- organizatie;
- preferinte notificari;
- confidentialitate si conformitate;
- integrari si chei API.

Momentan acestea sunt carduri UI, fara functionalitate backend reala.

## 7. Componente importante

### `AppShell`

Layout-ul principal al aplicatiei:

- top navigation;
- sidebar;
- logo PulseGuard;
- meniu profil;
- action bar;
- context strip;
- fundal animat;
- zona principala pentru continut.

Include navigatie catre toate paginile principale.

### `ActionBar`

Bara de actiuni din header:

- `Ruleaza Prognoza`;
- comparatie scenarii;
- centru de alerte;
- export raport.

Ruleaza animatii, afiseaza toasturi si deschide modaluri/drawere.

### `GenAIScenarioGenerator`

Componenta conversationala:

- text input;
- chips rapide;
- exemple;
- pasi de generare;
- chat thread;
- panel de rezultat;
- aplicare scenariu;
- generare raport.

Comunica cu `/api/generate-scenario`.

### `ReportPanel`

Panou compact de raport:

- serii de intrare;
- prognoza;
- explicatie AI;
- actiuni recomandate;
- export PDF;
- share;
- salvare.

### `Charts`

Componente de grafice:

- `ForecastChart`;
- `MultiForecastChart`;
- `InputsChart`;
- `SignalsChart`.

Folosesc Recharts.

## 8. Cum functioneaza generatorul AI

Fluxul este:

1. Utilizatorul scrie un prompt.
2. Frontend-ul face POST catre `/api/generate-scenario`.
3. Serverul incearca sa foloseasca Foundry daca variabilele de mediu sunt setate.
4. Daca Foundry nu raspunde sau nu este configurat, foloseste fallback local.
5. Serverul decide intentia:
   - `chat`;
   - `needs_details`;
   - `scenario`.
6. Daca este `scenario`, se genereaza un obiect de scenariu.
7. UI-ul afiseaza scoruri, factori, recomandari si explicatii.
8. Utilizatorul poate aplica scenariul in panou sau genera raport.

Endpoint:

`POST /api/generate-scenario`

Body:

```json
{
  "prompt": "Descrierea situatiei din spital"
}
```

Raspuns posibil:

```json
{
  "ok": true,
  "source": "foundry",
  "mode": "scenario",
  "message": "Am suficiente date ca sa generez scenariul.",
  "scenario": {}
}
```

## 9. Datele folosite

Momentan proiectul foloseste date mock si generatoare deterministe:

- departamente mock;
- alerte mock;
- recomandari mock;
- rapoarte mock;
- serii temporale generate local;
- prognoze generate local;
- scenarii generate prin reguli.

Exista doua straturi de date:

1. `src/lib/pulse/data.ts`

Strat legacy folosit in multe pagini. Contine date mock si functii precum `buildSeries`, `buildForecast`, `riskBand`.

2. `src/lib/pulse/services`

Strat mai nou si mai curat, gandit ca single source of truth:

- `types.ts`;
- `api.ts`;
- `departments.ts`;
- `forecast.ts`;
- `timeseries.ts`;
- `preferences.ts`;
- `reports.ts`;
- `alerts.ts`.

`api.ts` este pregatit ca fatada pentru backend real. Ideea buna aici este ca in viitor se pot inlocui mock-urile cu fetch-uri reale fara sa se rescrie toata interfata.

Problema actuala: nu toate paginile folosesc inca `api.ts`; multe importa direct din `data.ts`.

## 10. Persistenta implementata

Persistenta reala este limitata:

- unitatea medicala selectata se salveaza in `localStorage`;
- coordonatorul selectat se salveaza in `localStorage`;
- tema se salveaza in `localStorage`;
- pagina de exemple scrie un scenariu in `localStorage`, dar scenariul nu este rehidratat complet in provider;
- salvarile de scenariu/raport sunt in mare parte toasturi demo.

Nu exista inca:

- baza de date;
- autentificare;
- salvare reala rapoarte;
- istoric real de scenarii;
- audit log;
- integrare EHR / HR / scheduling.

## 11. Export PDF

Exportul PDF este implementat cu `jsPDF` in `src/lib/pulse/export-pdf.ts`.

Ce face:

- creeaza un PDF A4;
- pune titlu PulseGuard AI;
- include unitatea si coordonatorul;
- include scor risc;
- deseneaza un grafic simplificat;
- adauga rezumat operational;
- adauga interventii recomandate;
- adauga disclaimer.

Limitare: PDF-ul foloseste partial date statice pentru grafic si recomandari. Ar trebui extins ca sa exporte exact graficul si recomandarile curente din scenariul activ.

## 12. Deployment

Proiectul este pregatit pentru Google Cloud Run.

Fisiere:

- `Dockerfile`;
- `cloudbuild.yaml`;
- `deploy.sh`;
- `README_DEPLOY.md`;
- `scripts/cloud-run-server.mjs`;
- `.env.example`.

Comenzi importante:

```bash
npm run dev
npm run build
npm run start:cloudrun
npm run lint
```

Setari Cloud Run:

- Node 22;
- port 8080;
- o singura aplicatie/container pentru frontend SSR si API;
- scale to zero;
- 512 Mi memorie in exemplu;
- 1 vCPU in exemplu.

Endpoint de verificare:

```text
/health
```

Verificare locala efectuata:

- `npm run build` a trecut;
- serverul construit a raspuns corect la `/health`;
- raspuns health: `{"ok":true,"service":"pulseguard","timestamp":"..."}`.

## 13. Probleme gasite la verificare

### 13.1 Build-ul trece, dar TypeScript strict pica

Comanda:

```bash
npx tsc --noEmit
```

Probleme:

- in unele locuri se folosesc campurile `predictedEpuizareRisk` si `predictedObosealaIndex`;
- tipul `ForecastOutput` defineste campurile `predictedBurnoutRisk` si `predictedFatigueIndex`;
- exista nepotrivire intre modelul nou din `services/types.ts` si codul care foloseste nume romanizate;
- in `alert-dialog.tsx`, componenta Radix `Cancel` a fost tradusa gresit in `Anuleaza`. Radix nu exporta `AlertDialogPrimitive.Anuleaza`.

Rezolvare recomandata:

- standardizeaza numele campurilor in tot proiectul;
- fie folosesti peste tot `predictedBurnoutRisk` / `predictedFatigueIndex`, fie modifici tipurile oficiale;
- in `alert-dialog.tsx`, schimba `AlertDialogPrimitive.Anuleaza` in `AlertDialogPrimitive.Cancel`, dar pastreaza exportul local `AlertDialogAnuleaza` daca vrei nume romanesc in app.

### 13.2 Lint-ul pica

Comanda:

```bash
npm run lint
```

Probleme:

- ESLint intra si in `.venv`, deci verifica fisiere din dependinte Python;
- lipsesc ignore-uri pentru `.venv`, `.wrangler`, posibil alte foldere generate;
- multe fisiere au diferente de format Prettier / CRLF.

Rezolvare recomandata:

- adauga in `eslint.config.js` ignore-uri:
  - `.venv/**`;
  - `node_modules/**`;
  - `dist/**`;
  - `.wrangler/**`;
  - `.tanstack/**`;
- ruleaza `npm run format`;
- apoi ruleaza din nou `npm run lint`.

### 13.3 Butoane demo fara persistenta reala

Mai multe actiuni afiseaza toast, dar nu modifica date reale:

- `Salveaza scenariul`;
- `Aproba`;
- `Amana`;
- `Marcheaza citit`;
- `Aplica plan recomandat`;
- unele actiuni din centrul de alerte.

Pentru demo este acceptabil. Pentru productie trebuie backend.

### 13.4 Fluxul din exemple nu activeaza complet scenariul

Pagina `/examples` scrie in `localStorage`, dar `ActiveScenarioProvider` nu citeste acea informatie la initializare. In plus, scenariul salvat este incomplet fata de tipul complet `GeneratScenario`.

Impact:

- utilizatorul poate apasa `Incarca scenariul`, dar dashboardul poate sa nu se actualizeze real.

Rezolvare:

- foloseste direct `setActive(...)` in pagina de exemple;
- sau creeaza scenarii complete de tip `GeneratScenario`;
- sau hidrateaza providerul din `localStorage`.

### 13.5 Claim-uri de conformitate doar vizuale

UI-ul mentioneaza `HIPAA-aware` si `SOC 2`, dar nu exista implementari reale de:

- autentificare;
- autorizare;
- audit log;
- criptare aplicativa;
- politici de retentie;
- control acces pe roluri;
- segregare date;
- logging securizat.

Pentru hackathon e ok ca pozitionare, dar in documentatie trebuie spus ca sunt obiective viitoare, nu conformitate finala.

### 13.6 Datele nu sunt validate medical sau operational

Scorurile si prognozele sunt mock/rule-based. Nu exista model ML antrenat pe date reale si validat.

Impact:

- rezultatele sunt bune pentru demo si prototip;
- nu trebuie prezentate ca rezultate clinice reale.

### 13.7 Bundle-uri mari

Build-ul avertizeaza ca unele chunk-uri sunt peste 500 kB, mai ales componente mari precum AppShell, Recharts si export PDF.

Rezolvare:

- code splitting mai agresiv;
- lazy-load pentru pagini grele;
- import dinamic pentru `jsPDF`;
- separare manuala chunks pentru Recharts.

### 13.8 Naming inconsistent

Exista mici inconsistente:

- `GeneratScenario` in loc de `GeneratedScenario`;
- `Setari`, `Rapoarte`, `Anuleaza` romanizate in unele zone;
- `Burnout` vs `Epuizare`;
- campuri romanizate vs englezesti in modele.

Recomandare:

- pastreaza UI-ul in romana;
- pastreaza tipurile si codul intern intr-o singura conventie, ideal engleza;
- mapeaza termenii pentru UI separat.

### 13.9 Lipsesc teste automate

Exista scripturi Python pentru chei:

- `test_openai_key.py`;
- `test_foundry_key.py`.

Dar nu exista teste pentru:

- componente React;
- rute;
- generator scenarii;
- API endpoint;
- export PDF;
- simulator.

## 14. Ce este bun in proiect

Puncte forte:

- idee clara si relevanta pentru domeniul medical operational;
- UI bogat si convingator pentru demo;
- multe pagini implementate;
- navigatie coerenta;
- grafice si KPI-uri utile;
- generator conversational functional cu fallback local;
- arhitectura partial pregatita pentru backend real prin `services/api.ts`;
- deploy pregatit pentru Cloud Run;
- export PDF implementat;
- health endpoint implementat;
- fallback de eroare SSR custom;
- tema si profil persistate local.

## 15. Ce trebuie facut imediat

Prioritatea 1 - stabilizare tehnica:

1. Repara erorile TypeScript.
2. Repara `AlertDialogAnuleaza`.
3. Standardizeaza campurile `ForecastOutput`.
4. Adauga ignore-uri ESLint pentru `.venv` si foldere generate.
5. Ruleaza format pe proiect.
6. Adauga script `typecheck` in `package.json`.

Prioritatea 2 - fluxuri demo corecte:

1. Repara incarcarea scenariilor din `/examples`.
2. Fa butonul `Salveaza scenariul` sa salveze macar in `localStorage`.
3. Fa `Aproba` / `Amana` din planificator sa modifice starea local.
4. Fa `Marcheaza citit` din `/alerts` sa scoata alerta din lista.
5. Fa exportul PDF sa foloseasca datele reale din scenariul curent.

Prioritatea 3 - backend real:

1. Alege baza de date: Supabase, Firebase, PostgreSQL sau alt backend.
2. Creeaza tabele pentru departamente, semnale, rapoarte, scenarii, alerte, utilizatori.
3. Inlocuieste mock-urile din `api.ts` cu requesturi reale.
4. Pastreaza tipurile din `services/types.ts` ca model oficial.

Prioritatea 4 - siguranta si productie:

1. Autentificare.
2. Roluri: admin, manager, coordonator, viewer.
3. Audit log.
4. Gestionare secrete prin Secret Manager.
5. CORS restrictionat la domeniul real.
6. Logging fara date sensibile.

## 16. Roadmap propus

### Etapa 1 - Hackathon polish

- repara TypeScript;
- repara lint;
- corecteaza scenariile din exemple;
- export PDF cu date curente;
- adauga text clar de disclaimer;
- pregateste prezentarea si demo flow.

### Etapa 2 - MVP real

- autentificare;
- baza de date;
- alerte persistente;
- rapoarte salvate;
- scenarii salvate;
- dashboard conectat la API real;
- integrare AI stabila.

### Etapa 3 - Produs pilot

- integrare cu sistem de ture;
- integrare HR / absente;
- import CSV;
- istoric pe departamente;
- modele calibrate pe date reale;
- evaluare cu personal operational;
- audit si compliance.

### Etapa 4 - Produs productie

- roluri si permisiuni avansate;
- observabilitate;
- backup;
- multi-tenant;
- SLA;
- documentatie de securitate;
- onboarding spitale.

## 17. Cum ai putea prezenta proiectul

Pitch scurt:

PulseGuard AI este un centru operational pentru spitale care prezice riscul de epuizare a personalului si recomanda interventii concrete inainte ca situatia sa devina critica. Aplicatia combina semnale precum ture de noapte, ore suplimentare, grad de ocupare, concedii medicale si raport pacienti-personal, apoi genereaza prognoze, scenarii si rapoarte usor de folosit de coordonatori.

Demo flow recomandat:

1. Deschizi dashboardul principal.
2. Arati KPI-urile si raportul initial.
3. Scrii in generator o situatie concreta, de exemplu ATI cu 96% ocupare, ture de noapte si concedii medicale.
4. Arati scenariul generat: risc, factori, recomandari.
5. Aplici scenariul in panou.
6. Deschizi raportul complet.
7. Exporti PDF.
8. Intri in simulator si arati cum scade riscul daca adaugi personal si reduci orele suplimentare.

## 18. Intrebari posibile si raspunsuri

Intrebare: Este modelul AI real?

Raspuns: Aplicatia are endpoint pregatit pentru Foundry/OpenAI-compatible si fallback local. In demo, partea de calcul este rule-based/mock, iar AI-ul poate imbunatati explicatiile si recomandarile daca este configurat.

Intrebare: Este gata pentru productie?

Raspuns: Nu complet. Este un prototip functional de hackathon/MVP. Are UI, server, endpoint AI si deployment pregatit, dar are nevoie de backend real, autentificare, audit si validare operationala.

Intrebare: Ce date ar trebui conectate?

Raspuns: Date despre ture, ore suplimentare, concedii medicale, grad de ocupare, raport pacienti-personal, incidente operationale si sondaje de stres.

Intrebare: De ce este util?

Raspuns: Pentru ca transforma semnale operationale greu de urmarit in actiuni clare: unde trebuie adaugat personal, unde trebuie reduse orele suplimentare si ce departament risca sa intre in zona critica.

Intrebare: Este instrument medical?

Raspuns: Nu. Este suport decizional operational, nu diagnostic medical.

## 19. Comenzi utile

Instalare dependinte:

```bash
npm install
```

Pornire local:

```bash
npm run dev
```

Build productie:

```bash
npm run build
```

Pornire build Cloud Run local:

```bash
npm run start:cloudrun
```

Lint:

```bash
npm run lint
```

Typecheck recomandat de adaugat:

```bash
npx tsc --noEmit
```

## 20. Concluzie

PulseGuard AI este deja un prototip avansat ca experienta vizuala si flux de demo. Are dashboard, prognoza, simulator, generator GenAI, rapoarte, alerte si deployment pregatit. Directia tehnica este buna, mai ales datorita stratului `services/api.ts`, care permite migrarea catre backend real.

Cele mai importante lucruri de facut in continuare sunt stabilizarea TypeScript/lint, repararea persistentei scenariilor, conectarea unui backend real si transformarea actiunilor demo in actiuni persistente.

Pentru hackathon, proiectul este prezentabil. Pentru productie, trebuie tratat ca MVP in lucru, nu ca sistem clinic validat.
