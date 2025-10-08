import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Create a document with a sequential, zero-padded ID using a transaction-safe counter.
 * Writes both the document and updates the counter atomically.
 *
 * @param {string} collectionName - Firestore collection name (e.g. 'stock_in')
 * @param {object} data - Document data to write (created_at will be set automatically if not provided)
 * @param {object} options - { counterId?, prefix?, digits? }
 * @returns {Promise<string>} - The created document ID
 */
export async function createSequentialDoc(collectionName, data = {}, options = {}) {
  const { counterId = collectionName, prefix = '', digits = 4 } = options;
  const counterRef = doc(db, 'counters', counterId);

  const id = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    let nextSeq = 1;
    if (!snap.exists()) {
      tx.set(counterRef, { seq: nextSeq });
    } else {
      const cur = snap.data()?.seq || 0;
      nextSeq = cur + 1;
      tx.update(counterRef, { seq: nextSeq });
    }

    const padded = String(nextSeq).padStart(digits, '0');
    const fullId = `${prefix}${padded}`;
    const docRef = doc(db, collectionName, fullId);

    // Include id and seq in the stored document for easy reference and sorting
    const toWrite = {
      ...(data || {}),
      id: fullId,
      seq: nextSeq,
      created_at: data.created_at || serverTimestamp(),
    };

    tx.set(docRef, toWrite);
    return fullId;
  });

  return id;
}

export default createSequentialDoc;
