'use client';
// P6 — Create a pod
// Pick contacts, name the pod, invite. 3–8 members including creator.
import { useState } from 'react';
import { Button, Input, ScreenHeader, BackButton } from '@/components/ui';

interface Contact {
  id: string;
  name: string;
  phone: string;
  onApp: boolean;
}

// Synthetic demo contacts
const DEMO_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Sam Rivera', phone: '+1 555 0101', onApp: true },
  { id: 'c2', name: 'Priya Nair', phone: '+1 555 0102', onApp: true },
  { id: 'c3', name: 'Alex Kim', phone: '+1 555 0103', onApp: false },
  { id: 'c4', name: 'Jordan Lee', phone: '+1 555 0104', onApp: true },
  { id: 'c5', name: 'Casey Park', phone: '+1 555 0105', onApp: false },
];

type Step = 'pick' | 'name';

export default function CreatePodPage() {
  const [step, setStep] = useState<Step>('pick');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [podName, setPodName] = useState('');
  const [nameError, setNameError] = useState('');
  const [selError, setSelError] = useState('');

  const filtered = DEMO_CONTACTS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleContact(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }

  // Creator counts as 1; need 2–7 more for 3–8 total
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
    // Demo: go to the new pod's chat
    window.location.href = '/pods/pod-new';
  }

  return (
    <main className="flex flex-col min-h-dvh">
      <ScreenHeader
        title={step === 'pick' ? 'Create a pod' : 'Name your pod'}
        back={
          step === 'pick'
            ? <BackButton href="/home" />
            : (
              <button
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]"
                onClick={() => setStep('pick')}
                aria-label="Back to contact picker"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16l-6-6 6-6"/></svg>
              </button>
            )
        }
      />

      {step === 'pick' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <Input
              label="Search contacts"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name"
            />
            <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
              {totalWithCreator} of 8 members selected (including you)
            </p>
            {selError && <p className="mt-1 text-sm text-[var(--color-danger)]" role="alert">{selError}</p>}
          </div>

          <ul className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]" role="listbox" aria-label="Contacts" aria-multiselectable="true">
            {filtered.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected.includes(c.id)}
                  onClick={() => toggleContact(c.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-surface-sunken)] min-h-[56px] transition-colors"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                      selected.includes(c.id)
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-surface-sunken)] text-[var(--color-ink)]'
                    }`}
                    aria-hidden="true"
                  >
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-ink)] truncate">{c.name}</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {c.onApp ? 'On Unspoken' : 'Invite by link'}
                    </p>
                  </div>
                  {selected.includes(c.id) && (
                    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 10l5 5 7-7"/>
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="p-4 border-t border-[var(--color-border)]">
            <Button fullWidth onClick={handlePickNext}>
              Next — name the pod
            </Button>
            <p className="mt-3 text-xs text-center text-[var(--color-ink-muted)]">
              Declined contacts? You can still{' '}
              <button className="underline text-[var(--color-accent)]" onClick={() => { alert('Demo — invite link: unspoken.app/join/abc123'); }}>
                share an invite link
              </button>.
            </p>
          </div>
        </div>
      )}

      {step === 'name' && (
        <form onSubmit={handleCreate} className="flex flex-col flex-1 px-4 pt-6 pb-8 gap-5">
          <Input
            label="Pod name"
            value={podName}
            onChange={e => setPodName(e.target.value)}
            error={nameError}
            placeholder="Friday crew"
            autoFocus
          />
          <p className="text-sm text-[var(--color-ink-muted)]">
            {selected.length + 1} members: you
            {selected.map(id => {
              const c = DEMO_CONTACTS.find(x => x.id === id);
              return c ? `, ${c.name.split(' ')[0]}` : '';
            })}
          </p>
          <div className="mt-auto">
            <Button fullWidth type="submit">Create pod</Button>
          </div>
        </form>
      )}
    </main>
  );
}
