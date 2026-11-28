import { MonitorIcon } from 'lucide-react';
import { lazyPage } from '../lazy-page';
import type { Feature } from '../types';

export const feature = {
  id: 'lcd-setup',
  title: 'LCD Setup',
  description: 'What the Flint 4 front panel shows, and when it sleeps.',
  icon: MonitorIcon,
  group: 'system',
  order: 35,
  page: lazyPage(
    () => import('./page'),
    (m) => m.LcdSetupPage,
  ),
} satisfies Feature;
