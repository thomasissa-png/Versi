# Ré-audit design — Back office admin Versi Immobilier

**Date** : 2026-04-11
**Auditeur** : @design
**Contexte** : ré-audit après corrections P0/P1/P2 suite à l'audit initial (6.3/10)
**Périmètre** : `/admin` — Login, Layout, Biens, BienForm, Réalisations, RealisationForm, Inscrits

---

## Note globale : 8.2 / 10 (vs 6.3/10 initial — +1.9 points)

Les corrections P0 accessibilité et P1 lisibilité sont majoritairement appliquées. Le back office est désormais navigable au clavier, les contrastes de bordures sont corrigés, le label password existe. Mais plusieurs corrections sont partiellement faites ou manquées : 4 résidus inline styles sur les boutons d'actions tableau, les colonnes de prix utilisent `style={{ textAlign: 'right' }}` inline au lieu de classes CSS, le breadcrumb retour est un inline style brut non tokenisé, les boutons `photo-remove` ne sont que 28px (toujours sous le minimum 44px tactile), le CSS responsive mobile est partiel (manque `admin-content` et `admin-nav`), et les `alert()` / `window.confirm()` natifs subsistent dans tous les fichiers JSX. L'atteinte du 10/10 ne requiert aucune refonte — uniquement finaliser les corrections engagées.

---

## Delta vs premier audit — Notes par critère

| # | Critère | Note initiale | Note actuelle | Delta | Statut |
|---|---------|--------------|---------------|-------|--------|
| 1 | Cohérence visuelle | 7/10 | 7.5/10 | +0.5 | Inline styles réduits mais 4 subsistent |
| 2 | Hiérarchie de l'information | 7/10 | 8/10 | +1 | Centrage toujours absent (margin: 0 auto manquant) |
| 3 | Lisibilité des tableaux | 6/10 | 8/10 | +2 | Prix aligné droite mais via inline style, pas classe CSS |
| 4 | Formulaires | 7/10 | 8/10 | +1 | Padding inputs 0.45rem toujours en place (non corrigé), statut en slug dans AdminBienForm |
| 5 | États UI | 7/10 | 7.5/10 | +0.5 | Toast succès ajouté sur AdminBiens/AdminRealisations, spinner loading absent |
| 6 | Responsive admin | 4/10 | 7/10 | +3 | form-row empile sur mobile, mais padding admin-content mobile absent, tableau overflow absent |
| 7 | Feedback utilisateur | 7/10 | 7.5/10 | +0.5 | alert() et window.confirm() natifs subsistent partout |
| 8 | Navigation | 6/10 | 8/10 | +2 | État actif border-bottom 2px + font-weight 600 appliqué, breadcrumb retour présent mais inline style |
| 9 | Upload photos | 7/10 | 8/10 | +1 | aria-label présent sur photo-remove, mais bouton toujours 28px (< 44px tactile) et input file non stylé |
| 10 | Accessibilité minimale | 4/10 | 9/10 | +5 | Focus-visible complet, label password ajouté, bordures #999 appliquées |

---

## Vérification corrections par correction demandée

### P0-1 — Focus-visible : APPLIQUÉ (complet)
`admin.css` lignes 427-443 : règle générique couvrant `.admin-layout`, `.admin-page`, `.admin-login-page` sur tous les interactifs (button, input, select, textarea, a). Outline 2px solid #111, offset 2px. Conforme WCAG 2.2 AA. Note : la règle est plus large que ce qui était demandé (on couvre tout le layout, pas seulement les sélecteurs nommés) — c'est mieux.

### P0-2 — Label password : APPLIQUÉ
`AdminLogin.jsx` ligne 62 : `<label htmlFor="admin-password">Mot de passe</label>` présent. Input avec `id="admin-password"`. Association label/input correcte. Note résiduelle : le label utilise un inline style `{ display: 'block', marginBottom: '8px', fontWeight: 500 }` — ces valeurs devraient vivre dans `.admin-login-page label`. Mineur.

### P0-3 — photo-remove 28px + aria-label : PARTIELLEMENT APPLIQUÉ
- aria-label "Supprimer cette photo" : PRÉSENT dans AdminBienForm (lignes 437, 467) et AdminRealisationForm (lignes 302, 332). Correct.
- Taille 28px : la règle en bas du CSS (lignes 446-452) force `width: 28px; height: 28px` mais elle override la règle de base (lignes 373-389) qui reste à 20px. La règle secondaire l'écrase donc bien, mais l'architecture est redondante. Résultat : 28px effectifs. Toutefois, 28px reste sous le minimum tactile mobile de 44px — la correction demandée était 28px mais le standard WCAG 2.2 AA exige 44px. Point à signaler.

### P0-4 — Bordures #ccc → #999 : APPLIQUÉ
Tous les inputs vérifés : `.admin-login-page input[type="password"]` ligne 29 = `#999`, `.admin-form` inputs ligne 285 = `#999`, `.dynamic-list-item input` ligne 343 = `#999`, `.btn` ligne 105 = `#999`, `.admin-filters button` ligne 225 = `#999`, `.admin-nav .btn-logout` ligne 83 = `#999`. Complet.

### P1-1 — Colonnes monétaires droite : PARTIELLEMENT APPLIQUÉ
`AdminBiens.jsx` lignes 125 et 135 : `style={{ textAlign: 'right' }}` inline directement sur les `<th>` et `<td>`. L'alignement est correct visuellement mais la méthode est incorrecte — la correction demandait une classe `.col-price` dans le CSS. L'inline style n'est pas dans le design system. Régression par rapport à P1-6 (éradication des inline styles).

### P1-2 — admin-content centré : NON APPLIQUÉ
`admin.css` lignes 95-98 : `.admin-content { padding: 1.5rem; max-width: 1100px; }` — `margin: 0 auto` et `width: 100%` sont absents. Le contenu reste collé à gauche sur desktop. Cette correction n'a pas été appliquée.

### P1-3 — État actif nav : APPLIQUÉ
`admin.css` lignes 474-480 : `.admin-nav a.active { font-weight: 600; border-bottom: 2px solid #111; text-decoration: none; padding-bottom: 2px; }`. Correct. Mais le `hover` générique (lignes 71-75) combine encore `text-decoration: underline` sur le hover — ce n'était pas la correction demandée pour le hover (qui était `color: #000` seul). Le hover actuel affiche underline ET peut interférer avec le border-bottom sur l'élément actif. Mineur.

### P1-4 — Responsive mobile form-row : PARTIELLEMENT APPLIQUÉ
`admin.css` lignes 482-491 : media query `@media (max-width: 640px)` présente avec `flex-direction: column` sur `.form-row`. Correct pour les formulaires. Mais les deux corrections supplémentaires de la même media query manquent : `admin-content { padding: 1rem 0.75rem }` et `admin-nav { gap: 0.75rem; padding: 0.75rem 1rem }`, et surtout `.admin-table { display: block; overflow-x: auto }` pour le scroll horizontal du tableau sur mobile.

### P1-5 — Padding inputs 0.55rem : NON APPLIQUÉ
`admin.css` ligne 284 : `.admin-form input[type="text"], .admin-form input[type="number"], .admin-form select, .admin-form textarea { padding: 0.45rem 0.65rem; }` — toujours à 0.45rem. La correction vers 0.55rem n'a pas été appliquée. De même, la transition `border-color 150ms ease` et les états `:hover` des inputs sont absents.

### P1-6 — Éradication inline styles : PARTIELLEMENT APPLIQUÉ
Restant à corriger :
- `AdminBiens.jsx` ligne 142 : `<div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>` — toujours inline
- `AdminRealisations.jsx` ligne 150 : `<div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>` — toujours inline
- `AdminBienForm.jsx` lignes 396 et 419 : boutons `+ Ajouter un item` avec `style={{ marginTop: '0.35rem' }}` — toujours inline
- `AdminBienForm.jsx` ligne 248 : lien retour `style={{ color: '#666', textDecoration: 'none', fontSize: '14px', marginBottom: '16px', display: 'inline-block' }}` — inline style brut non prévu dans la correction originale mais nouveau inline style introduit
- `AdminRealisationForm.jsx` ligne 198 : même lien retour en inline style
- Classes `.table-actions` et `.dynamic-list-add` non ajoutées dans `admin.css`

### P1-7 — Breadcrumb retour : PARTIELLEMENT APPLIQUÉ
Un lien retour est présent (`← Retour aux biens` dans AdminBienForm ligne 248, `← Retour aux réalisations` dans AdminRealisationForm ligne 198) mais :
1. Le style est un inline style brut, pas la classe `.admin-breadcrumb` demandée
2. La classe `.admin-breadcrumb` n'est pas dans `admin.css`
3. Le lien est placé AVANT le `admin-section-header` au lieu d'être intégré dedans comme dans la correction demandée

### P1-8 — alert() → setState : NON APPLIQUÉ
Les `alert()` et `window.confirm()` natifs subsistent dans tous les fichiers :
- `AdminBiens.jsx` lignes 49, 57, 74 : `window.confirm`, `alert`
- `AdminRealisations.jsx` lignes 49, 57, 68, 83 : `window.confirm`, `alert`
- `AdminInscrits.jsx` lignes 29, 35 : `window.confirm`, `alert`
- `AdminBienForm.jsx` lignes 158, 163 : `window.confirm`, `alert`
- `AdminRealisationForm.jsx` lignes 121, 126 : `window.confirm`, `alert`

### P2-1 — Input file stylé : NON APPLIQUÉ
`AdminBienForm.jsx` ligne 450 et `AdminRealisationForm.jsx` ligne 314 : `<input type="file">` natif non stylé, visible tel quel. La classe `.btn-file-upload` n'existe pas dans `admin.css`.

### P2-2 — Pastille Featured : NON APPLIQUÉ
`AdminRealisations.jsx` ligne 148 : `{project.featured ? 'Oui' : '—'}` — texte brut, pas de pastille.

### P2-3 — Spinner loading : NON APPLIQUÉ
`.admin-loading` dans `admin.css` lignes 406-410 : toujours un simple `<p>` avec couleur grise. Pas de spinner CSS ni d'animation. La media query `prefers-reduced-motion` pour le spinner est donc absente.

### P2-4 — Labels statut humains dans select : NON APPLIQUÉ (AdminBienForm)
`AdminBienForm.jsx` ligne 369 : `{STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}` — les valeurs brutes `disponible`, `archive`, `vendu` sont affichées sans label humain. Note : `AdminRealisationForm.jsx` ligne 241 utilise `STATUS_LABELS[s]` — correct pour les réalisations, mais pas pour les biens.

### P2-5 — Export CSV inscrits : NON APPLIQUÉ
`AdminInscrits.jsx` : pas de bouton export CSV, pas de fonction `exportCsv()`.

---

## Corrections restantes pour 10/10

Les corrections sont listées par ordre de criticité. Les P0/P1 restants sont ce qui empêche le 10/10.

---

### R1 — admin-content centré [P1 — non appliqué]
**Fichier** : `admin.css` lignes 95-98

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

### R2 — Padding inputs 0.45rem → 0.55rem + hover state [P1 — non appliqué]
**Fichier** : `admin.css` lignes 279-290

**Old** :
```css
.admin-form input[type="text"],
.admin-form input[type="number"],
.admin-form select,
.admin-form textarea {
  width: 100%;
  padding: 0.45rem 0.65rem;
  border: 1px solid #999;
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

### R3 — Inline styles dans les cellules tableau : remplacer par classes CSS [P1 — partiellement appliqué]
**Fichier** : `admin.css` — ajouter avant la media query mobile :

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

/* Colonnes monétaires */
.admin-table td.col-price,
.admin-table th.col-price {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Lien breadcrumb retour */
.admin-breadcrumb {
  display: inline-block;
  font-size: 0.85rem;
  color: #777;
  text-decoration: none;
  margin-bottom: 0.5rem;
}

.admin-breadcrumb:hover {
  color: #333;
  text-decoration: underline;
}
```

**Fichier** : `AdminBiens.jsx` — 3 changements :

```jsx
/* Ligne 125 — <th> Prix */
/* Old */
<th style={{ textAlign: 'right' }}>Prix</th>
/* New */
<th className="col-price">Prix</th>

/* Ligne 135 — <td> prix */
/* Old */
<td style={{ textAlign: 'right' }}>{bien.price}</td>
/* New */
<td className="col-price">{bien.price}</td>

/* Ligne 142 — div actions */
/* Old */
<div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
/* New */
<div className="table-actions">
```

**Fichier** : `AdminRealisations.jsx` — 1 changement :

```jsx
/* Ligne 150 */
/* Old */
<div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
/* New */
<div className="table-actions">
```

**Fichier** : `AdminBienForm.jsx` — 3 changements :

```jsx
/* Ligne 248 — lien retour */
/* Old */
<Link to="/admin/biens" style={{ color: '#666', textDecoration: 'none', fontSize: '14px', marginBottom: '16px', display: 'inline-block' }}>
  ← Retour aux biens
</Link>
/* New */
<Link to="/admin/biens" className="admin-breadcrumb">
  ← Retour aux biens
</Link>

/* Ligne 396 — bouton Ajouter works */
/* Old */
<button type="button" className="btn btn-sm" onClick={() => handleListAdd('works')} style={{ marginTop: '0.35rem' }}>
/* New */
<button type="button" className="btn btn-sm dynamic-list-add" onClick={() => handleListAdd('works')}>

/* Ligne 419 — bouton Ajouter features */
/* Old */
<button type="button" className="btn btn-sm" onClick={() => handleListAdd('features')} style={{ marginTop: '0.35rem' }}>
/* New */
<button type="button" className="btn btn-sm dynamic-list-add" onClick={() => handleListAdd('features')}>
```

**Fichier** : `AdminRealisationForm.jsx` — 1 changement :

```jsx
/* Ligne 198 — lien retour */
/* Old */
<Link to="/admin/realisations" style={{ color: '#666', textDecoration: 'none', fontSize: '14px', marginBottom: '16px', display: 'inline-block' }}>
  ← Retour aux réalisations
</Link>
/* New */
<Link to="/admin/realisations" className="admin-breadcrumb">
  ← Retour aux réalisations
</Link>
```

---

### R4 — Responsive mobile : padding admin-content + overflow tableau [P1 — partiellement appliqué]
**Fichier** : `admin.css` — compléter la media query existante (lignes 482-491) :

**Old** :
```css
@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
  }
  .form-row > * {
    width: 100% !important;
    min-width: 0 !important;
  }
}
```

**New** :
```css
@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
  }
  .form-row > * {
    width: 100% !important;
    min-width: 0 !important;
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

### R5 — alert() → setState inline [P1 — non appliqué]
Les `alert()` sur les erreurs de suppression doivent être remplacés par des setState sur le state `error` existant dans chaque composant.

**AdminBiens.jsx** — 2 remplacements :

```jsx
/* Ligne 57 — catch de la suppression */
/* Old */
alert('Erreur lors de la suppression.');
/* New */
setError('Erreur lors de la suppression. Réessayer.');

/* Ligne 74 — catch des actions archive/vendu/restaurer */
/* Old */
alert('Erreur lors de la mise à jour.');
/* New */
setError('Erreur lors de la mise à jour. Réessayer.');
```

**AdminRealisations.jsx** — 3 remplacements :

```jsx
/* Ligne 57 — catch de la suppression */
/* Old */
alert('Erreur lors de la suppression.');
/* New */
setError('Erreur lors de la suppression. Réessayer.');

/* Ligne 68 — catch de l'archivage */
/* Old */
alert('Erreur lors de l\'archivage.');
/* New */
setError('Erreur lors de l\'archivage. Réessayer.');

/* Ligne 83 — catch de complete */
/* Old */
alert('Erreur lors de la mise à jour.');
/* New */
setError('Erreur lors de la mise à jour. Réessayer.');
```

**AdminInscrits.jsx** — 1 remplacement :

```jsx
/* Ligne 35 — catch de handleDelete */
/* Old */
alert('Erreur lors de la suppression.');
/* New */
setError('Erreur lors de la suppression. Réessayer.');
```

Ajouter l'affichage de l'erreur dans le JSX d'AdminInscrits (avant le tableau, après le counter) :

```jsx
{error && <p className="admin-error">{error}</p>}
```

**AdminBienForm.jsx** — 1 remplacement :

```jsx
/* Ligne 163 — catch de handleDeleteExistingPhoto */
/* Old */
alert('Erreur lors de la suppression de la photo.');
/* New */
setError('Erreur lors de la suppression de la photo.');
```

**AdminRealisationForm.jsx** — 1 remplacement :

```jsx
/* Ligne 126 — catch de handleDeleteExistingPhoto */
/* Old */
alert('Erreur lors de la suppression de la photo.');
/* New */
setError('Erreur lors de la suppression de la photo.');
```

Note : les `window.confirm()` sont maintenus (P2 — modale custom). Seuls les `alert()` d'erreur sont remplacés.

---

### R6 — Labels statut humains dans AdminBienForm [P2 — non appliqué]
**Fichier** : `AdminBienForm.jsx`

Ajouter après la ligne `const STATUS_VALUES = ['disponible', 'archive', 'vendu'];` (ligne 9) :

```jsx
const STATUS_LABELS_FORM = { disponible: 'Disponible', archive: 'Archivé', vendu: 'Vendu' };
```

Modifier le select statut (ligne 369) :

```jsx
/* Old */
{STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}

/* New */
{STATUS_VALUES.map((s) => <option key={s} value={s}>{STATUS_LABELS_FORM[s] || s}</option>)}
```

---

### R7 — Label inline style dans AdminLogin → classe CSS [mineur]
**Fichier** : `AdminLogin.jsx` ligne 62

**Old** :
```jsx
<label htmlFor="admin-password" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Mot de passe</label>
```

**New** :
```jsx
<label htmlFor="admin-password">Mot de passe</label>
```

Le CSS `.admin-login-page label` existe déjà avec `display: block; font-size: 0.85rem; font-weight: 500;` via `.admin-form label` — mais `.admin-login-page` n'a pas de règle label propre. Ajouter dans `admin.css` après la règle `.admin-login-page .error-msg` :

```css
.admin-login-page label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
}
```

---

### R8 — Spinner loading et état empty enrichi [P2 — non appliqué]
**Fichier** : `admin.css` — remplacer `.admin-loading` et `.admin-empty` (lignes 393-410) :

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
  }
}

@keyframes admin-spin {
  to { transform: rotate(360deg); }
}
```

---

### R9 — Input file stylé [P2 — non appliqué]
**Fichier** : `admin.css` — ajouter avant la media query mobile :

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

**Fichier** : `AdminBienForm.jsx` — remplacer l'input file (ligne 450-454) :

```jsx
/* Old */
<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  multiple
  onChange={handlePhotoSelect}
/>

/* New */
<label className="btn-file-upload" htmlFor="file-upload-bien">
  + Sélectionner des photos
</label>
<input
  id="file-upload-bien"
  type="file"
  accept="image/jpeg,image/png,image/webp"
  multiple
  onChange={handlePhotoSelect}
  style={{ display: 'none' }}
/>
```

Idem dans `AdminRealisationForm.jsx` (ligne 314-318) avec `id="file-upload-realisation"`.

---

### R10 — Export CSV inscrits [P2 — non appliqué]
**Fichier** : `AdminInscrits.jsx` — ajouter la fonction avant le return, et le bouton dans le `admin-section-header` :

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

/* Dans le JSX, modifier admin-section-header : */
<div className="admin-section-header">
  <h2>Inscrits aux notifications</h2>
  <button className="btn" onClick={exportCsv} disabled={subscribers.length === 0}>
    Exporter CSV
  </button>
</div>
```

---

### R11 — Pastille Featured dans AdminRealisations [P2 — non appliqué]
**Fichier** : `AdminRealisations.jsx` ligne 148

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

## Verdict final

### Récapitulatif des corrections restantes pour 10/10

| ID | Priorité | Fichier(s) | Description | Impact note |
|----|----------|-----------|-------------|-------------|
| R1 | P1 non appliqué | admin.css | margin: 0 auto + width: 100% sur admin-content | +0.3 |
| R2 | P1 non appliqué | admin.css | Padding inputs 0.45 → 0.55rem + hover state | +0.2 |
| R3 | P1 partiel | admin.css + AdminBiens + AdminRealisations + AdminBienForm + AdminRealisationForm | Classes CSS (.table-actions, .dynamic-list-add, .col-price, .admin-breadcrumb) + éradication 6 inline styles | +0.5 |
| R4 | P1 partiel | admin.css | Media query mobile : admin-content padding + admin-nav + table overflow-x | +0.3 |
| R5 | P1 non appliqué | AdminBiens + AdminRealisations + AdminInscrits + AdminBienForm + AdminRealisationForm | 8 alert() → setError() | +0.3 |
| R6 | P2 non appliqué | AdminBienForm | Labels humains select statut (disponible → Disponible, etc.) | +0.1 |
| R7 | Mineur | AdminLogin + admin.css | Label mot de passe inline style → classe CSS | +0.05 |
| R8 | P2 non appliqué | admin.css | Spinner loading CSS + admin-empty enrichi | +0.1 |
| R9 | P2 non appliqué | admin.css + AdminBienForm + AdminRealisationForm | Input file stylé (.btn-file-upload) | +0.1 |
| R10 | P2 non appliqué | AdminInscrits | Export CSV inscrits | +0.1 |
| R11 | P2 non appliqué | AdminRealisations | Pastille Featured au lieu de texte brut | +0.05 |

**Total delta estimé** : +1.8 points → **note cible après R1-R11 : 10/10**

### Score projeté

| Phase | Note |
|-------|------|
| Audit initial | 6.3/10 |
| Après corrections actuelles | 8.2/10 |
| Après R1+R2+R3+R4+R5 (P1) | 9.3/10 |
| Après R1 à R11 (tout) | 10/10 |

### Note sur les corrections P0/P1 correctement appliquées (à ne pas toucher)

- Focus-visible : complet et conforme, architecture en surcharge correcte
- Label password AdminLogin : présent et fonctionnel
- Bordures #999 : appliquées partout
- Toast succès AdminBiens/AdminRealisations : présent
- État actif nav border-bottom 2px : appliqué
- aria-label photo-remove : présent dans les deux formulaires
- form-row flex-direction: column mobile : présent

---

**Handoff → @fullstack**
- Fichiers produits : `/home/user/Versi/docs/reviews/backoffice-reaudit-design.md`
- Corrections à appliquer : R1 à R11, dans l'ordre R3 → R1 → R4 → R5 → R2 → R6 → R7 → R8 → R9 → R10 → R11
- Priorité absolue : R3 (6 inline styles CSS + classes manquantes), R1 (centrage admin-content), R4 (responsive tableau), R5 (alert → setState)
- Point d'attention : R3 touche 5 fichiers simultanément — commencer par les classes CSS dans admin.css avant les JSX
