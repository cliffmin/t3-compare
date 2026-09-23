import { ChevronDownIcon } from "lucide-react";
import { Button } from "../ui/button";

export function ScrollToEndButton({
  onClick,
  bottom = 4,
}: {
  onClick: () => void;
  bottom?: number;
}) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 justify-center py-1.5"
      style={{ bottom }}
    >
      <Button
        aria-label="Scroll to end"
        onPointerDown={(event) => event.preventDefault()}
        onClick={onClick}
        className="pointer-events-auto gap-1.5 rounded-full px-3 text-muted-foreground hover:text-foreground"
        size="xs"
        variant="glass"
      >
        <ChevronDownIcon className="size-3.5" />
        Scroll to end
      </Button>
    </div>
  );
}
