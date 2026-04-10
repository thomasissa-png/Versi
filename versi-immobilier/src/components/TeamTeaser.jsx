import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFadeIn } from '../hooks/useFadeIn.js';
import thomasPhoto from '../assets/team/thomas.png';
import maxPhoto from '../assets/team/max.png';
import carlPhoto from '../assets/team/carl.png';
import './TeamTeaser.css';

const FOUNDERS = [
  {
    name: 'Maxime Lemoine',
    initials: 'ML',
    photo: maxPhoto,
    track: '13 ans en sales et stratégie commerciale. Ex-Head of Sales Europe, Sony.',
    linkedin: 'https://www.linkedin.com/in/maxime-lemoine-34550354/',
  },
  {
    name: 'Thomas Issa',
    initials: 'TI',
    photo: thomasPhoto,
    track: '15 ans en stratégie et opérations. Ex-Sony, co-fondateur de TEOS (8 pays).',
    linkedin: 'https://www.linkedin.com/in/thomasissa/',
  },
  {
    name: 'Carl Standertskjold-Nordenstam',
    initials: 'CS',
    photo: carlPhoto,
    track: '14 ans en marketing B2B. Ex-Sony (9 ans), Algolia (4 ans), Head of Marketing Inbolt.',
    linkedin: 'https://www.linkedin.com/in/carlstandertskjold/',
  },
];

function FounderPhoto({ member }) {
  const [error, setError] = useState(false);

  if (error || !member.photo) {
    return (
      <div className="team-teaser__avatar">
        <span className="team-teaser__initials">{member.initials}</span>
      </div>
    );
  }

  return (
    <img
      src={member.photo}
      alt={`${member.name}, Co-fondateur Versi Immobilier`}
      className="team-teaser__photo"
      width="400"
      height="500"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

export default function TeamTeaser() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section className="team-teaser section-padding" ref={ref}>
      <div className={`container ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
        <h2 className="text-heading-lg team-teaser__heading">
          Vous parlez à celui qui a acheté.<br />
          Pas à un commercial.
        </h2>
        <p className="text-body-lg team-teaser__subtitle">
          Maxime, Thomas et Carl ont porté chaque bien de l'acquisition à la livraison. Ils font visiter eux-mêmes. Ils répondent en direct.
        </p>
        <div className="team-teaser__grid">
          {FOUNDERS.map((f) => (
            <div key={f.name} className="team-teaser__member">
              <FounderPhoto member={f} />
              <h3 className="team-teaser__name">
                {f.name}
              </h3>
              <p className="team-teaser__track text-body-sm">
                {f.track}
              </p>
              {f.linkedin && (
                <a
                  href={f.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="team-teaser__linkedin"
                  aria-label={`LinkedIn de ${f.name}`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.52 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.712-2.165 1.212V6.169H6.55c.032.678 0 7.225 0 7.225h2.4z" />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>
        <Link to="/notre-approche" className="text-cta team-teaser__link">
          Notre approche
        </Link>
      </div>
    </section>
  );
}
