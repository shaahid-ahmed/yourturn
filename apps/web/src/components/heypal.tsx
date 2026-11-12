'use client';
// HeyPal shared shell: blob logo, hamburger menu, pod blobs, cards.
// Visual restyle only. Deep blue surfaces use white text; white
// surfaces use ink text. Dots are CSS decoration, always aria-hidden.
import { useEffect, useRef } from 'react';

export interface HubLink {
  href: string;
  label: string;
  note: string;
}

// The organic blob logo. One smooth flat shape, no gradient or outline.
// White on deep surfaces, deep blue on white surfaces.
export function BlobLogo({
  surface,
  size = 56,
  label = 'HeyPal, go to home',
}: {
  surface: 'deep' | 'white';
  size?: number;
  label?: string;
}) {
  return (
    <a
      href="/home"
      aria-label={label}
      className="hey-blob-link"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="hey-blob"
      >
        <path
          d="M50 6 C72 4 92 22 90 46 C88 68 74 70 70 88 C66 98 40 98 30 88 C20 78 22 66 12 56 C2 46 10 22 28 12 C36 7 42 7 50 6 Z"
          fill={surface === 'deep' ? 'var(--white)' : 'var(--deep)'}
        />
      </svg>
    </a>
  );
}

// Hamburger menu. The first item is always home. Rendered as a dialog
// so focus is contained and Escape closes it.
export function HeyMenu({
  surface,
  items,
  current,
}: {
  surface: 'deep' | 'white';
  items: HubLink[];
  current: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const open = () => dialog.current?.showModal();
  const close = () => dialog.current?.close();

  useEffect(() => {
    const onRoute = () => dialog.current?.close();
    window.addEventListener('popstate', onRoute);
    return () => window.removeEventListener('popstate', onRoute);
  }, []);

  const bars = surface === 'deep' ? 'var(--white)' : 'var(--color-ink)';
  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-expanded={false}
        aria-label="Open menu"
        className="hey-menu-btn"
      >
        <span aria-hidden="true" className="hey-menu-bars">
          <i style={{ background: bars }} />
          <i style={{ background: bars }} />
          <i style={{ background: bars }} />
        </span>
      </button>
      <dialog
        ref={dialog}
        aria-label="Menu"
        className="hey-menu-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="hey-menu-scrim" aria-hidden="true" />
        <nav aria-label="HeyPal" className="hey-menu-list">
          <button
            type="button"
            onClick={close}
            className="hey-menu-close"
            aria-label="Close menu"
          >
            Close
          </button>
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={item.href === current ? 'page' : undefined}
                  className={
                    item.href === current
                      ? 'hey-menu-item hey-menu-item--current'
                      : 'hey-menu-item'
                  }
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </dialog>
    </>
  );
}

// A pod blob: flat translucent white on deep blue, slow organic wobble,
// never drifting from its slot. An orange dot orbits only when the pod
// needs the signed-in person (reason named in the accessible label).
export function PodBlob({
  name,
  memberCount,
  stage,
  needsMeReason,
  size,
  onOpen,
}: {
  name: string;
  memberCount: number;
  stage: string;
  needsMeReason: string | null;
  size: number;
  onOpen: () => void;
}) {
  const label = needsMeReason
    ? `${name}, ${memberCount} members, ${stage}, ${needsMeReason}`
    : `${name}, ${memberCount} members, ${stage}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className="hey-pod"
      style={{ width: size, height: size }}
    >
      <span aria-hidden="true" className="hey-pod-blob" />
      {needsMeReason && (
        <span aria-hidden="true" className="hey-pod-orbit">
          <i />
        </span>
      )}
      <span className="hey-pod-text">
        <span className="hey-pod-name">{name}</span>
        <span className="hey-pod-count">{memberCount} members</span>
        <span className="hey-pod-stage">{stage}</span>
      </span>
    </button>
  );
}

// Dotted outline blob for the New pod slot.
export function NewPodBlob({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="New pod, create a pod"
      className="hey-pod hey-pod--new"
    >
      <span aria-hidden="true" className="hey-pod-new-outline" />
      <span className="hey-pod-text">
        <span aria-hidden="true" className="hey-pod-plus">
          +
        </span>
        <span className="hey-pod-name">New pod</span>
      </span>
    </button>
  );
}

// Card fill rotation from the palette table (stable per list index).
const CARD_FILLS = [
  'var(--card-deep)',
  'var(--card-royal)',
  'var(--card-sky)',
  'var(--card-pale)',
  'var(--card-white)',
  'var(--card-orange)',
] as const;

const CARD_TEXT = [
  'var(--white)',
  'var(--white)',
  'var(--ink)',
  'var(--ink)',
  'var(--ink)',
  'var(--ink)',
] as const;

export function cardFill(index: number): string {
  return CARD_FILLS[index % CARD_FILLS.length] ?? 'var(--card-pale)';
}

export function cardText(index: number): string {
  return CARD_TEXT[index % CARD_TEXT.length] ?? 'var(--ink)';
}
