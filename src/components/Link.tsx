import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navigate } from '../lib/router';

/** An in-site link that changes page without a reload; new-tab clicks behave as usual. */
export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    navigate(href);
  };
  return <a href={href} onClick={follow} {...rest} />;
}
