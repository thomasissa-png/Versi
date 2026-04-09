import { useFadeIn } from '../hooks/useFadeIn.js';
import './Stats.css';

const STATS = [
  { value: 'X+', label: 'Opérations réalisées' },
  { value: 'X M€', label: 'Volume traité' },
  { value: '7J', label: 'Délai de décision' },
];

export default function Stats() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="stats section-padding" ref={ref}>
      <div className={`stats__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        {STATS.map((stat) => (
          <div key={stat.label} className="stats__item">
            <span className="text-stat stats__value">{stat.value}</span>
            <span className="text-label stats__label">{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
