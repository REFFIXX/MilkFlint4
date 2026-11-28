// Handshake age for the VPN client's peer: WireGuard renews about every two
// minutes while there's traffic, so three minutes without one means the peer
// stopped answering (or never did).

/** Seconds without a handshake before the peer counts as not answering. */
export const HANDSHAKE_STALE_SECONDS = 180;

type PeerHandshake = { latest_handshake: number } | undefined;

/** True when the peer has answered within {@link HANDSHAKE_STALE_SECONDS}. */
export function isHandshakeFresh(peer: PeerHandshake, now: number): boolean {
  return peer !== undefined && peer.latest_handshake > 0 && now - peer.latest_handshake < HANDSHAKE_STALE_SECONDS;
}

/**
 * True when the tunnel is on but the peer has never answered, or hasn't in
 * {@link HANDSHAKE_STALE_SECONDS}: the dead-tunnel case Home and this page
 * talk about.
 */
export function isHandshakeStale(peer: PeerHandshake, now: number): boolean {
  if (peer === undefined) return true;
  if (peer.latest_handshake <= 0) return true;
  return now - peer.latest_handshake >= HANDSHAKE_STALE_SECONDS;
}

/** Seconds since the last handshake; undefined when there has never been one. */
export function handshakeAge(peer: PeerHandshake, now: number): number | undefined {
  if (peer === undefined || peer.latest_handshake <= 0) return undefined;
  return Math.max(0, now - peer.latest_handshake);
}

export type DeadTunnelEffect = 'block' | 'direct' | 'none';

/**
 * What marked devices get while the peer isn't answering: kill switch on →
 * no internet; off → out directly (the router drops the tunnel table's claim
 * until a handshake returns); tunnel off → nothing special.
 */
export function deadTunnelEffect(enabled: boolean, killSwitch: boolean, stale: boolean): DeadTunnelEffect {
  if (!enabled || !stale) return 'none';
  return killSwitch ? 'block' : 'direct';
}

/** Home / VPN page copy for a dead tunnel, given kill-switch state. */
export function deadTunnelCopy(killSwitch: boolean): { headline: string; text: string } {
  return killSwitch
    ? {
        headline: 'VPN server isn’t answering',
        text: 'With the kill switch on, its devices have no internet or DNS until the server answers again.',
      }
    : {
        headline: 'VPN server isn’t answering',
        text: 'With the kill switch off, its devices go out directly until the server answers again.',
      };
}
