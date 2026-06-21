import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Member } from '../types';
import { getDb } from './firebase';

export const MemberService = {
  subscribe(
    familyId: string,
    callback: (members: Member[]) => void,
    onError?: (e: Error) => void,
  ): () => void {
    let db;
    try {
      db = getDb();
    } catch (err) {
      onError?.(err as Error);
      return () => {};
    }

    let q;
    try {
      q = query(
        collection(db, 'members'),
        where('familyId', '==', familyId),
      );
    } catch (err) {
      onError?.(err as Error);
      return () => {};
    }

    return onSnapshot(
      q,
      (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
      },
      (e) => onError?.(e),
    );
  },
};
