import { useState, useEffect } from 'react';
import { useFadeIn } from '../hooks/useFadeIn.js';
import './BuyerFAQ.css';

const FAQ_ITEMS = [
  {
    id: 'faq-mdb',
    question: 'Qu’est-ce qu’un bien vendu par un marchand de biens ?',
    answer:
      'Un marchand de biens achète des biens immobiliers, les rénove, puis les revend en direct. Pas d’agence, pas d’intermédiaire. Chez Versi Immobilier, les trois fondateurs sélectionnent, acquièrent et supervisent chaque chantier personnellement.',
  },
  {
    id: 'faq-frais',
    question: 'Y a-t-il des frais d’agence ?',
    answer:
      'Non. Versi Immobilier vend en direct du propriétaire à l’acquéreur. Aucune commission d’agence n’est facturée à l’acheteur. Le prix affiché est le prix de vente net.',
  },
  {
    id: 'faq-garanties',
    question: 'Quelles garanties ai-je sur un bien rénové ?',
    answer:
      'Chaque bien est livré avec des diagnostics complets, l’historique détaillé des travaux réalisés et une garantie décennale sur les parties structurelles. L’assurance dommages-ouvrage est souscrite avant le démarrage du chantier. Le dossier complet est remis avant la visite.',
  },
  {
    id: 'faq-visite',
    question: 'Comment se passe la visite et l’achat ?',
    answer:
      'Demande de présentation via le formulaire ou par email. Visite planifiée sous 48 heures avec un fondateur. Dossier technique remis sur place. Si le bien vous convient : offre d’achat, puis signature chez le notaire.',
  },
  {
    id: 'faq-pourquoi',
    question: 'Pourquoi choisir Versi Immobilier plutôt qu’une agence ?',
    answer:
      'Trois différences concrètes : pas de frais d’agence à votre charge, un dossier technique complet fourni avant la visite (diagnostics, historique travaux, garantie décennale), et un interlocuteur unique - le fondateur qui a piloté la rénovation.',
  },
];

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  const answerId = `${item.id}-answer`;

  return (
    <div className="buyer-faq__item">
      <button
        id={item.id}
        className="buyer-faq__question"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={answerId}
      >
        <span>{item.question}</span>
        <span
          className={`buyer-faq__chevron ${open ? 'buyer-faq__chevron--open' : ''}`}
          aria-hidden="true"
        >
          &#x25BE;
        </span>
      </button>
      {open && (
        <div
          className="buyer-faq__answer"
          id={answerId}
          role="region"
          aria-labelledby={item.id}
        >
          <p className="text-body-sm">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function BuyerFAQ() {
  const { ref, isVisible } = useFadeIn();

  /* JSON-LD FAQPage - extractible par LLMs et Google */
  useEffect(() => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    script.id = 'buyer-faq-jsonld';
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('buyer-faq-jsonld');
      if (el) el.remove();
    };
  }, []);

  return (
    <section className="buyer-faq section-padding" ref={ref}>
      <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <div className="buyer-faq__inner">
          <h2 className="text-heading-lg buyer-faq__title">
            Questions fréquentes - Acquéreurs
          </h2>
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
