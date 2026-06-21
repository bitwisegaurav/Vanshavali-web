import { useEffect, useState } from 'react';
import { MemberService } from '../services/firestore';
import type { Member } from '../types';

export function useFamily(familyId: string) {
  const [members, setMembers] = useState<Member[]>([]);
  // Track which familyId we've successfully received data for.
  // loading is derived: true whenever we have a familyId but haven't loaded it yet.
  const [loadedForId, setLoadedForId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const loading = Boolean(familyId) && loadedForId !== familyId;

  console.log('[useFamily] render — familyId:', familyId || '(empty)', '| loading:', loading, '| loadedForId:', loadedForId || '(none)', '| members:', members.length, '| error:', error);

  useEffect(() => {
    console.log('[useFamily] effect fired — familyId:', familyId || '(empty)');

    if (!familyId) {
      console.log('[useFamily] no familyId — skipping subscribe');
      return;
    }

    console.log('[useFamily] calling MemberService.subscribe for familyId:', familyId);

    const unsubscribe = MemberService.subscribe(
      familyId,
      (m) => {
        console.log('[useFamily] SUCCESS callback — members received:', m.length, 'for familyId:', familyId);
        setMembers(m);
        setLoadedForId(familyId);
        setError(null);
      },
      (e) => {
        console.error('[useFamily] ERROR callback for familyId:', familyId, '|', e.message, e);
        setError(e.message ?? 'Failed to load family data.');
        setLoadedForId(familyId);
      },
    );

    console.log('[useFamily] MemberService.subscribe() returned, unsubscribe fn:', typeof unsubscribe);

    return () => {
      console.log('[useFamily] cleanup — unsubscribing for familyId:', familyId);
      unsubscribe();
    };
  }, [familyId]);

  return { members, loading, error };
}
