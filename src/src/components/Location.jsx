import { useFadeIn } from '../hooks/useFadeIn.js';
import './Location.css';

const CITIES = [
  { name: 'Paris', x: 295, y: 195, active: true },
  { name: 'Lille', x: 280, y: 115, active: true },
  { name: 'Lyon', x: 310, y: 315, active: false },
  { name: 'Bordeaux', x: 175, y: 345, active: false },
  { name: 'Marseille', x: 320, y: 395, active: false },
];

export default function Location() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section id="implantation" className="location section-padding" ref={ref}>
      <div className={`location__inner container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <div className="location__text">
          <span className="text-label location__label">IMPLANTATION</span>
          <h2 className="text-heading-lg location__title">
            Paris. Lille.<br />
            Et les métropoles françaises.
          </h2>
          <p className="text-body-lg location__subtitle">
            Paris et Lille en opérations actives. Lyon, Bordeaux, Marseille en veille — chaque extension est une décision, pas une ambition affichée.
          </p>
          <div className="location__legend">
            <span className="location__legend-item">
              <span className="location__dot location__dot--active" />
              Présence active
            </span>
            <span className="location__legend-item">
              <span className="location__dot location__dot--extension" />
              Zone d'extension
            </span>
          </div>
        </div>
        <div className="location__map">
          <svg
            viewBox="0 0 500 500"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-labelledby="map-title"
          >
            <title id="map-title">Carte d'implantation Versi en France</title>
            {/* Simplified France metropolitan outline */}
            <path
              d="M250 60 L290 70 L340 80 L380 100 L400 120 L410 110 L430 120 L420 150 L400 170 L380 190 L370 210 L380 240 L400 260 L410 290 L400 320 L380 350 L370 380 L350 400 L330 410 L300 420 L280 430 L260 420 L240 410 L220 420 L190 410 L170 390 L160 370 L150 340 L140 310 L130 290 L120 270 L110 250 L100 220 L110 200 L120 180 L130 160 L140 140 L160 120 L180 100 L200 80 L220 70 Z"
              fill="var(--color-border)"
              stroke="var(--color-stone-200)"
              strokeWidth="1"
              opacity="0.7"
            />
            {/* City markers */}
            {CITIES.map((city) => (
              <g key={city.name}>
                {city.active ? (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r="6"
                    fill="var(--color-accent)"
                  >
                    <title>{city.name}</title>
                  </circle>
                ) : (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r="4"
                    fill="none"
                    stroke="var(--color-border)"
                    strokeWidth="1.5"
                  >
                    <title>{city.name}</title>
                  </circle>
                )}
                {city.active && (
                  <text
                    x={city.x + 12}
                    y={city.y + 4}
                    fill="var(--color-text-muted)"
                    fontSize="12"
                    fontFamily="var(--font-family)"
                    letterSpacing="0.06em"
                  >
                    {city.name.toUpperCase()}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}
