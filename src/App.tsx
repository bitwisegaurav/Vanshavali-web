import { useCallback, useEffect, useState } from 'react';
import { FamilyTree } from './components/FamilyTree';
import { MemberProfile } from './components/MemberProfile';
import { COLORS } from './constants/colors';
import { useFamily } from './hooks/useFamily';
import type { Member } from './types';

type View = 'tree' | 'profile';

const FAMILY_ID =
  (import.meta.env.VITE_FAMILY_ID as string) ||
  localStorage.getItem('vanshavali_family_id') ||
  '';

export default function App() {
  const [isDark, setIsDark] = useState(
    () =>
      localStorage.getItem('vanshavali_theme') === 'dark' ||
      (localStorage.getItem('vanshavali_theme') === null &&
        window.matchMedia('(prefers-color-scheme: dark)').matches),
  );
  const [familyId, setFamilyId] = useState(FAMILY_ID);
  const [familyIdInput, setFamilyIdInput] = useState('');
  const [view, setView] = useState<View>('tree');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | undefined>();

  const { members, loading, error } = useFamily(familyId);

  const theme = isDark ? COLORS.dark : COLORS.light;

  useEffect(() => {
    document.documentElement.style.background = theme.background;
    document.body.style.background = theme.background;
    localStorage.setItem('vanshavali_theme', isDark ? 'dark' : 'light');
  }, [isDark, theme.background]);

  const selectedMember: Member | null = selectedMemberId
    ? (members.find((m) => m.id === selectedMemberId) ?? null)
    : null;

  const familyName = 'Mishra Lineage';

  const handleViewProfile = useCallback((id: string) => {
    setSelectedMemberId(id);
    setView('profile');
  }, []);

  const handleViewInTree = useCallback((id: string) => {
    setHighlightId(id);
    setView('tree');
    setTimeout(() => setHighlightId(undefined), 1500);
  }, []);

  const handleBack = useCallback(() => {
    setView('tree');
  }, []);

  // Family ID setup screen
  if (!familyId) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: theme.background, padding: 24,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: theme.text, marginBottom: 8 }}>Vanshavali</div>
        <div style={{ fontSize: 15, color: theme.textMuted, marginBottom: 32, textAlign: 'center' }}>
          Enter your family ID to view the family tree
        </div>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <input
            value={familyIdInput}
            onChange={(e) => setFamilyIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && familyIdInput.trim()) {
                const id = familyIdInput.trim();
                localStorage.setItem('vanshavali_family_id', id);
                setFamilyId(id);
              }
            }}
            placeholder="Family ID"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 16,
              border: `1px solid ${theme.border}`, background: theme.card,
              color: theme.text, fontSize: 15, outline: 'none',
            }}
          />
          <button
            onClick={() => {
              const id = familyIdInput.trim();
              if (!id) return;
              localStorage.setItem('vanshavali_family_id', id);
              setFamilyId(id);
            }}
            style={{
              marginTop: 12, width: '100%', padding: '14px 0', borderRadius: 16,
              background: COLORS.primary, color: '#FFF', fontSize: 15, fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: theme.background, position: 'relative' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '12px 16px', borderBottom: `1px solid ${theme.border}`,
        background: theme.card, gap: 8, flexShrink: 0,
      }}>
        <span style={{ flex: 1, fontSize: 18, fontWeight: 700, color: theme.text, letterSpacing: -0.5 }}>
          वंशावली
        </span>
        {loading && (
          <span style={{ fontSize: 12, color: theme.textMuted }}>Loading…</span>
        )}
        {error && (
          <span style={{ fontSize: 12, color: COLORS.red }} title={error}>⚠ Connection error</span>
        )}
        <button
          onClick={() => setIsDark((d) => !d)}
          style={{
            width: 36, height: 36, borderRadius: 12,
            border: `1px solid ${theme.border}`, background: theme.background,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 16,
          }}>
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Main content with slide transitions */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Tree view */}
        <div style={{
          position: 'absolute', inset: 0,
          transform: view === 'tree' ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <FamilyTree
            isDark={isDark}
            members={members}
            familyName={familyName}
            onViewProfile={handleViewProfile}
            highlightMemberId={highlightId}
          />
        </div>

        {/* Profile view */}
        <div style={{
          position: 'absolute', inset: 0,
          transform: view === 'profile' ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <MemberProfile
            isDark={isDark}
            member={selectedMember}
            members={members}
            onBack={handleBack}
            onViewInTree={handleViewInTree}
            onNavigateToMember={handleViewProfile}
          />
        </div>
      </div>
    </div>
  );
}
