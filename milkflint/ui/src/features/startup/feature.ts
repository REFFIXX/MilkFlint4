import { PowerIcon } from 'lucide-react';
import { lazyPage } from '../lazy-page';
import type { Feature } from '../types';

export const feature = {
  id: 'startup',
  title: 'Startup',
  description: 'Which services start at boot, and commands in /etc/rc.local.',
  icon: PowerIcon,
  group: 'system',
  order: 15,
  page: lazyPage(
    () => import('./page'),
    (m) => m.StartupPage,
  ),
} satisfies Feature;
