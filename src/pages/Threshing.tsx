import { useEffect, useMemo, useRef, useState } from 'react';
import { RiderCard } from '../components/art/RiderCard';
import { ThreshingField } from '../components/art/ThreshingField';
import { Link } from '../components/Link';
import { CARD, cardFileName, cardText } from '../lib/card';
import { IMAGE_TYPE, renderImage } from '../lib/render';
import { PATHS } from '../lib/router';
import { canShareImages, saveFile, shareFile } from '../lib/share';
import { choose, COLOURS, describe, isComplete, loadBond, QUESTIONS, saveBond, tidyRider } from '../lib/threshing';

type Phase = 'intro' | 'walk' | 'reveal' | 'bond';
type Status = { kind: 'idle' } | { kind: 'working' } | { kind: 'done'; message: string } | { kind: 'error'; message: string };

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Where friends can find their own dragon, as printed on the card. */
function siteLabel(): string {
  return `${window.location.host}${import.meta.env.BASE_URL}`.replace(/\/$/, '');
}

export function ThreshingPage() {
  const saved = useMemo(loadBond, []);
  const [rider, setRider] = useState(saved?.rider ?? '');
  const [answers, setAnswers] = useState<number[]>(saved?.answers ?? []);
  const [phase, setPhase] = useState<Phase>(saved ? 'bond' : 'intro');
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [shareable, setShareable] = useState(false);
  const card = useRef<SVGSVGElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => setShareable(canShareImages()), []);

  const bond = useMemo(() => (isComplete(answers) ? choose(answers, rider) : null), [answers, rider]);
  const lines = useMemo(() => (bond ? cardText(bond, siteLabel()) : []), [bond]);

  // Move focus to each new question or result, so keyboard and screen reader users follow along
  // (but not on arrival, where the browser's own focus is right).
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current) heading.current?.focus();
    arrived.current = true;
  }, [phase, step]);

  // The field holds its breath before the reveal.
  useEffect(() => {
    if (phase !== 'reveal') return;
    const timer = window.setTimeout(() => setPhase('bond'), prefersReducedMotion() ? 600 : 2800);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const begin = () => {
    setAnswers([]);
    setStep(0);
    setStatus({ kind: 'idle' });
    setPhase('walk');
  };

  const pick = (index: number) => {
    const next = [...answers.slice(0, step), index];
    setAnswers(next);
    if (step + 1 < QUESTIONS.length) {
      setStep(step + 1);
      return;
    }
    saveBond({ rider: tidyRider(rider), answers: next });
    setPhase('reveal');
  };

  const back = () => {
    if (step === 0) setPhase('intro');
    else setStep(step - 1);
  };

  const walkAgain = () => {
    saveBond(null);
    setAnswers([]);
    setStatus({ kind: 'idle' });
    setPhase('intro');
  };

  const makeCard = async (): Promise<File | null> => {
    if (!card.current || !bond) return null;
    setStatus({ kind: 'working' });
    try {
      const blob = await renderImage(card.current, CARD, lines);
      return new File([blob], cardFileName(bond), { type: IMAGE_TYPE });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
      return null;
    }
  };

  const download = async () => {
    const file = await makeCard();
    if (!file) return;
    saveFile(file);
    setStatus({ kind: 'done', message: `Saved ${file.name}` });
  };

  const share = async () => {
    const file = await makeCard();
    if (!file || !bond) return;
    try {
      const text = `${bond.dragonName}, ${describe(bond)}, chose me at the Threshing. Find yours: ${window.location.origin}${PATHS.threshing}`;
      const shared = await shareFile(file, 'My rider card', text);
      setStatus(shared ? { kind: 'done', message: 'Shared. Now go find out who your friends got.' } : { kind: 'idle' });
    } catch {
      setStatus({ kind: 'error', message: 'Sharing failed. Try Download instead.' });
    }
  };

  const question = QUESTIONS[step];
  const glow = bond ? COLOURS[bond.colour].glow : null;

  return (
    <div className="threshing">
      <ThreshingField chosenGlow={phase === 'reveal' || phase === 'bond' ? glow : null} />

      {phase === 'intro' && (
        <section className="threshing-panel" aria-labelledby="threshing-title">
          <p className="kicker">The Threshing</p>
          <h1 id="threshing-title" ref={heading} tabIndex={-1}>
            Walk the field.
          </h1>
          <p className="lore">
            Six steps across the grass. Dozens of eyes in the dark. Answer honestly, because they can tell, and one of
            them will choose you.
          </p>
          <label className="field text-field">
            <span className="legend">Your rider name</span>
            <input
              type="text"
              value={rider}
              maxLength={24}
              placeholder="Cadet"
              autoComplete="nickname"
              onChange={(e) => setRider(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && begin()}
            />
          </label>
          <button type="button" className="button primary wide-button" onClick={begin}>
            Step onto the field
          </button>
        </section>
      )}

      {phase === 'walk' && question && (
        <section className="threshing-panel" aria-labelledby="question">
          <div className="walk-head">
            <button type="button" className="text-button" onClick={back}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M10 3l-5 5 5 5" />
              </svg>
              Back
            </button>
            <p className="muted-kicker" aria-live="polite">
              Step {step + 1} of {QUESTIONS.length}
            </p>
          </div>
          <div className="steps" aria-hidden="true">
            {QUESTIONS.map((_, i) => (
              <span key={i} className={i <= step ? 'step done' : 'step'} />
            ))}
          </div>
          <h1 id="question" className="question" ref={heading} tabIndex={-1}>
            {question.prompt}
          </h1>
          <div className="answers">
            {question.answers.map((answer, i) => (
              <button
                key={answer.text}
                type="button"
                className="answer"
                aria-pressed={answers[step] === i}
                onClick={() => pick(i)}
              >
                {answer.text}
              </button>
            ))}
          </div>
        </section>
      )}

      {phase === 'reveal' && (
        <section className="threshing-panel reveal" aria-live="assertive">
          <h1 ref={heading} tabIndex={-1} className="reveal-line">
            The field goes silent.
          </h1>
          <p className="lore">Something enormous lowers its head toward you…</p>
        </section>
      )}

      {phase === 'bond' && bond && (
        <section className="bond" aria-labelledby="bond-title">
          <div className="bond-card">
            <RiderCard ref={card} className="card-art" bond={bond} lines={lines} />
          </div>
          <div className="bond-info">
            <p className="kicker" style={{ color: glow ?? undefined }}>
              Chosen
            </p>
            <h1 id="bond-title" ref={heading} tabIndex={-1}>
              {bond.dragonName} chose you.
            </h1>
            <p className="lore">
              {bond.rider}, you were chosen by {describe(bond)}. {COLOURS[bond.colour].note}
            </p>
            <div className="signet">
              <p className="muted-kicker">{bond.rare ? 'Rare signet' : 'Your signet'}</p>
              <p className="signet-name">{bond.signet.name}</p>
              <p className="muted">{bond.signet.text}</p>
            </div>
            <p className="muted small">Assigned to {bond.wing}.</p>

            <div className="download-row">
              <button type="button" className="button primary" onClick={download} disabled={status.kind === 'working'}>
                {status.kind === 'working' ? 'Painting…' : 'Download your card'}
              </button>
              {shareable && (
                <button type="button" className="button" onClick={share} disabled={status.kind === 'working'}>
                  Share your card
                </button>
              )}
            </div>
            <p className={status.kind === 'error' ? 'notice error' : 'muted small'} role="status">
              {status.kind === 'done' || status.kind === 'error'
                ? status.message
                : 'Sized for stories on TikTok and Instagram.'}
            </p>
            <div className="bond-links">
              <Link href={`${PATHS.codex}?a=yours&b=tairn`} className="text-button">
                Set {bond.dragonName} beside Tairn
              </Link>
              <Link href={PATHS.wallpapers} className="text-button">
                Make {bond.dragonName} your wallpaper
              </Link>
              <button type="button" className="text-button" onClick={walkAgain}>
                Walk the field again
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
