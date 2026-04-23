import { useEffect, useRef, useState } from 'react';
import {
  AUDIO_PUBLIC_BASE,
  SPARROW_DIARY,
  SPARROW_EPILOGUE,
  getAudioStem,
} from '@colonize/content';
import { useGameStore } from '../store/game';
import styles from './Prologue.module.css';

// Terminal screen — mounts alone (no GameCanvas / Hud) when `screen ===
// 'prologue'`. Entered from the main menu's "New Game" button; exits to
// `'faction-select'` via the Skip button or the final-page "Begin"
// button.
//
// Pages are 16 Sparrow diary entries from @colonize/content followed by
// the Captain's Epilogue — 17 total. Nav is linear (Previous / Next);
// the final page swaps Next for Begin. Subtle BGM uses the existing
// `bgm-menu` stem routed through a plain HTMLAudio element (the Phaser
// AudioManager isn't mounted on this terminal screen since there's no
// GameCanvas underneath).
export function Prologue(): JSX.Element {
  const setScreen = useGameStore((s) => s.setScreen);
  const muted = useGameStore((s) => s.settings.muted);
  const bgmVolume = useGameStore((s) => s.settings.bgmVolume);

  const [pageIndex, setPageIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pageCount = SPARROW_DIARY.length + 1;
  const isFirst = pageIndex === 0;
  const isLast = pageIndex === pageCount - 1;

  const goNext = (): void => {
    setPageIndex((i) => (i + 1 < pageCount ? i + 1 : i));
  };
  const goPrev = (): void => {
    setPageIndex((i) => (i - 1 >= 0 ? i - 1 : i));
  };
  const begin = (): void => {
    setScreen('faction-select');
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = muted ? 0 : bgmVolume;
    // autoplay may be blocked by browser policy even after a user
    // gesture if the element wasn't mounted at gesture time; silently
    // swallow the rejection — the player can still read the prologue.
    const p = el.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {});
    }
    return () => {
      el.pause();
    };
  }, [muted, bgmVolume]);

  const bgmUrl = `${AUDIO_PUBLIC_BASE}${getAudioStem('bgm-menu').file}`;
  const entry = isLast ? null : SPARROW_DIARY[pageIndex];

  return (
    <main className={styles.screen} data-testid="prologue">
      <audio
        ref={audioRef}
        src={bgmUrl}
        loop
        preload="auto"
        data-testid="prologue-audio"
        aria-hidden="true"
      />
      <div className={styles.parchment}>
        <h1 className={styles.heading}>Sparrow's Diary</h1>
        {isLast ? (
          <article className={styles.page} key={pageIndex} data-testid="prologue-epilogue">
            <h2 className={styles.epilogueTitle}>{SPARROW_EPILOGUE.title}</h2>
            <p className={styles.body}>{SPARROW_EPILOGUE.body}</p>
            <p className={styles.signoff}>— James Sparrow, Endeavour</p>
          </article>
        ) : entry ? (
          <article
            className={styles.page}
            key={pageIndex}
            data-testid="prologue-entry"
            data-entry-id={entry.id}
          >
            <p className={styles.dateline}>{entry.dateline}</p>
            <p className={styles.body}>{entry.body}</p>
          </article>
        ) : null}
        <p className={styles.counter} data-testid="prologue-counter">
          Page {pageIndex + 1} of {pageCount}
        </p>
        <div className={styles.nav}>
          {isLast ? (
            <>
              <button
                type="button"
                className={styles.secondary}
                onClick={goPrev}
                data-testid="prologue-prev"
              >
                Previous
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={begin}
                data-testid="prologue-begin"
                autoFocus
              >
                Begin
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.secondary}
                onClick={goPrev}
                disabled={isFirst}
                data-testid="prologue-prev"
              >
                Previous
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={goNext}
                data-testid="prologue-next"
                autoFocus
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>
      <button type="button" className={styles.skip} onClick={begin} data-testid="prologue-skip">
        Skip
      </button>
    </main>
  );
}
