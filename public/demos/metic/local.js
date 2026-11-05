(() => {
  const source = 'https://metic.studio';
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
    if (url.searchParams.has('_rsc') || url.pathname.includes('/lens/api/')) {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return nativeFetch(input, init);
  };
  window.addEventListener('click', event => {
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    const url = new URL(href, location.href);
    if (url.origin === location.origin && /^\/(en(?:\/|$)|de(?:\/|$))/.test(url.pathname)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (url.pathname === '/en' || url.pathname === '/en/') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else window.open(source + url.pathname + url.search + url.hash, '_blank', 'noopener,noreferrer');
    }
  }, true);
})();
