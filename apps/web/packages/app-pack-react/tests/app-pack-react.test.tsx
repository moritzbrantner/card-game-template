import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import { StaticRedirectPage } from '@moritzbrantner/app-pack-react';

describe('@moritzbrantner/app-pack-react', () => {
  it('exports the static redirect page surface', () => {
    const page = StaticRedirectPage({ href: '../examples/forms/' });

    expect(isValidElement(page)).toBe(true);
    expect(page.props.children[1].props.children).toBe('Redirecting...');
    expect(page.props.children[2].props.children.props.href).toBe(
      '../examples/forms/',
    );
  });
});
