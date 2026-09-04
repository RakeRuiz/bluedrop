import Image from 'next/image';
import Link from 'next/link';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { getLucyGlobalEnabled, setLucyGlobalEnabled } from '@/app/actions';
import { Button } from '@/components/ui/button';

export async function SiteHeader() {
  const enabled = await getLucyGlobalEnabled();

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-9" priority />
          <div className="leading-tight">
            <p className="font-semibold text-foreground">Rake y René</p>
            <p className="text-xs text-muted-foreground">Leads del taller de IA</p>
          </div>
        </Link>

        <form action={setLucyGlobalEnabled} className="flex items-center gap-2">
          <input type="hidden" name="enabled" value={(!enabled).toString()} />
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Lucy está {enabled ? 'activa' : 'apagada'}
          </span>
          <Button type="submit" size="sm" variant={enabled ? 'outline' : 'destructive'}>
            {enabled ? (
              <>
                <PauseCircle className="size-4" />
                Apagar a Lucy
              </>
            ) : (
              <>
                <PlayCircle className="size-4" />
                Encender a Lucy
              </>
            )}
          </Button>
        </form>
      </div>
    </header>
  );
}
