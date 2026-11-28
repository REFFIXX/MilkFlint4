// Domains whose resolved addresses skip the VPN tunnel for marked devices
// (dnsmasq fills fw4 nft sets; a MARK rule clears the tunnel mark, like
// CLIENT_SKIP does for MACs). CDN hostnames and apps that use DoH still
// reach addresses this list never saw.
import { HOSTNAME } from './hostnames';

/** Max domains kept so the dhcp ipset section stays small. */
export const BYPASS_DOMAIN_LIMIT = 64;

/** A domain string as typed: lower case, no trailing dot, no scheme/path. */
export function normalizeBypassDomain(raw: string): string {
  let s = raw.trim().toLowerCase();
  if (s.startsWith('http://')) s = s.slice(7);
  if (s.startsWith('https://')) s = s.slice(8);
  const slash = s.indexOf('/');
  if (slash >= 0) s = s.slice(0, slash);
  if (s.endsWith('.')) s = s.slice(0, -1);
  return s;
}

/** Whether a normalized domain is usable in a dhcp ipset list. */
export function isBypassDomain(s: string): boolean {
  if (s === '' || s.length > 253) return false;
  if (s.includes(':') || s.includes(' ')) return false;
  return HOSTNAME.test(s);
}

/**
 * Parse a typed list (commas, spaces or newlines) into unique valid domains,
 * dropping blanks; invalid entries stay in `invalid` for the form error.
 */
export function parseBypassDomains(raw: string | readonly string[]): {
  domains: string[];
  invalid: string[];
} {
  const parts = (typeof raw === 'string' ? raw.split(/[\s,]+/) : raw).map(normalizeBypassDomain).filter((x) => x !== '');
  const domains: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    if (!isBypassDomain(p)) {
      if (!invalid.includes(p)) invalid.push(p);
      continue;
    }
    if (seen.has(p)) continue;
    seen.add(p);
    domains.push(p);
  }
  return { domains, invalid };
}

/** Tip text for the Sites that go direct field (lead + Why?). */
export const BYPASS_EXPLAIN =
  'These sites leave the tunnel for devices sent through the VPN: dnsmasq puts their answers in an nft set, and a firewall rule clears the tunnel mark for those addresses. A CDN often serves the same name from many addresses, and apps that look names up themselves (DoH, private DNS) never ask this router — so some of that traffic can still go through the VPN, or a different address for the same site may not match.';
