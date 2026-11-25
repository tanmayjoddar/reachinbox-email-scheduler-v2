export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy API, Auth, Slack, and Admin requests to the backend server
    if (
      url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/auth') ||
      url.pathname.startsWith('/slack') ||
      url.pathname.startsWith('/admin')
    ) {
      const backendUrl = env.BACKEND_URL || 'https://progeny-diagnosis-compile.ngrok-free.dev';
      const targetUrl = new URL(url.pathname + url.search, backendUrl);

      const reqHeaders = new Headers(request.headers);
      reqHeaders.set('host', new URL(backendUrl).host);
      reqHeaders.set('x-forwarded-host', url.host);
      reqHeaders.set('x-forwarded-proto', url.protocol.replace(':', ''));

      return fetch(targetUrl.toString(), {
        method: request.method,
        headers: reqHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'manual',
      });
    }

    // Serve static SPA assets with index.html fallback
    return env.ASSETS.fetch(request);
  },
};
