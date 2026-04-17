// biome-ignore-all lint/correctness/useExhaustiveDependencies: This hook intentionally forwards a caller-provided dependency list.
'use client';

import { useEffect, useState, type DependencyList } from 'react';

import { liveQuery } from 'dexie';

export function useLiveQueryValue<T>(query: () => Promise<T>, dependencies: DependencyList, initialValue: T) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next(result) {
        setValue(result);
      },
      error(error) {
        console.error('Local blog live query failed.', error);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, dependencies);

  return value;
}
