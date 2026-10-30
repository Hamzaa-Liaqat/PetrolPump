import { useCallback, useEffect, useRef, useState } from 'react';

// loader: axios response lautane wala function (jaise fetchTanks).
// deps: jab ye badlein to dobara fetch. intervalMs: har itne ms baad khamoshi se dobara.
export function useFetch(loader, deps = [], intervalMs = 0) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: current.data === null, error: null }));
    loaderRef
      .current()
      .then((response) => {
        if (active) setState({ data: response.data, error: null, loading: false });
      })
      .catch((error) => {
        if (active) setState((current) => ({ data: current.data, error, loading: false }));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  useEffect(() => {
    if (!intervalMs) return undefined;
    const timer = setInterval(() => setTick((value) => value + 1), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { ...state, reload };
}