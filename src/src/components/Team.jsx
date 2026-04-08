import { useState } from 'react';
import { useFadeIn } from '../hooks/useFadeIn.js';
import { TEAM } from '../config/team.js';
import './Team.css';

function FounderPhoto({ member }) {
  const [error, setError] = useState(false);

  if (error || !member.photo) {
    return (
      <div className="team__photo-fallback">
        <span className="team__initials">{member.initials}</span>
      </div>
    );
  }

  return (
    <img
      src={member.photo}
      alt={`${member.name.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}, Co-fondateur Versi`}
      className="team__photo"
      width="160"
      height="160"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.52 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.712-2.165 1.212V6.169H6.55c.032.678 0 7.225 0 7.225h2.4z" />
    </svg>
  );
}

export default function Team() {
  const { ref, isVisible } = useFadeIn();

  return (
    <section id="equipe" className="team section-padding" ref={ref}>
      <div className="container">
        <span className="text-label team__label">ÉQUIPE</span>
        <h2 className="text-heading-lg team__title">
          Trois associés.<br />
          Des parcours vérifiables.
        </h2>
        <p className="text-body-lg team__subtitle">
          Chaque fondateur a construit et géré des actifs avant de construire Versi. Le discours suit la pratique — pas l'inverse.
        </p>

        <div className={`team__grid ${isVisible ? 'fade-in' : 'fade-hidden'}`}>
          {TEAM.map((member) => (
            <article key={member.id} className="team__card">
              <FounderPhoto member={member} />
              <h3 className="text-heading-md team__name">{member.name}</h3>
              <span className="text-label team__role">{member.role}</span>
              <p className="text-body-sm team__specialty">{member.specialty}</p>
              <p className="team__track">{member.track}</p>
              {member.linkedin && (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="team__linkedin"
                  aria-label={`Profil LinkedIn de ${member.name.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}`}
                >
                  <LinkedInIcon />
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
