import { useState } from 'react';
import { useFadeIn } from '../hooks/useFadeIn.js';

const QUESTIONS = [
  {
    q: "Qu’est-ce que Versi ?",
    a: "Versi est une holding immobilière intégrée opérant en France. Elle regroupe quatre entités complémentaires couvrant l’ensemble du cycle d’une opération immobilière : Versi Immobilier (marchand de biens), Versi Invest (structuration d’investissement), Versi Capital (foncière) et Versi Finance (ingénierie financière). Fondée par Thomas Issa, Maxime Lemoine et Carl Standertskjold-Nordenstam.",
  },
  {
    q: "En quoi Versi se distingue d’un marchand de biens classique ?",
    a: "Contrairement à un marchand de biens mono-activité, Versi intègre en interne l’ensemble du cycle : acquisition, transformation, détention longue durée via sa foncière (Versi Capital) et structuration financière via Versi Finance. Cette intégration évite la déperdition entre étapes et permet de traiter des opérations complexes sans externalisation des fonctions critiques.",
  },
  {
    q: "Où Versi opère-t-elle en France ?",
    a: "Versi opère principalement sur Paris, Lille et les principales métropoles françaises. La holding cible des actifs immobiliers en France avec une préférence pour les marchés à forte liquidité et potentiel de transformation.",
  },
];

export default function FAQ() {
  const { ref, isVisible } = useFadeIn();
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="section-padding" ref={ref} style={{ background: 'var(--color-bg-secondary)' }}>
      <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <h2 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-2xl)' }}>
          Questions fréquentes
        </h2>
        <div style={{ maxWidth: 'var(--text-max-width-lg)' }}>
          {QUESTIONS.map((item, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--color-border)', padding: 'var(--spacing-lg) 0' }}>
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 0,
                  fontFamily: 'inherit',
                  fontSize: 'var(--font-size-body-lg)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.4,
                }}
                aria-expanded={openIndex === i}
              >
                {item.q}
                <span style={{ flexShrink: 0, marginLeft: 'var(--spacing-md)', fontSize: '1.25rem', transition: 'transform 0.2s' }}>
                  {openIndex === i ? '−' : '+'}
                </span>
              </button>
              {openIndex === i && (
                <p className="text-body-lg" style={{ marginTop: 'var(--spacing-md)', color: 'var(--color-text-muted)', lineHeight: 1.65 }}>
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
