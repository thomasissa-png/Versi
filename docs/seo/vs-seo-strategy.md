# SEO Versi Studio — Stratégie minimale (outil interne)

> Versi Studio (`studio.versi.fr`) est un outil SaaS interne réservé aux marchands de biens Versi.
> Il n'y a pas de contenu public à indexer. Le SEO est volontairement absent.

---

## Décision : noindex sur toutes les routes /vs/*

**Pourquoi** : l'outil n'est pas destiné au grand public. L'indexer n'apporterait aucun trafic qualifié
et exposerait des URLs d'opérations internes aux moteurs de recherche.

**Implémentation** : export `metadata` dans `versi-studio/src/app/vs/layout.tsx` avec `robots: { index: false, follow: false }`.
Ce bloc s'applique à toutes les routes enfants (`/vs`, `/vs/projects/[id]/upload|lots|rooms|visuals`).

```ts
export const metadata: Metadata = {
  title: "Versi Studio — Outil de découpe et visualisation",
  description: "Outil interne Versi — découpe de lots, visualisation et pré-commercialisation.",
  robots: { index: false, follow: false },
};
```

---

## Ce qui n'est PAS implémenté (volontaire)

| Élément SEO        | Statut   | Raison                                      |
|--------------------|----------|---------------------------------------------|
| sitemap.xml        | Absent   | Aucune page à référencer                    |
| schema.org JSON-LD | Absent   | Pas de contenu sémantique public            |
| llms.txt           | Absent   | Pas de contenu LLM-friendly à exposer       |
| Open Graph / Twitter Cards | Absent | Pas de partage social prévu         |
| Canonical tags     | Absent   | noindex suffit — Bing et Google ignorent    |
| IndexNow           | Absent   | Pas de contenu à notifier                   |

---

## Périmètre couvert

- `studio.versi.fr/vs` — dashboard opérations
- `studio.versi.fr/vs/projects/[id]/upload` — upload plans
- `studio.versi.fr/vs/projects/[id]/lots` — découpe lots
- `studio.versi.fr/vs/projects/[id]/rooms` — pièces
- `studio.versi.fr/vs/projects/[id]/visuals` — visuels

Toutes ces routes héritent du `metadata` défini dans le layout `/vs/`.

---

**Handoff → @fullstack**
- Fichiers produits : `docs/seo/vs-seo-strategy.md`, `versi-studio/src/app/vs/layout.tsx` (metadata ajouté)
- Décisions prises : noindex/nofollow global sur /vs/*, pas de sitemap, pas de schema.org
- Points d'attention : si `studio.versi.fr` est un jour ouvert au public (landing, pricing), créer un layout séparé hors `/vs/` avec metadata indexables
