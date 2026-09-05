import Image from 'next/image';
import Link from 'next/link';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { getFrancoGlobalEnabled, setFrancoGlobalEnabled } from '@/app/actions';
import { Button } from '@/components/ui/button';

export async function SiteHeader() {
  const enabled = await getFrancoGlobalEnabled();

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover"
            priority
          />
          <div className="leading-tight">
            <p className="font-semibold text-foreground">Blue Drop</p>
            <p className="text-xs text-muted-foreground">Leads de WhatsApp — Franco</p>
          </div>
        </Link>

        <form action={setFrancoGlobalEnabled} className="flex items-center gap-2">
          <input type="hidden" name="enabled" value={(!enabled).toString()} />
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Franco está {enabled ? 'activo' : 'apagado'}
          </span>
          <Button type="submit" size="sm" variant={enabled ? 'outline' : 'destructive'}>
            {enabled ? (
              <>
                <PauseCircle className="size-4" />
                Apagar a Franco
              </>
            ) : (
              <>
                <PlayCircle className="size-4" />
                Encender a Franco
              </>
            )}
          </Button>
        </form>
      </div>
    </header>
  );
}
