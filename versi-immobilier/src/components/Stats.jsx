import { PROJECTS } from '../config/projects.js';
import { useFadeIn } from '../hooks/useFadeIn.js';
import './Stats.css';

export default function Stats() {
  const { ref, isVisible } = useFadeIn();

  const stats = [
    { value: '21', label: 'rénovations terminées' },
    { value: '3', label: 'biens disponibles maintenant' },
    { value: '3,2M€', label: 'de volume traité' },
  ];

  return (
    <section className="stats section-padding" ref={ref}>
      <div className={`stats__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        {stats.map((stat) => (
          <div key={stat.label} className="stats__item">
            <span className="text-stat stats__value">{stat.value}</span>
            <span className="text-label stats__label">{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
