// Only run in Node.js runtime (not Edge or Browser)
if (typeof process !== 'undefined' && process.env?.NEXT_RUNTIME !== 'edge') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dns = require('node:dns');

    if (typeof dns.setDefaultResultOrder === 'function') {
      dns.setDefaultResultOrder('ipv4first');
    }

    const DNS_ORIG_LOOKUP = Symbol.for('__DNS_ORIG_LOOKUP__');

    if (!Reflect.get(globalThis, DNS_ORIG_LOOKUP)) {
      Reflect.set(globalThis, DNS_ORIG_LOOKUP, dns.lookup.bind(dns));
    }

    const originalLookup = Reflect.get(globalThis, DNS_ORIG_LOOKUP);

    const patchedLookup = (hostname: string, options: any, callback: any) => {
      let cb = callback;
      let opts = options;
      if (typeof opts === 'function') {
        cb = opts;
        opts = {};
      } else if (typeof opts === 'number') {
        opts = { family: opts };
      }

        // Resolve IPv4 for external hosts (Supabase, n8n.cloud, etc.) that fail on Windows NAT64 IPv6
        if (
          typeof hostname === 'string' &&
          hostname !== 'localhost' &&
          !hostname.endsWith('.local') &&
          !hostname.includes('127.0.0.1') &&
          opts?.family !== 6
        ) {
          dns.resolve4(hostname, (err: any, addresses: string[]) => {
            if (!err && addresses && addresses.length > 0) {
              if (opts && opts.all) {
                return cb(
                  null,
                  addresses.map((a) => ({ address: a, family: 4 }))
                );
              }
              return cb(null, addresses[0], 4);
            }
            return originalLookup(hostname, opts, cb);
          });
          return;
        }

        return originalLookup(hostname, opts, cb);
      };

      // @ts-ignore
      dns.lookup = patchedLookup;
  } catch (err) {
    console.warn('DNS IPv4 patch initialization warning:', err);
  }
}

export function initDnsFix() {
  return true;
}
