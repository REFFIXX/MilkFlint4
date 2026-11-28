// Shared Updates card for packages that ship inside MilkFlint4 firmware
// images (AdGuard Home, banIP) until this tree has its own apk feed. Shows
// the installed version from ubus and points at GitHub releases — never a
// Check/Install against a missing or foreign feed.
import { ArrowUpCircleIcon, ExternalLinkIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { CardHeading, InfoRow } from '@/components/card-heading';
import { explain } from '@/components/explain';
import { Field } from '@/components/field';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FIRMWARE_RELEASES, versionLabel } from '@/lib/apk-version';
import { href } from '@/lib/router';

const link = 'link font-medium underline-offset-4';

export function PackageUpdatesCard({
  title,
  packageLabel,
  apkName,
  version,
}: {
  /** Card title; default "Package updates" (banIP’s Protection tab already has list “Updates”). */
  title?: string;
  /** Human name in the tip copy, e.g. "AdGuard Home" or "banIP". */
  packageLabel: string;
  /** apk package name as in the database (adguardhome, banip). */
  apkName: string;
  /** Installed version from ubus status, when the package is present. */
  version: string | null | undefined;
}): ReactElement {
  const label = versionLabel(version);
  const known = version !== null && version !== undefined && version !== '';
  return (
    <Card>
      <CardHeading
        title={title ?? 'Package updates'}
        description={`${packageLabel} package updates ship with MilkFlint4 firmware releases for now. There is no separate package feed to check from this page yet, so Install and rollback stay off until that feed exists.`}
      />
      <CardContent className="flex flex-col gap-3">
        <Field
          id={`pkg-updates-${apkName}`}
          label="Installed"
          {...explain(
            `The version of ${apkName} on this router, as apk recorded it.`,
            [],
            <>
              <p>
                MilkFlint reads it from the package database through ubus. A newer {packageLabel} arrives when you install a newer
                MilkFlint4 image that includes it — not by pulling from OpenWrt’s generic feeds (those can replace MilkFlint’s
                build).
              </p>
            </>,
          )}
        >
          <p className="text-sm font-medium tabular">{known ? label : 'unknown'}</p>
        </Field>
        <div className="divide-y border-t">
          <InfoRow label="Package">
            <span className="font-mono text-xs">{apkName}</span>
          </InfoRow>
          <InfoRow label="How to update">MilkFlint4 release image</InfoRow>
        </div>
        <p className="max-w-prose text-sm text-muted-foreground">
          Keep settings when you flash a newer build so {packageLabel} stays configured. The{' '}
          <a href={href('upgrade')} className={link}>
            Upgrade
          </a>{' '}
          page installs MilkFlint4 images from this router.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={FIRMWARE_RELEASES} target="_blank" rel="noreferrer">
              GitHub releases <ExternalLinkIcon />
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={href('upgrade')}>
              <ArrowUpCircleIcon /> Upgrade firmware
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
