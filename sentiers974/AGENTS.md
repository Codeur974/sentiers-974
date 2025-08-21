# AGENTS.md — Règles pour OpenAI Codex (Frontend)

## Portée

- Travailler UNIQUEMENT dans ce dossier (frontend). Ne pas toucher aux dossiers parents (backend/infra).

## Stack

- Next.js + TypeScript (et Tailwind/Zustand si présents). Conserver le design actuel.

## Scripts attendus

- dev, build, start, lint, lint:fix, typecheck, format.
- Si manquants : proposer de les ajouter, avec diff avant d’écrire.

## Qualité

- Respect ESLint, Prettier, TypeScript strict. Commits atomiques (Conventional Commits).

## Sécurité

- Ne jamais créer/committer des `.env` réels. Fournir un `.env.example` si nécessaire.

## Documentation

- Maintenir README.md, CONTRIBUTING.md, docs/ARCHITECTURE.md.

## Flux avec Codex

- Toujours montrer le diff avant d’écrire. Demander approbation pour deps/refactors majeurs.

## TODO initial

1. Audit du dossier (scripts, deps, structure) — **rapport texte uniquement**.
2. Ajouter `lint:fix` si manquant + documenter dans README.
3. Générer `.env.example` si des variables d’environnement sont lues.
