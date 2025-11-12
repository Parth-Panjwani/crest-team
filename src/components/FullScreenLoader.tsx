import { Loader2 } from "lucide-react";

export const FullScreenLoader = () => (
  <div className="flex h-screen w-full flex-col items-center justify-center gap-2 bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">Loading…</p>
  </div>
);

export default FullScreenLoader;
