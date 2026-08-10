import { useQuery } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { HealthStatus } from "@/types/health";

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const { data } = await api.get<HealthStatus>("/health/");
      return data;
    },
    // Backend may not be running yet in early setup — fail fast instead
    // of retrying forever and spamming the console.
    retry: 0,
  });
}
