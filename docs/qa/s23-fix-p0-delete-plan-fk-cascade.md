# Fix P0 régression — DELETE plan bloqué par FK constraint (s23)

**Date** : 2026-04-18
**Session** : versi-s23 (jalon 3)
**Branche** : `claude/versi-s23-ocr-mobile-baselines-0eLFE`
**Sévérité** : P0 régression (3e signalement Thomas — L214 gate bloquante automatique)

---

## Symptôme reproductible

1. Se connecter sur Versi Studio
2. Cliquer "Projet en cours"
3. Cliquer "Supprimer plan" sur un plan déjà extrait (lots/pièces générés)
4. Toast d'erreur : **"Impossible de supprimer le plan."**

## Cause racine

`vs_rooms.plan_id` (db.ts:186) référence `vs_plans(id)` **sans** `ON DELETE CASCADE`. Quand le pipeline d'extraction OCR (s17+) insère des rooms avec `plan_id` non null, PostgreSQL bloque tout `DELETE FROM vs_plans` ultérieur avec une violation de contrainte FK :

```
ERROR: update or delete on table "vs_plans" violates foreign key constraint
"vs_rooms_plan_id_fkey" on table "vs_rooms"
DETAIL: Key (id)=(...) is still referenced from table "vs_rooms".
```

Le catch handler de `/api/vs/plans/[id]/route.ts:73` retourne 500 + message générique masquant la vraie cause.

## Pourquoi non détecté en s22

Le fix R1 s22 (`cache: "no-store"` + `force-dynamic`) traitait un autre symptôme (cache HTTP). Le test E2E `plan-delete-persistence.spec.ts` :
- Crée un plan via POST `/api/vs/projects/[id]/plans`
- Supprime via DELETE `/api/vs/plans/[id]`
- **Ne déclenche JAMAIS l'extraction** → aucune room insérée → FK constraint jamais violée

Le test passait, le bug existait en prod dès qu'un plan était extrait.

## Fix appliqué

`versi-studio/src/lib/vs/db.ts` :

1. **CREATE TABLE vs_rooms** : ajout `ON DELETE CASCADE` sur la FK `plan_id` pour les futures bases.
2. **Migration idempotente DO $$** : pour les bases existantes (Replit prod), DROP + ADD de la contrainte avec `ON DELETE CASCADE`. Idempotent : ne s'exécute que si la contrainte existante n'a pas déjà `CASCADE`.

La migration s'exécute automatiquement au premier appel à `ensureDbReady()` (lazy init via `tablesEnsured` flag).

## Vérification post-déploiement

```bash
# Sur Replit après deploy
psql $DATABASE_URL -c "
SELECT rc.delete_rule
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu
  ON rc.constraint_name = kcu.constraint_name
WHERE kcu.table_name = 'vs_rooms' AND kcu.column_name = 'plan_id';
"
# Attendu : delete_rule = 'CASCADE'
```

Test fonctionnel :
1. Upload plan → laisser extraction se terminer (lots/rooms générés)
2. Cliquer "Supprimer plan"
3. Attendu : toast succès + plan disparu + rooms associées supprimées (CASCADE) + lots conservés (lots ont `project_id`, pas `plan_id`)

## Recommandations s24

- **Étendre `plan-delete-persistence.spec.ts`** : test cas "delete plan WITH rooms" — créer un plan, INSERT row dans vs_rooms manuellement (via fixture SQL ou route mock), DELETE plan, assert 200 + cascade OK
- **Audit FK constraints global** : Grep tous les `REFERENCES` du schema, vérifier qu'ils ont tous le bon `ON DELETE` (CASCADE/SET NULL/RESTRICT) selon l'intent métier
- **Améliorer message d'erreur 500** : exposer le `err.code` PostgreSQL (`23503` = FK violation) en log + message utilisateur plus actionnable (ex: "Suppression bloquée — données liées détectées. Contactez le support si le problème persiste.")

## Learning candidat L218 s23

**Tests E2E qui ne reproduisent pas le flow réel = faux filet** — Le test `plan-delete-persistence.spec.ts` s22 testait le DELETE en isolation (plan vierge sans extraction). Le bug se déclenche UNIQUEMENT dans le flow réel (plan + extraction + DELETE). Règle : tout test de DELETE/UPDATE sur une table référencée doit créer au préalable au moins une ligne dans chaque table référençante (via fixture ou flow E2E complet). Sinon les contraintes FK ne sont jamais éprouvées par les tests automatisés.
