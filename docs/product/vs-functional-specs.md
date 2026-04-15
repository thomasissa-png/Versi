# Specs fonctionnelles — Versi Studio

**Version** : V1 (sans auth, sans paiement, sans PDF de sortie)
**Date** : 2026-04-15
**Persona** : Thomas, 35 ans, marchand de biens, 8-12 opérations/an
**KPI North Star** : Nombre de lots traités (upload plan → visuel final)

---

## 1. Évaluation du code existant

| Fichier | Verdict | Justification |
|---|---|---|
| `schemas.ts` (393 lignes) | GARDER et adapter | Schemas Zod complets et solides : TypeBien, RoomType (21 types), TargetBuyer, ProjectStatus, LotStatus, ExtractedRoom (bounding_box en %), BuildingOutline, PlanExtractionResult, LotDefinition, ValidatedRoom, LotQualification. Retirer les refs user/stripe en V1. |
| `plan-extractor.ts` | GARDER | Coeur IA fonctionnel : extraction via GPT-4.1 vision, PDF→PNG via pdf-to-img, support multi-fichiers (1 par étage, floor auto-incrémenté), gestion lots zones (rectangles + polygones en %). Zéro rewrite nécessaire. |
| `architect-agent.ts` | GARDER, adapter | Agent conversationnel GPT-4.1 pour itérer sur les visuels. Adapter l'interface au nouveau workflow (étape 4 uniquement, plus de lien avec les anciennes étapes). |
| `db.ts` | GARDER la structure, adapter | Tables SQL bien structurées (pro_projects, pro_lots, pro_rooms, pro_recommendations, pro_lot_descriptions, pro_visuals) avec indexes et FK. Renommer préfixe `pro_` → `vs_`, retirer `user_id` FK et champs Stripe. |
| `PlanEditor.tsx` | ADAPTER | Canvas HTML5 avec overlay rectangles colorés sur image du plan + drag/resize. Le concept est bon, l'UX est basique. Refactorer pour support polygones, fusion/séparation de lots, meilleure affordance. |
| `ProStepper.tsx` | REFAIRE | 7 étapes — trop de granularité. Refaire un stepper 4 étapes linéaire (Upload → Lots → Pièces → Visuels). Conserver la logique de validation par étape. |
| `description-generator.ts` | JETER en V1 | Génération de descriptions commerciales par lot. Pas de PDF de sortie en V1. Réintégrer en V2. |
| `ProPaymentGate.tsx` | JETER en V1 | Gate de paiement Stripe. Pas de paiement en V1 — outil accessible sans abonnement. Réintégrer en V2 avec le modèle tarifaire défini. |
| Pages 8 étapes (nouveau → extraction → decoupe → validation → qualification → recommandations → generation → dossier) | REFAIRE | Architecture de pages à reconstruire selon le workflow 4 étapes. Certaines routes sont récupérables (extraction, decoupe) mais la logique doit être consolidée. |

## 2. Workflow simplifié — 4 étapes (vs 8 dans l'existant)

[À remplir — justification de la simplification]

## 3. Étape 1 — Upload des plans

[À remplir — US-VS-01 à 05]

## 4. Étape 2 — Découpe par lots

[À remplir — US-VS-06 à 12]

## 5. Étape 3 — Identification des pièces

[À remplir — US-VS-13 à 18]

## 6. Étape 4 — Visuels post-travaux

[À remplir — US-VS-19 à 25]

## 7. Recommandation stack technique

[À remplir — Next.js 14, Tailwind, PostgreSQL, Object Storage]

## 8. Modèle de données (V1)

[À remplir — tables SQL adaptées]

## 9. Endpoints API (V1)

[À remplir — liste des routes]

## 10. Handoff

[À remplir]
