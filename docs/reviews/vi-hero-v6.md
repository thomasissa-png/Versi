# Hero versi-immobilier.fr — V6

Produit par @creative-strategy — 2026-04-10

---

## Diagnostic du problème

Le Hero V5 souffre de trois défauts structurels :

1. **"à Lille" restreint le territoire** — l'expansion en cours rend cette géolocalisation contre-productive
2. **"leurs propriétaires" crée une ambiguïté fatale** — le lecteur comprend "des propriétaires qui vendent eux-mêmes" = site d'annonces PAP
3. **Le sous-titre en 4 lignes explique au lieu d'affirmer** — Versi ne s'explique pas, Versi affirme

Le correctif n'est pas d'éditer le H1 existant. C'est de repartir du brief : donner envie d'acheter un bien rénové par Versi, en 2 lignes, avec du caractère.

---

## 5 Directions de Hero

---

### Direction 1 — L'acte de propriété (factuel, tranchant)

**H1**
```
Nous achetons. Nous rénovons.
Vous achetez.
```

**Sous-titre**
```
Des appartements transformés par Versi — sans intermédiaire, sans délégation.
```

**Pourquoi ça fonctionne**
Trois phrases en miroir qui racontent le cycle en entier : Versi ne décrit pas, il démontre. Le "Vous achetez" final est une invitation directe, pas une description de service.

---

### Direction 2 — La rupture avec l'agence (positionnement par opposition)

**H1**
```
Pas d'agent.
L'appartement vient de nous.
```

**Sous-titre**
```
Acquis, transformé, vendu par les mêmes mains — les nôtres.
```

**Pourquoi ça fonctionne**
"Pas d'agent" frappe fort dès la première ligne : c'est le pain point de l'acheteur immobilier formulé comme une promesse. La deuxième ligne identifie immédiatement qui est Versi dans la chaîne.

---

### Direction 3 — Le cycle maîtrisé (cohérence avec versi.fr)

**H1**
```
Des biens rénovés par Versi.
De A à Z.
```

**Sous-titre**
```
On a acheté, transformé, et maintenant on vous vend — directement.
```

**Pourquoi ça fonctionne**
"De A à Z" résonne avec le positionnement holding ("Quatre métiers. Un cycle maîtrisé.") — cohérence d'écosystème. Le sous-titre convertit le concept en acte concret d'achat.

---

### Direction 4 — La provenance (marque d'origine comme gage de qualité)

**H1**
```
Chaque appartement a une histoire.
On l'a écrite.
```

**Sous-titre**
```
Acquisition, rénovation, vente — Versi connaît le bien mieux que personne.
```

**Pourquoi ça fonctionne**
Joue sur l'asymétrie d'information qui est au coeur de l'achat immobilier : Versi a fait le bien, donc Versi en connaît chaque détail. C'est une promesse de transparence déguisée en storytelling.

---

### Direction 5 — L'affirmation brutale (ton le plus proche de versi.fr)

**H1**
```
On rénove.
On vend.
```

**Sous-titre**
```
Pas d'intermédiaire entre vous et ceux qui ont transformé le bien.
```

**Pourquoi ça fonctionne**
Deux mots. Deux verbes. C'est le niveau de densité de "Nous ne déléguons pas." L'ellipse du sujet est volontaire : Versi n'a pas besoin de se nommer dans le H1 — il est dans le surtitre. Maximal dans la concision.

---

## Recommandation finale

**Direction 2** — "Pas d'agent. L'appartement vient de nous."

Justification du choix :
- Résout immédiatement la confusion "site d'annonces" : "vient de nous" = Versi est le propriétaire vendeur, pas un intermédiaire
- "Pas d'agent" est le premier bénéfice acheteur — économie de commission, contact direct, transparence — sans avoir à l'expliquer
- Le sous-titre "les mêmes mains — les nôtres" injecte l'humain sans tomber dans le storytelling creux
- Niveau de concision identique à versi.fr (4 mots / 6 mots)
- Aucune géolocalisation restrictive
- Zéro ambiguïté sur qui vend quoi

---

## Bloc JSX complet — Prêt à copier-coller

```jsx
{/* Hero Section — versi-immobilier.fr V6 */}
<section className="hero">
  <div className="hero-inner">

    {/* Surtitre */}
    <p className="hero-eyebrow">VERSI IMMOBILIER</p>

    {/* H1 */}
    <h1 className="hero-title">
      Pas d'agent.<br />
      L'appartement vient de nous.
    </h1>

    {/* Sous-titre */}
    <p className="hero-subtitle">
      Acquis, transformé, vendu par les mêmes mains — les nôtres.
    </p>

    {/* CTAs */}
    <div className="hero-cta-group">
      <a href="#biens" className="cta-primary">
        Voir les biens disponibles
      </a>
      <a href="#vendre" className="cta-secondary">
        Vous avez un bien à vendre ? →
      </a>
    </div>

  </div>
</section>
```

---

## Variante de test A/B recommandée

Si la Direction 2 est retenue, tester la Direction 5 ("On rénove. On vend.") en A/B sur les premières semaines. Elle est plus courte encore et peut performer différemment selon le traffic source (cold vs warm).

---

## Ce qui ne change pas

- Surtitre : VERSI IMMOBILIER — conservé, ancre la marque
- Double CTA : acheteur / vendeur — conservé, couvre les deux entrées du funnel
- Structure hero : inchangée, seul le texte est réécrit

---

**Handoff → @fullstack**
- Fichier produit : `docs/reviews/vi-hero-v6.md`
- Décision prise : Direction 2 recommandée ("Pas d'agent. / L'appartement vient de nous.") avec Direction 5 en variante A/B
- Point d'attention : le sous-titre "les mêmes mains — les nôtres" contient un tiret cadratin — vérifier le rendu typographique en production (UTF-8 natif, pas d'entité HTML)
