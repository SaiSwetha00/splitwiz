import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'splitwiz-offline';
const DB_VERSION = 1;
const STORE = 'queued-expenses';

export interface QueuedExpense {
  id?: number;
  tripId: string;
  title: string;
  amount: number;
  category?: string;
  date: string;
  note?: string;
  queuedAt: string;
}

let _db: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!_db) {
    _db = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return _db;
}

export async function queueExpense(
  expense: Omit<QueuedExpense, 'id' | 'queuedAt'>
): Promise<void> {
  const db = await getDb();
  await db.add(STORE, { ...expense, queuedAt: new Date().toISOString() });
}

export async function getQueue(): Promise<QueuedExpense[]> {
  if (typeof window === 'undefined') return [];
  try {
    const db = await getDb();
    return (await db.getAll(STORE)) as QueuedExpense[];
  } catch {
    return [];
  }
}

export async function getQueueCount(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  try {
    const db = await getDb();
    return await db.count(STORE);
  } catch {
    return 0;
  }
}

async function clearQueued(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const expense of queue) {
    try {
      const res = await fetch(`/api/trips2/${expense.tripId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenses: [
            {
              title: expense.title,
              amount: expense.amount,
              category: expense.category ?? null,
              date: expense.date,
              note: expense.note ?? null,
            },
          ],
        }),
      });
      if (res.ok && expense.id !== undefined) {
        await clearQueued(expense.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
