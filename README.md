# HailiteManager

Plateforme complète de gestion d'entreprise pour **Hailite Xteriors** — Roofing & Siding.

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Storage**: Google Cloud Storage (photos chantiers)
- **Paiements**: Stripe
- **Maps**: Google Maps API

## Portails

### Portail Employé
- Dashboard personnel avec stats temps réel
- Punch in/out avec GPS
- Calendrier de travail mensuel
- Suivi de paye en temps réel (déductions QC)
- Profil personnel

### Portail Administration
- Dashboard KPIs
- CRM Clients & Prospects
- Facturation (Devis -> Contrats -> Factures)
- Chantiers avec checklist (blocage facturation)
- Ressources Humaines (employes + sous-traitants)
- Comptabilite & rapports
- Catalogue materiaux (3 prix)
- Inventaire
- Statistiques avancees

## Themes

- **Ultra Artistique**: sombre, degrades orange/violet, glassmorphisme
- **Light Epure**: blanc, bleu professionnel, minimal

## Setup

1. `cp .env.example .env.local` puis remplir les valeurs
2. Executer `supabase/migrations/001_initial_schema.sql` dans Supabase
3. `npm install && npm run dev`

## Structure

```
src/
├── app/(auth)/       # Login, PIN employe
├── app/(admin)/      # Portail administration
├── app/(employee)/   # Portail employe
├── app/api/          # Routes API (punch, stripe, storage)
├── components/ui/    # Composants UI
├── lib/              # Supabase, GCS, Stripe, utils
└── types/            # TypeScript types
```