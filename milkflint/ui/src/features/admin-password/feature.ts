import { KeyRoundIcon } from 'lucide-react';
import { lazyPage } from '../lazy-page';
import type { Feature } from '../types';

export const feature = {
  id: 'admin-password',
  title: 'Router access',
  description: 'The admin password, HTTPS, Dropbear SSH settings, and authorized keys.',
  icon: KeyRoundIcon,
  group: 'security',
  order: 60,
  page: lazyPage(
    () => import('./page'),
    (m) => m.RouterAccessPage,
  ),
} satisfies Feature;
