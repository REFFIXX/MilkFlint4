import { WaypointsIcon } from 'lucide-react';
import { lazyPage } from '../lazy-page';
import type { Feature } from '../types';

export const feature = {
  id: 'mesh',
  title: 'Mesh',
  description: '802.11s backhaul with mesh11sd — Main or peer, shared identity, deploy other APs.',
  icon: WaypointsIcon,
  group: 'wifi',
  order: 30,
  routerOnly: true,
  page: lazyPage(
    () => import('./page'),
    (m) => m.MeshPage,
  ),
} satisfies Feature;
