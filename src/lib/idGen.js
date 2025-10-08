import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

function randDigits(n) {
  const max = 10 ** n;
  const v = Math.floor(Math.random() * max);
  return String(v).padStart(n, '0');
}

/**
 * Create a document with a random patterned ID like "22-2232" using a transaction to ensure uniqueness.
 * Retries a few times if collisions occur.
 *
 * @param {string} collectionName - target collection name
 * @param {object} data - document data
 * @param {object} options - { leftDigits=2, rightDigits=4, separator='-', attempts=5 }
 * @returns {Promise<string>} - created document ID
 */
export async function createPatternDoc(collectionName, data = {}, options = {}) {
  const { leftDigits = 2, rightDigits = 4, separator = '-', attempts = 5 } = options;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const left = randDigits(leftDigits);
    const right = randDigits(rightDigits);
    const id = `${left}${separator}${right}`;
    const docRef = doc(db, collectionName, id);

    try {
      const createdId = await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (snap.exists()) {
          // signal to outer loop to retry
          throw new Error('ID_EXISTS');
        }
        const toWrite = {
          ...(data || {}),
          id,
          created_at: data.created_at || serverTimestamp(),
        };
        tx.set(docRef, toWrite);
        return id;
      });
      return createdId;
    } catch (e) {
      if (e && e.message === 'ID_EXISTS') {
        // collision - loop to retry
        continue;
      }
      // other errors: rethrow
      throw e;
    }
  }
  throw new Error('Failed to allocate unique patterned ID after multiple attempts');
}

export default createPatternDoc;
