import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          ComDept Église
        </h1>
        <p className="text-muted-foreground text-lg max-w-md">
          Plateforme de gestion du département de communication de l&apos;église.
        </p>
      </div>
      <div className="flex gap-4">
        <Button>Commencer</Button>
        <Button variant="outline">En savoir plus</Button>
      </div>
    </main>
  );
}
