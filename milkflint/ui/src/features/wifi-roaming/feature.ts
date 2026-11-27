import { RouteIcon } from 'lucide-react';
import { lazyPage } from '../lazy-page';
import type { Feature } from '../types';

export const feature = {
  id: 'wifi-roaming',
  title: 'Wi-Fi roaming',
  description: 'Fast handoff (802.11r/k/v) between this router and your access points.',
  icon: RouteIcon,
  group: 'wifi',
  order: 25,
  routerOnly: true,
  page: lazyPage(
    () => import('./page'),
    (m) => m.WifiRoamingPage,
  ),
} satisfies Feature;
