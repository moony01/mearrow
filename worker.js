import openNextWorker from './.open-next/worker.js';
import { getHttpsRedirect } from './src/lib/https-redirect.ts';

// Retain OpenNext's named exports, including its optional cache objects.
export * from './.open-next/worker.js';

const worker = {
  ...openNextWorker,
  fetch(request, env, ctx) {
    return getHttpsRedirect(request.url) ?? openNextWorker.fetch(request, env, ctx);
  },
};

export default worker;
