# Rodent Care Organization

## Opis problema

Rodent Care Organization je mikroservisna aplikacija namenjena ustanovama za brigu o glodarima (azili, istraživački centri, zoološki vrtovi) koja omogućava centralizovano upravljanje životinjama i njihovim potrebama. Aplikacija rešava sledeće probleme:

- **Nedostatak centralizovane evidencije** - Ustanove nemaju jedinstven sistem za praćenje svih životinja u objektu
- **Praćenje zdravlja i ponašanja** - Nema sistematskog načina za dnevno praćenje zdravlja, aktivnosti i raspoloženja životinja
- **Medicinska dokumentacija** - Nedostaje digitalna evidencija vakcina, tretmana i dijagnoza
- **Analitika i izveštavanje** - Nema uvida u trendove zdravlja populacije, potrošnju hrane, i demografiju
- **Koordinacija osoblja** - Različiti timovi (upravnici, veterinari, volonteri) nemaju efikasan način za deljenje informacija

## Korisnici sistema

Sistem podržava sledeće tipove korisnika:

- **Volonter** - Read-only pristup, pregled osnovnih informacija o životinjama
- **Upravnik (Caretaker)** - Upravljanje životinjama, dnevno praćenje aktivnosti i ishrane, premeštanje životinja
- **Veterinar** - Upravljanje medicinskom evidencijom, tretmani, zdravstvene analitike
- **Admin** - Puna kontrola sistema, upravljanje korisnicima, pregled svih izveštaja

## Predloženo rešenje

Sistem je dizajniran kao mikroservisna aplikacija koja se sastoji od 5 glavnih servisa (4 mikroservisa + API Gateway), svaki sa svojom bazom podataka prilagođenom specifičnoj nameni.

## Arhitektura sistema

### 1. User Service
- **Odgovornosti**: Autentifikacija, autorizacija, upravljanje korisnicima
- **Tehnologije**: Rust (Axum), PostgreSQL
- **Ključne funkcionalnosti**: 
  - Registracija i autentifikacija (JWT)
  - Upravljanje ulogama (Admin, Upravnik, Veterinar, Volonter)
  - Validacija tokena za API Gateway

### 2. Rodent Registry Service
- **Odgovornosti**: Centralna evidencija životinja i medicinska dokumentacija
- **Tehnologije**: Rust (Axum), MongoDB
- **Ključne funkcionalnosti**: 
  - CRUD operacije za glodare
  - Evidencija vrsta: dabrovi, kapibare, nutrije, morski prasići, bizamski pacovi, hrčkovi, prerijski psi, zečevi
  - Upload slika životinja
  - Medicinska evidencija (vakcine, bolesti, tretmani, dijagnoze)
  - Pretraga po vrsti, imenu, statusu, čip ID-u
  - Istorija premeštanja i promena statusa

### 3. Activity Tracking Service
- **Odgovornosti**: Praćenje dnevnih aktivnosti, zdravlja i ishrane
- **Tehnologije**: Rust (Axum), MongoDB
- **Ključne funkcionalnosti**: 
  - Dnevna merenja (težina, temperatura, energija/raspoloženje - skala 1-10)
  - Praćenje aktivnosti (trčanje u točku, plivanje, kopanje, socijalna interakcija)
  - Evidencija ishrane (vrsta hrane, količina u gramima, vreme)
  - Beleške o ponašanju
  - Real-time unos podataka

### 4. Analytics Service
- **Odgovornosti**: Agregacija podataka i generisanje izveštaja
- **Tehnologije**: Rust (Axum), MongoDB
- **Ključne funkcionalnosti**: 
  - Statistika populacije (po vrsti, polu, uzrastu)
  - Zdravstveni trendovi (težina kroz vreme, učestalost bolesti po vrstama)
  - Grafikoni aktivnosti (dnevni, nedeljni, mesečni)
  - Analitika ishrane (potrošnja hrane po vrsti, optimizacija)
  - Mesečni i godišnji izveštaji
  - Heatmap aktivnosti po danu/satu
  - Prediktivna analitika za zdravstvene probleme

### API Gateway
- **Odgovornosti**: Centralna tačka pristupa, routing, autentifikacija
- **Tehnologije**: Rust (Axum)
- **Funkcionalnosti**: 
  - JWT validacija za sve zahteve
  - Rate limiting po korisniku
  - Request logging i monitoring
  - Routing zahteva ka odgovarajućim mikroservisima
  - Error handling i aggregation

## Komunikacija između servisa

Sistem koristi API Gateway kao centralnu tačku pristupa kroz koju prolazi sva komunikacija sa frontend-om.

### Sinhrona komunikacija (REST API):
- Frontend → API Gateway → Mikroservisi
- Service-to-service komunikacija kada je potrebna trenutna razmena podataka
- API Gateway ↔ User Service (validacija tokena)

### Asinhrona komunikacija (RabbitMQ):
- Event-driven arhitektura za background processing
- **Activity Tracking Service → Analytics Service**: 
  - `DailyMetricsRecorded` event (svaki unos merenja)
  - `FeedingRecorded` event (svaki unos ishrane)
- **Rodent Registry Service → Analytics Service**: 
  - `RodentRegistered` event (nova životinja)
  - `RodentStatusChanged` event (promena statusa: adopted, deceased, transferred)
  - `MedicalTreatmentAdded` event (novi tretman)

## Baze podataka

- **PostgreSQL** (User Service) - Relaciona baza za korisnike, uloge i autentifikaciju
- **MongoDB** (Rodent Registry, Activity Tracking, Analytics Services) - NoSQL baza za fleksibilne strukture i brze upite

## Kontejnerizacija

- **Docker** i **Docker Compose** za kontejnerizaciju svih servisa
- Omogućava lako pokretanje, deployment i skaliranje aplikacije
- Svaki servis radi u sopstvenom kontejneru
- Zajednička Docker mreža za komunikaciju između servisa

## Frontend

- **Platforma**: Web aplikacija (Angular)
- **Odgovornost**: Renderovanje dashboard-a, grafikona, formi, i svih UI komponenti
- **Funkcionalnosti**:
  - Interaktivni dashboard sa real-time statistikama
  - Pregled životinja sa filterima i pretragom
  - Forme za unos dnevnih merenja i aktivnosti
  - Medicinska evidencija i istorija
  - Prikaz plana prostorija sa rasporedom životinja
  - Grafikoni i analitike (Chart.js)
  - Responzivan dizajn za tablet upotrebu

## Funkcionalnosti sistema

### Registracija (Neautentifikovani korisnik)
- Unos korisničkog imena, email-a i lozinke
- Izbor uloge za koju se aplicira (Upravnik, Veterinar, Volonter)
- Admin mora da odobri registraciju

### Logovanje (Neautentifikovani korisnik)
- Unos korisničkog imena i lozinke
- Autentifikacija putem JWT tokena
- Refresh token mehanizam za automatsku obnovu sesije

### Pregled životinja (Svi autentifikovani korisnici)
- Pretraga životinja po imenu, vrsti, čip ID-u
- Filteriranje po statusu (active, adopted, quarantine, medical care, deceased)
- Sortiranje po uzrastu, datumu prijema
- Prikaz osnovnih informacija i fotografije

### Registracija nove životinje (Upravnik, Admin)
- Unos osnovnih podataka:
  - Vrsta (dabar, kapibara, nutrija, morski prasić, bizamski pacov, hrčak, prerijski pas, zec)
  - Ime/identifikator
  - Pol
  - Datum rođenja (procena ako je nepoznat)
  - Čip ID (opciono)
  - Status (active, quarantine, medical care)
  - Posebne napomene
- Upload jedne ili više slika
- Triggerovanje `RodentRegistered` eventa

### Dnevno praćenje aktivnosti (Upravnik)
- Izbor životinje za koju se unose podaci
- Unos merenja:
  - Težina (u gramima)
  - Temperatura (°C)
  - Energija/raspoloženje (skala 1-10)
  - Beleške o ponašanju
- Praćenje aktivnosti:
  - Trčanje u točku (minuti)
  - Plivanje (za vodene vrste - minuti)
  - Kopanje (minuti)
  - Socijalna interakcija (minuti)
- Unos obroka:
  - Vrsta hrane (pellet, seno, povrće, voće, proteini)
  - Količina (grami)
  - Vreme obroka
- Automatsko čuvanje podataka
- Triggerovanje `DailyMetricsRecorded` i `FeedingRecorded` eventi

### Medicinska evidencija (Veterinar, Admin)
- Kreiranje medicinskog zapisa:
  - Tip: vakcina, tretman, dijagnoza, operacija, kontrolni pregled
  - Datum
  - Opis/dijagnoza
  - Prepisani lekovi i doziranje
  - Rezultati testova
  - Sledeći termin (ako je potreban follow-up)
- Pregled medicinske istorije životinje
- Triggerovanje `MedicalTreatmentAdded` eventa

### Analitike (Upravnik, Veterinar, Admin)

#### Izveštaji (Aktivnost, ishrana, populaciona statistika i zdravlje)
- Mesečni izvještaji (PDF)
- Godišnji izveštaji (PDF)
- Export podataka (CSV, Excel)

### Upravljanje korisnicima (Admin)
- Odobravanje novih registracija
- Dodela i izmena uloga
- Deaktivacija korisničkih naloga
- Pregled log-a aktivnosti korisnika

## Tehnologije

### Backend
- **Programski jezik**: Rust
- **Web framework**: Axum
- **Relaciona baza**: PostgreSQL
- **NoSQL baza**: MongoDB
- **Message Broker**: RabbitMQ
- **Autentifikacija**: JWT

### Frontend
- **Framework**: Angular (najnovija verzija)
- **State management**: NgRx 
- **HTTP client**: HttpClient
- **Routing**: Angular Router
- **Forms**: Reactive Forms
- **UI komponente**: PrimeNG
- **Charts**: Chart.js sa ng2-charts
- **File upload**: ng2-file-upload

## Pokretanje projekta
```bash
# Kloniranje repozitorijuma
git clone https://github.com/Nikola034/rodent-care.git
cd rodent-care

# Pokretanje svih servisa sa Docker Compose
docker-compose up -d

# Backend servisi će biti dostupni na:
# API Gateway: http://localhost:8000
# User Service: http://localhost:8001
# Rodent Registry Service: http://localhost:8002
# Activity Tracking Service: http://localhost:8003
# Analytics Service: http://localhost:8004

# Frontend će biti dostupan na:
# Angular app: http://localhost:4200
```

## Potencijalna proširenja za diplomski rad

- **IoT integracija**: Senzori za automatsko praćenje temperature, vlažnosti, težine
- **Mobilna aplikacija**: React Native aplikacija za brži unos podataka u teretani
- **AI predviđanje**: Machine learning modeli za predviđanje zdravstvenih problema
- **Public portal**: Web stranica za udomljavanje sa dostupnim životinjama
- **Video monitoring**: Integracija kamera za 24/7 nadgledanje
- **Automatsko hranjenje**: Integracija sa automatskim hranilicama i praćenje potrošnje

---
