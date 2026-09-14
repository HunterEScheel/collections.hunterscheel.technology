import type { OwnedCard } from '../../types';
import { parse, QueryError } from './parse';
import { compile } from './compile';
import {
  setCopiesPassthrough, setCopiesScope, setSearchPool, usesCopies, type Predicate,
} from './fields';

export { QueryError };
export {
  ownedPrice, setCopiesPassthrough, setCopiesScope, setSearchPool, usesCopies,
} from './fields';

/** Compile a query string into a predicate. Empty/whitespace query matches everything. */
export function compileQuery(query: string): Predicate {
  const ast = parse(query);
  if (!ast) return () => true;
  return compile(ast);
}

/**
 * Filter cards by a Scryfall-style query. Throws QueryError on malformed
 * input. `copies:` is evaluated against the results of the other terms.
 */
export function search(query: string, cards: OwnedCard[]): OwnedCard[] {
  setSearchPool(cards);
  const twoPass = usesCopies(query);
  setCopiesPassthrough(twoPass);
  const pred = compileQuery(query);
  let results = cards.filter(pred);
  if (twoPass) {
    setCopiesPassthrough(false);
    setCopiesScope(results);
    results = results.filter(pred);
    setCopiesScope(null);
  }
  return results;
}
