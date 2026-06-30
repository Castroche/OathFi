import { useMarketSocket } from "../../hooks/useMarketSocket";

export function GlobalMarketRuntime() {
  useMarketSocket();
  return null;
}
