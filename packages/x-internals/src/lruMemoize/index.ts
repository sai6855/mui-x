/**
 * Minimal LRU memoization, vendored from `reselect` (MIT) to avoid pulling the
 * whole `reselect` package (including the unused `weakMapMemoize`/autotrack
 * memoizers) into the bundle. Behavior matches `reselect`'s `lruMemoize`.
 */

const NOT_FOUND = Symbol('NOT_FOUND');

type EqualityFn = (a: any, b: any) => boolean;

interface MemoizeOptions {
  equalityCheck?: EqualityFn;
  maxSize?: number;
  resultEqualityCheck?: EqualityFn;
}

interface CacheEntry {
  key: IArguments | any[];
  value: any;
}

interface Cache {
  get(key: IArguments): any;
  put(key: IArguments, value: any): void;
  getEntries(): CacheEntry[];
  clear(): void;
}

const referenceEqualityCheck: EqualityFn = (a, b) => a === b;

function createCacheKeyComparator(equalityCheck: EqualityFn) {
  return function areArgumentsShallowlyEqual(prev: any, next: any): boolean {
    if (prev === null || next === null || prev.length !== next.length) {
      return false;
    }
    const { length } = prev;
    for (let i = 0; i < length; i += 1) {
      if (!equalityCheck(prev[i], next[i])) {
        return false;
      }
    }
    return true;
  };
}

function createSingletonCache(equals: (a: any, b: any) => boolean): Cache {
  let entry: CacheEntry | undefined;
  return {
    get(key) {
      if (entry && equals(entry.key, key)) {
        return entry.value;
      }
      return NOT_FOUND;
    },
    put(key, value) {
      entry = { key, value };
    },
    getEntries() {
      return entry ? [entry] : [];
    },
    clear() {
      entry = undefined;
    },
  };
}

function createLruCache(maxSize: number, equals: (a: any, b: any) => boolean): Cache {
  let entries: CacheEntry[] = [];
  function get(key: IArguments) {
    const cacheIndex = entries.findIndex((entry) => equals(key, entry.key));
    if (cacheIndex > -1) {
      const entry = entries[cacheIndex];
      if (cacheIndex > 0) {
        entries.splice(cacheIndex, 1);
        entries.unshift(entry);
      }
      return entry.value;
    }
    return NOT_FOUND;
  }
  function put(key: IArguments, value: any) {
    if (get(key) === NOT_FOUND) {
      entries.unshift({ key, value });
      if (entries.length > maxSize) {
        entries.pop();
      }
    }
  }
  return {
    get,
    put,
    getEntries() {
      return entries;
    },
    clear() {
      entries = [];
    },
  };
}

export function lruMemoize<F extends (...args: any[]) => any>(
  func: F,
  equalityCheckOrOptions?: EqualityFn | MemoizeOptions,
): F {
  const providedOptions =
    typeof equalityCheckOrOptions === 'object'
      ? equalityCheckOrOptions
      : { equalityCheck: equalityCheckOrOptions };

  const {
    equalityCheck = referenceEqualityCheck,
    maxSize = 1,
    resultEqualityCheck,
  } = providedOptions;

  const comparator = createCacheKeyComparator(equalityCheck);
  const cache = maxSize <= 1 ? createSingletonCache(comparator) : createLruCache(maxSize, comparator);

  function memoized(this: unknown) {
    // eslint-disable-next-line prefer-rest-params
    let value = cache.get(arguments);
    if (value === NOT_FOUND) {
      // eslint-disable-next-line prefer-rest-params
      value = func.apply(null, arguments as any);
      if (resultEqualityCheck) {
        const entries = cache.getEntries();
        const matchingEntry = entries.find((entry) => resultEqualityCheck(entry.value, value));
        if (matchingEntry) {
          value = matchingEntry.value;
        }
      }
      // eslint-disable-next-line prefer-rest-params
      cache.put(arguments, value);
    }
    return value;
  }

  return memoized as unknown as F;
}
