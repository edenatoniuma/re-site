import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import world from '../../data/world.json';
import '../../styles/demos/region-select.css';

type Country = { name: string; continent: string; d: string };
type Level = 'global' | 'continent' | 'country';

const COUNTRIES = world as Country[];

const LEVELS: { id: Level; label: string }[] = [
  { id: 'global', label: 'Global' },
  { id: 'continent', label: 'Continent' },
  { id: 'country', label: 'Country' },
];

function toggleSet(set: Set<string>, value: string) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function RegionSelectDemo() {
  const [level, setLevel] = useState<Level>('country');
  const [countries, setCountries] = useState<Set<string>>(() => new Set());
  const [continents, setContinents] = useState<Set<string>>(() => new Set());
  const [hint, setHint] = useState('');
  const [saved, setSaved] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const count =
    level === 'global'
      ? 1
      : level === 'continent'
        ? continents.size
        : countries.size;

  function isSelected(country: Country) {
    if (level === 'global') return true;
    if (level === 'continent') return continents.has(country.continent);
    return countries.has(country.name);
  }

  function changeLevel(next: Level) {
    setLevel(next);
    setCountries(new Set());
    setContinents(new Set());
    setHint('');
  }

  function clearSelection() {
    setCountries(new Set());
    setContinents(new Set());
    setHint('');
  }

  function toggleMarket(country: Country) {
    if (level === 'global') return;
    if (level === 'continent') {
      setContinents((prev) => toggleSet(prev, country.continent));
    } else {
      setCountries((prev) => toggleSet(prev, country.name));
    }
    setHint('');
  }

  function showTip(event: PointerEvent<SVGPathElement>, name: string) {
    const tip = tipRef.current;
    const map = mapRef.current;
    if (!tip || !map) return;
    const rect = map.getBoundingClientRect();
    tip.textContent = name;
    tip.style.left = `${event.clientX - rect.left}px`;
    tip.style.top = `${event.clientY - rect.top - 4}px`;
    tip.hidden = false;
  }

  function hideTip() {
    if (tipRef.current) tipRef.current.hidden = true;
  }

  function handleContinue() {
    if (count === 0) {
      setHint('Pick at least one market first.');
      return;
    }
    setHint('');
    setSaved(true);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaved(false), 1400);
  }

  const noun =
    level === 'continent'
      ? count === 1
        ? 'continent'
        : 'continents'
      : count === 1
        ? 'country'
        : 'countries';

  return (
    <div className="shell">
      <header className="topbar">
        <span className="logo" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="#fff">
            <rect x="2" y="3" width="12" height="4" rx="1" />
            <rect x="2" y="9" width="8" height="4" rx="1" />
          </svg>
        </span>
        <a className="back" href="/">
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </a>
        <div className="top-right">
          <span className="who">Logged in as contact@raise-exception.com</span>
          <button className="logout" type="button">
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
              <path d="M10 8l-4 4 4 4M6 12h10" />
            </svg>
            Log out
          </button>
        </div>
      </header>

      <main>
        <div className="map" ref={mapRef}>
          <svg
            viewBox="0 0 1000 520"
            preserveAspectRatio="xMidYMid slice"
            role="img"
            aria-label="World map of selectable markets"
          >
            <g>
              {COUNTRIES.map((country) => (
                <path
                  key={country.name}
                  d={country.d}
                  className={
                    isSelected(country) ? 'country is-selected' : 'country'
                  }
                  aria-label={country.name}
                  onPointerEnter={(event) => showTip(event, country.name)}
                  onPointerMove={(event) => showTip(event, country.name)}
                  onPointerLeave={hideTip}
                  onClick={() => toggleMarket(country)}
                />
              ))}
            </g>
          </svg>
          <div className="tooltip" ref={tipRef} hidden />
        </div>

        <section className="prompt">
          <h1>Where do you sell?</h1>
          <p className="sub">Choose the markets that matter most to your client.</p>

          <div className="levels" role="group" aria-label="Selection granularity">
            {LEVELS.map((item) => (
              <button
                key={item.id}
                className="level"
                type="button"
                aria-pressed={level === item.id}
                onClick={() => changeLevel(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <p className="selection" aria-live="polite">
            {hint}
            {!hint && count > 0 && (
              <>
                {level !== 'global' && (
                  <>
                    <b>{count}</b>{' '}
                  </>
                )}
                {level === 'global'
                  ? 'Global market selected'
                  : `${noun} selected`}
                {level !== 'global' && (
                  <button
                    className="clear"
                    type="button"
                    onClick={clearSelection}
                  >
                    Clear
                  </button>
                )}
              </>
            )}
          </p>

          <button
            className={saved ? 'continue saved' : 'continue'}
            type="button"
            onClick={handleContinue}
          >
            {saved ? 'Saved ✓' : 'Continue'}
          </button>
        </section>
      </main>

      <footer>
        <span>©2026 RAISE EXCEPTION</span>
        <nav>
          <a href="#">Terms of service</a>
          <span className="sep">|</span>
          <a href="#">DPA</a>
          <span className="sep">|</span>
          <a href="#">Privacy policy</a>
        </nav>
      </footer>
    </div>
  );
}
