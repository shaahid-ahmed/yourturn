'use client';
// P6, Create a pod on white. Compose layout: logo in the header, chips
// for contacts in the card palette, DotProgress for the 3 to 8 count.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Input,
  StepIndicator,
  useDocumentTitle,
} from '@/components/ui';
import { BlobLogo } from '@/components/heypal';
import { PEOPLE } from '@/lib/heypal/seed';

interface Contact {
  id: string;
  name: string;
  phone: string;
  onApp: boolean;
}

// Synthetic demo contacts: first names only, 555 range E.164.
const DEMO_CONTACTS: Contact[] = PEOPLE.filter((p) => p.id !== 'p-me').map(
  (p) => ({ id: p.id, name: p.name, phone: p.phone, onApp: true }),
);

type Step = 'pick' | 'name';

export default function CreatePodPage() {
  useDocumentTitle('Create a pod');
  const router = useRouter();
  const [step, setStep] = useState<Step>('pick');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [podName, setPodName] = useState('');
  const [nameError, setNameError] = useState('');
  const [selError, setSelError] = useState('');

  const filtered = DEMO_CONTACTS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleContact(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // Creator counts as 1; need 2 to 7 more for 3 to 8 total
  const totalWithCreator = selected.length + 1;

  function handlePickNext() {
    if (selected.length < 2) {
      setSelError('Pick at least 2 more people (3 total including you).');
      return;
    }
    if (selected.length > 7) {
      setSelError('A pod can have at most 8 people including you.');
      return;
    }
    setSelError('');
    setStep('name');
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!podName.trim()) {
      setNameError('Give your pod a name.');
      return;
    }
    setNameError('');
    router.push('/home');
  }

  return (
    <main data-surface="white" className="flex flex-col min-h-dvh">
      <header className="flex items-center gap-3 px-4 h-14 sticky top-0 bg-[var(--white)] z-10 border-b border-[var(--sky)]">
        <BlobLogo surface="white" size={36} label="HeyPal, go to home" />
        <h1 className="text-lg font-bold text-[var(--ink)]">
          {step === 'pick' ? 'Create a pod' : 'Name your pod'}
        </h1>
        <span className="flex-1" />
        {step === 'name' && (
          <button
            type="button"
            onClick={() => setStep('pick')}
            aria-label="Back to contact picker"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-[var(--ink)]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 16l-6-6 6-6" />
            </svg>
          </button>
        )}
      </header>

      {step === 'pick' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--sky)]">
            <Input
              label="Search contacts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name"
            />
            <div className="mt-2 flex items-center gap-3">
              <p className="text-[13px] text-[var(--ink-muted)]">
                {totalWithCreator} of 8 members selected (including you)
              </p>
              <StepIndicator
                current={Math.min(totalWithCreator, 8)}
                total={8}
              />
            </div>
            {selError && (
              <p
                className="mt-1 text-sm text-[var(--color-danger)]"
                role="alert"
              >
                {selError}
              </p>
            )}
          </div>

          <ul
            className="flex-1 overflow-y-auto flex flex-wrap gap-2 p-4 content-start"
            aria-label="Contacts"
          >
            {filtered.map((c, i) => {
              const on = selected.includes(c.id);
              const fills = [
                'var(--card-deep)',
                'var(--card-royal)',
                'var(--card-sky)',
                'var(--card-pale)',
                'var(--card-white)',
              ];
              const texts = [
                'var(--white)',
                'var(--white)',
                'var(--ink)',
                'var(--ink)',
                'var(--ink)',
              ];
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleContact(c.id)}
                    className="flex items-center gap-2 rounded-full px-4 min-h-[44px] text-base font-semibold border-none cursor-pointer"
                    style={{
                      background: on
                        ? 'var(--deep)'
                        : (fills[i % fills.length] ?? 'var(--card-pale)'),
                      color: on
                        ? 'var(--white)'
                        : (texts[i % texts.length] ?? 'var(--ink)'),
                      border: on ? undefined : '2px solid var(--sky)',
                    }}
                  >
                    <span aria-hidden="true">{on ? '✓ ' : ''}</span>
                    {c.name}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="p-4 border-t border-[var(--sky)]">
            <Button fullWidth onClick={handlePickNext}>
              Create pod
            </Button>
            <p className="mt-3 text-xs text-center text-[var(--ink-muted)]">
              Declined contacts? You can still share an invite link.
            </p>
          </div>
        </div>
      )}

      {step === 'name' && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col flex-1 px-4 pt-6 pb-8 gap-5"
        >
          <Input
            label="Pod name"
            value={podName}
            onChange={(e) => setPodName(e.target.value)}
            error={nameError}
            placeholder="Friday Crew"
            autoFocus
          />
          <p className="text-sm text-[var(--ink-muted)]">
            {selected.length + 1} members: you
            {selected.map((id) => {
              const c = DEMO_CONTACTS.find((x) => x.id === id);
              return c ? `, ${c.name}` : '';
            })}
          </p>
          <div className="mt-auto">
            <Button fullWidth type="submit">
              Create pod
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}
