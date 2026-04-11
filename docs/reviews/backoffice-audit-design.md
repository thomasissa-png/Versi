# Audit design — Back office admin Versi Immobilier

**Date** : 2026-04-11
**Auditeur** : @design
**Périmètre** : `/admin` — Login, Layout, Biens, BienForm, Réalisations, RealisationForm, Inscrits
**Utilisateurs** : Thomas, Maxime, Carl (fondateurs uniquement)

---

## Note globale : 6.3 / 10

Le back office est **fonctionnel et propre dans ses fondations** — la structure CSS est correcte, les classes sont cohérentes, les états UI de base existent. Mais il accumule une dette design précise et corrigeable qui le maintient à 6/10 : absence de focus-visible conforme, colonnes de prix non alignées à droite, formulaires trop denses, nav sans indicateur d'état actif visuellement distinctif, `admin-content` non centré, et plusieurs micro-incohérences d'espacement.

L'objectif 10/10 est atteignable avec les corrections ci-dessous — aucune refonte, que des corrections ciblées.

---

## Notes par critère

| # | Critère | Note | Verdict |
|---|---------|------|---------|
| 1 | Cohérence visuelle | 7/10 | Bonne base — quelques inline styles parasites à éradiquer |
| 2 | Hiérarchie de l'information | 7/10 | Titres corrects mais `admin-content` non centré, padding insuffisant sur desktop |
| 3 | Lisibilité des tableaux | 6/10 | Prix non aligné à droite, colonne Actions sans largeur fixe, manque `table-layout: fixed` |
| 4 | Formulaires | 7/10 | Labels alignés, groupement logique OK — mais champs trop petits (`0.45rem`), input file non stylé |
| 5 | États UI | 7/10 | Loading/erreur/vide/succès présents — mais `admin-loading` et `admin-error` sont de simples `<p>`, trop discrets |
| 6 | Responsive admin | 4/10 | `form-row` casse sur mobile (flex sans breakpoint), tableau déborde, `admin-content` sans padding mobile adapté |
| 7 | Feedback utilisateur | 7/10 | `confirm()` natif pour les suppressions, messages succès/erreur présents — mais `window.confirm` est bloquant et visuellement incohérent |
| 8 | Navigation | 6/10 | État actif = seul `text-decoration: underline` — insuffisant visuellement. Pas de breadcrumb sur les formulaires. `nav-brand` non différencié visuellement du reste |
| 9 | Upload photos | 7/10 | Preview présente, suppression fonctionnelle, erreur de format/taille gérée — mais input file natif non stylé, bouton remove trop petit (20×20px, sous la norme 44px) |
| 10 | Accessibilité minimale | 4/10 | Aucun `focus-visible` défini dans le CSS — navigabilité clavier inexistante. Input password sans `<label>` associé (`htmlFor`). `photo-remove` sans aria-label. Contrastes bords de champs (#ccc sur blanc = 1.6:1, insuffisant) |

---

## Corrections prioritaires

### P0 — Bloquants (accessibilité et lisibilité)

---

#### P0-1 — Focus-visible absent sur tous les interactifs
**Fichier** : `admin.css`
**Problème** : aucun style `focus-visible` défini. Navigation au clavier impossible. WCAG 2.2 AA exige outline 2px, offset 2px.

**Correction** — ajouter après la règle `.btn:disabled` :

```css
/* Focus visible — WCAG 2.2 AA */

.btn:focus-visible,
.admin-filters button:focus-visible,
.admin-nav a:focus-visible,
.admin-nav .btn-logout:focus-visible {
  outline: 2px solid #111;
  outline-offset: 2px;
}

.admin-form input:focus-visible,
.admin-form select:focus-visible,
.admin-form textarea:focus-visible,
.admin-login-page input[type="password"]:focus-visible,
.dynamic-list-item input:focus-visible {
  outline: 2px solid #111;
  outline-offset: 0;
  border-color: #111;
}

.photo-grid .photo-item .photo-remove:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
```

---

#### P0-2 — Input password sans label dans AdminLogin
**Fichier** : `AdminLogin.jsx` ligne 52-57
**Problème** : `<input type="password">` sans `<label>` associé — lecteur d'écran muet, et règle WCAG 1.3.1.

**Old** :
```jsx
<input
  type="password"
  placeholder="Mot de passe"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  autoFocus
  required
/>
```

**New** :
```jsx
<label htmlFor="admin-password" style={{ fontSize: '0.85rem', fontWeight: 500, color: '#333' }}>
  Mot de passe
</label>
<input
  id="admin-password"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  autoFocus
  required
/>
```

---

#### P0-3 — Bouton photo-remove trop petit (20×20px) et sans aria-label
**Fichier** : `admin.css` lignes 373-389 + `AdminBienForm.jsx` lignes 424-431 + `AdminRealisationForm.jsx` lignes 293-300
**Problème** : 20×20px = moins de la moitié du minimum tactile requis (44×44px). Aucun aria-label.

**Correction CSS** — modifier `.photo-grid .photo-item .photo-remove` :

```css
.photo-grid .photo-item .photo-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background 150ms ease;
}

.photo-grid .photo-item .photo-remove:hover {
  background: rgba(0, 0, 0, 0.9);
}
```

**Correction JSX** — ajouter `aria-label` sur chaque bouton photo-remove dans `AdminBienForm.jsx` et `AdminRealisationForm.jsx` :

```jsx
<button
  type="button"
  className="photo-remove"
  onClick={() => handleDeleteExistingPhoto(photo.id)}
  aria-label="Supprimer cette photo"
>
  ×
</button>
```

---

#### P0-4 — Contraste des bordures de champs insuffisant (#ccc sur blanc = ~1.6:1)
**Fichier** : `admin.css` lignes 279-290 + ligne 27-32 + ligne 341-347
**Problème** : `border: 1px solid #ccc` sur fond blanc = ratio de contraste 1.6:1. WCAG 2.2 AA exige 3:1 pour les composants UI interactifs.

**Correction** — remplacer `#ccc` par `#999` (ratio ~2.8:1) ou `#767676` (ratio 4.6:1) sur tous les inputs :

```css
/* Dans .admin-login-page input[type="password"] */
border: 1px solid #999;

/* Dans .admin-form input[type="text"], .admin-form input[type="number"], .admin-form select, .admin-form textarea */
border: 1px solid #999;

/* Dans .dynamic-list-item input */
border: 1px solid #999;

/* Dans .btn */
border: 1px solid #999;

/* Dans .admin-filters button */
border: 1px solid #999;

/* Dans .admin-nav .btn-logout */
border: 1px solid #999;
```

---

### P1 — Requis (lisibilité, cohérence, standard)

---

#### P1-1 — Colonnes monétaires non alignées à droite dans les tableaux
**Fichier** : `admin.css` lignes 157-162 (règle générale) + `AdminBiens.jsx` lignes 124 (colonne Prix)
**Problème** : colonne Prix alignée à gauche comme le texte. Standard comptable non négociable : toute valeur numérique/monétaire = alignée à droite.

**Correction CSS** — ajouter dans `admin.css` :

```css
.admin-table td.col-price,
.admin-table th.col-price {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
```

**Correction JSX** dans `AdminBiens.jsx` :

```jsx
/* Ligne 115 — <th> */
<th className="col-price">Prix</th>

/* Ligne 124 — <td> */
<td className="col-price">{bien.price}</td>
```

---

#### P1-2 — admin-content non centré et sans padding latéral suffisant
**Fichier** : `admin.css` lignes 95-98
**Problème** : `max-width: 1100px` sans `margin: 0 auto` — le contenu reste collé à gauche sur grand écran. Pas de padding adaptatif selon le viewport.

**Old** :
```css
.admin-content {
  padding: 1.5rem;
  max-width: 1100px;
}
```

**New** :
```css
.admin-content {
  padding: 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}
```

---

#### P1-3 — État actif de la navigation insuffisant (underline seul)
**Fichier** : `admin.css` lignes 65-75
**Problème** : l'état actif est marqué uniquement par `text-decoration: underline` — sur fond `#fafafa`, l'indicateur est trop discret et non conforme à une hiérarchie visuelle claire.

**Old** :
```css
.admin-nav a:hover,
.admin-nav a.active {
  color: #000;
  text-decoration: underline;
}
```

**New** :
```css
.admin-nav a:hover {
  color: #000;
}

.admin-nav a.active {
  color: #000;
  font-weight: 600;
  border-bottom: 2px solid #111;
  padding-bottom: 2px;
}
```

---

#### P1-4 — Responsive formulaires cassé : form-row sans breakpoint mobile
**Fichier** : `admin.css` lignes 297-304
**Problème** : `.form-row` est `display: flex` sans media query — sur mobile (< 640px), les champs côte à côte deviennent trop étroits et inusuables.

**Correction** — ajouter après la règle `.form-row` :

```css
@media (max-width: 640px) {
  .admin-form .form-row {
    flex-direction: column;
    gap: 0;
  }

  .admin-content {
    padding: 1rem 0.75rem;
  }

  .admin-nav {
    gap: 0.75rem;
    padding: 0.75rem 1rem;
  }

  .admin-table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

---

#### P1-5 — Padding vertical des inputs trop serré (0.45rem)
**Fichier** : `admin.css` lignes 279-290
**Problème** : `padding: 0.45rem 0.65rem` = ~7px vertical. Les inputs paraissent étriqués et difficiles à cliquer/toucher (touch target < 44px).

**Old** :
```css
.admin-form input[type="text"],
.admin-form input[type="number"],
.admin-form select,
.admin-form textarea {
  width: 100%;
  padding: 0.45rem 0.65rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  box-sizing: border-box;
}
```

**New** :
```css
.admin-form input[type="text"],
.admin-form input[type="number"],
.admin-form select,
.admin-form textarea {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid #999;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 150ms ease;
}

.admin-form input[type="text"]:hover,
.admin-form input[type="number"]:hover,
.admin-form select:hover {
  border-color: #666;
}
```

---

#### P1-6 — Inline styles dans les fichiers JSX (dette design)
**Fichiers** : `AdminBiens.jsx` ligne 132, `AdminRealisations.jsx` ligne 141, `AdminBienForm.jsx` ligne 388, `AdminRealisationForm.jsx` ligne 244
**Problème** : `style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}` et `style={{ marginTop: '0.35rem' }}` dupliqués. Ces styles doivent vivre dans `admin.css`.

**Correction CSS** — ajouter dans `admin.css` :

```css
/* Actions inline dans les cellules de tableau */
.table-actions {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  align-items: center;
}

/* Bouton d'ajout sous une dynamic-list */
.dynamic-list-add {
  margin-top: 0.35rem;
}
```

**Correction JSX** `AdminBiens.jsx` ligne 132 :
```jsx
/* Old */
<div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>

/* New */
<div className="table-actions">
```

Idem dans `AdminRealisations.jsx` ligne 141.

**Correction JSX** `AdminBienForm.jsx` lignes 388 et 411 :
```jsx
/* Old */
<button type="button" className="btn btn-sm" onClick={() => handleListAdd('works')} style={{ marginTop: '0.35rem' }}>

/* New */
<button type="button" className="btn btn-sm dynamic-list-add" onClick={() => handleListAdd('works')}>
```

Idem pour `features` ligne 411.

---

#### P1-7 — AdminBienForm : pas de breadcrumb/retour sur les pages formulaire
**Fichier** : `AdminBienForm.jsx` ligne 243, `AdminRealisationForm.jsx` ligne 199
**Problème** : le header de formulaire affiche juste un `<h2>` — aucun contexte de navigation. L'utilisateur ne sait pas où il est dans la hiérarchie sans regarder la nav.

**Correction JSX** dans `AdminBienForm.jsx` — modifier le `admin-section-header` :

```jsx
<div className="admin-section-header">
  <div>
    <Link to="/admin/biens" className="admin-breadcrumb">← Biens</Link>
    <h2>{isEdit ? 'Modifier le bien' : 'Ajouter un bien'}</h2>
  </div>
</div>
```

Idem dans `AdminRealisationForm.jsx` avec `← Réalisations` et `/admin/realisations`.

**Correction CSS** — ajouter dans `admin.css` :

```css
.admin-breadcrumb {
  display: inline-block;
  font-size: 0.8rem;
  color: #777;
  text-decoration: none;
  margin-bottom: 0.25rem;
}

.admin-breadcrumb:hover {
  color: #333;
}
```

---

#### P1-8 — `window.confirm` et `alert` natifs — incohérence visuelle
**Fichiers** : `AdminBiens.jsx` lignes 43, 50, `AdminRealisations.jsx` lignes 43, 49, `AdminInscrits.jsx` ligne 29, `AdminBienForm.jsx` lignes 159, 164
**Problème** : `window.confirm()` et `alert()` bloquent le thread JS, ont une apparence OS native sans rapport avec le design admin, et sont non accessibles sur certains navigateurs en mode sandboxé (Replit/iframes). Ce pattern est documenté comme anti-pattern dans tous les design systems modernes.
**Note** : correction complète (modale custom) = P2 par complexité. Correction minimale acceptable = P1.

**Correction minimale** — remplacer les `alert()` (non bloquants en termes de UX) par un setState sur un message d'erreur inline. Exemple dans `AdminBiens.jsx` :

```jsx
/* Old (ligne 50) */
alert('Erreur lors de la suppression.');

/* New */
setError('Erreur lors de la suppression. Réessayer.');
```

Les `window.confirm` peuvent rester en P1 si la correction complète (modale) est reportée en P2.

---

### P2 — Améliorations (confort et polish)

---

#### P2-1 — Input file natif non stylé pour les photos
**Fichier** : `AdminBienForm.jsx` ligne 441, `AdminRealisationForm.jsx` ligne 310
**Problème** : `<input type="file">` affiché tel quel par le navigateur — rupture totale de cohérence visuelle.

**Correction** — masquer l'input natif et ajouter un bouton stylé :

```jsx
<label className="btn btn-file-upload" htmlFor={`file-upload-${isEdit ? id : 'new'}`}>
  + Sélectionner des photos
</label>
<input
  id={`file-upload-${isEdit ? id : 'new'}`}
  type="file"
  accept="image/jpeg,image/png,image/webp"
  multiple
  onChange={handlePhotoSelect}
  style={{ display: 'none' }}
/>
```

**CSS** à ajouter :

```css
.btn-file-upload {
  display: inline-block;
  padding: 0.4rem 0.85rem;
  border: 1px dashed #999;
  border-radius: 4px;
  background: #fafafa;
  color: #555;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: none;
  line-height: 1.4;
  transition: border-color 150ms ease, background 150ms ease;
}

.btn-file-upload:hover {
  border-color: #333;
  background: #f0f0f0;
  color: #111;
}
```

---

#### P2-2 — Colonne "Featured" dans AdminRealisations peu lisible
**Fichier** : `AdminRealisations.jsx` ligne 139
**Problème** : `{project.featured ? 'Oui' : '—'}` — pas de distinction visuelle. Une pastille ou icône serait plus lisible.

**Correction JSX** :

```jsx
/* Old */
<td>{project.featured ? 'Oui' : '—'}</td>

/* New */
<td>
  {project.featured
    ? <span className="status-badge status-disponible">Featured</span>
    : <span style={{ color: '#ccc' }}>—</span>}
</td>
```

---

#### P2-3 — Messages d'état (loading, error, empty) trop discrets
**Fichier** : `admin.css` lignes 393-425
**Problème** : `.admin-loading` et `.admin-empty` sont des `<p>` avec `color: #999` — invisibles sur fond blanc, pas de structure visuelle.

**Correction CSS** :

```css
.admin-empty {
  text-align: center;
  color: #777;
  padding: 3rem 2rem;
  font-size: 0.9rem;
  border: 1px dashed #e5e5e5;
  border-radius: 6px;
  margin-top: 1rem;
  background: #fafafa;
}

.admin-loading {
  color: #777;
  padding: 1rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-loading::before {
  content: '';
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #e5e5e5;
  border-top-color: #555;
  border-radius: 50%;
  animation: admin-spin 0.7s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .admin-loading::before {
    animation: none;
    border-top-color: #555;
  }
}

@keyframes admin-spin {
  to { transform: rotate(360deg); }
}
```

---

#### P2-4 — Statut dans le select du formulaire affiché en anglais/slug
**Fichier** : `AdminBienForm.jsx` ligne 360-363
**Problème** : le select Statut affiche `disponible`, `archive`, `vendu` — les valeurs brutes de la BDD, pas des labels humains.

**Old** :
```jsx
<select name="status" value={form.status} onChange={handleChange}>
  {STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}
</select>
```

**New** :
```jsx
const STATUS_LABELS_FORM = { disponible: 'Disponible', archive: 'Archivé', vendu: 'Vendu' };

<select name="status" value={form.status} onChange={handleChange}>
  {STATUS_VALUES.map((s) => <option key={s} value={s}>{STATUS_LABELS_FORM[s] || s}</option>)}
</select>
```

---

#### P2-5 — AdminInscrits sans export CSV
**Fichier** : `AdminInscrits.jsx`
**Problème** : la liste des inscrits n'est pas exportable. Pour une utilisation réelle (newsletter, emailing), l'export CSV est indispensable.

**Correction** — ajouter un bouton export dans le `admin-section-header` :

```jsx
function exportCsv() {
  const rows = [
    ['Email', 'Date inscription'],
    ...subscribers.map((s) => [s.email, formatDate(s.created_at)]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inscrits-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* Dans le JSX, ajouter dans admin-section-header : */
<button className="btn" onClick={exportCsv} disabled={subscribers.length === 0}>
  Exporter CSV
</button>
```

---

## Récapitulatif des corrections

| ID | Priorité | Fichier | Description | Impact |
|----|----------|---------|-------------|--------|
| P0-1 | BLOQUANT | admin.css | Ajouter focus-visible sur tous les interactifs | Accessibilité WCAG 2.2 AA |
| P0-2 | BLOQUANT | AdminLogin.jsx | Ajouter label associé à l'input password | Accessibilité WCAG 1.3.1 |
| P0-3 | BLOQUANT | admin.css + AdminBienForm + AdminRealisationForm | Agrandir bouton photo-remove (28px) + aria-label | Accessibilité + touch target |
| P0-4 | BLOQUANT | admin.css | Passer les bordures de #ccc à #999 | Contraste WCAG 2.2 AA |
| P1-1 | REQUIS | admin.css + AdminBiens | Aligner les prix à droite | Standard comptable |
| P1-2 | REQUIS | admin.css | Centrer admin-content (margin: 0 auto) | Lisibilité desktop |
| P1-3 | REQUIS | admin.css | État actif nav = border-bottom 2px + font-weight 600 | Navigation claire |
| P1-4 | REQUIS | admin.css | Media query mobile pour form-row + table overflow | Responsive |
| P1-5 | REQUIS | admin.css | Padding inputs 0.55rem + hover border | Touch target + confort |
| P1-6 | REQUIS | admin.css + JSX ×4 | Éradiquer les inline styles → classes CSS | Cohérence design system |
| P1-7 | REQUIS | AdminBienForm + AdminRealisationForm | Ajouter breadcrumb ← retour | Navigation contextuelle |
| P1-8 | REQUIS | AdminBiens + AdminRealisations + AdminInscrits | Remplacer alert() par setState inline | Cohérence visuelle |
| P2-1 | AMÉLIOR. | AdminBienForm + AdminRealisationForm | Styliser l'input file | Polish visuel |
| P2-2 | AMÉLIOR. | AdminRealisations | Pastille Featured au lieu de texte brut | Lisibilité |
| P2-3 | AMÉLIOR. | admin.css | Enrichir états loading/empty avec icône spinner | Feedback utilisateur |
| P2-4 | AMÉLIOR. | AdminBienForm | Labels humains dans le select Statut | UX formulaire |
| P2-5 | AMÉLIOR. | AdminInscrits | Ajouter export CSV | Fonctionnalité métier |

---

## Score projeté après corrections

| Phase | Corrections appliquées | Note estimée |
|-------|----------------------|--------------|
| Actuel | Aucune | 6.3/10 |
| Après P0 | P0-1 à P0-4 | 7.5/10 |
| Après P0+P1 | P0 + P1-1 à P1-8 | 8.8/10 |
| Après P0+P1+P2 | Toutes corrections | 9.5/10 |

Le 10/10 absolu nécessiterait une modale de confirmation custom (remplacement des `window.confirm`) et un dark mode — hors périmètre de cet audit.

---

**Handoff → @fullstack**
- Fichiers produits : `/home/user/Versi/docs/reviews/backoffice-audit-design.md`
- Corrections P0 à appliquer en priorité : focus-visible (admin.css), label password (AdminLogin.jsx), aria-label photo-remove (AdminBienForm + AdminRealisationForm), bordures #ccc → #999 (admin.css)
- Corrections P1 : alignement prix droite, centrage admin-content, état actif nav, responsive form-row, padding inputs, éradication inline styles, breadcrumbs, alert() → setState
- Corrections P2 : input file stylé, export CSV inscrits, spinner loading, labels statut humains
- Point d'attention responsive : `form-row` est actuellement cassé sous 640px — priorité tablette/mobile si Thomas ou les fondateurs utilisent l'admin depuis un iPad
