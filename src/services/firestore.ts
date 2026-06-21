import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Member } from '../types';
import { getDb } from './firebase';

export const MemberService = {
  subscribe(
    familyId: string,
    callback: (members: Member[]) => void,
    onError?: (e: Error) => void,
  ): () => void {
    console.log('[firestore] subscribe() called with familyId:', familyId);

    let db;
    try {
      db = getDb();
      console.log('[firestore] getDb() returned successfully');
    } catch (err) {
      console.error('[firestore] getDb() THREW — Firebase not ready:', err);
      onError?.(err as Error);
      return () => {};
    }

    let q;
    try {
      q = query(
        collection(db, 'members'),
        where('familyId', '==', familyId),
      );
      console.log('[firestore] query built successfully');
    } catch (err) {
      console.error('[firestore] query() THREW:', err);
      onError?.(err as Error);
      return () => {};
    }

    console.log('[firestore] calling onSnapshot()...');
    const unsub = onSnapshot(
      q,
      (snap) => {
        console.log('[firestore] onSnapshot SUCCESS — docs count:', snap.docs.length, '| fromCache:', snap.metadata.fromCache, '| hasPendingWrites:', snap.metadata.hasPendingWrites);
        const members = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Member);
        console.log('[firestore] mapped members:', members.length);
        callback(members);
      },
      (e) => {
        console.error('[firestore] onSnapshot ERROR:', e.code, e.message, e);
        onError?.(e);
      },
    );
    console.log('[firestore] onSnapshot() registered, unsub type:', typeof unsub);
    return unsub;
  },
};
