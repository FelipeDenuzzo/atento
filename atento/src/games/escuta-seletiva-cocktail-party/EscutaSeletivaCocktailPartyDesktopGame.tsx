import { EscutaSeletivaCocktailParty } from "@/components/EscutaSeletivaCocktailParty";

export function EscutaSeletivaCocktailPartyDesktopGame(props: { onComplete?: (report: any) => void }) {
  return <EscutaSeletivaCocktailParty {...props} mobile={false} />;
}
