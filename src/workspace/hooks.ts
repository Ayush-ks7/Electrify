import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  operationsService,
  simulationService,
  scoreStoredHistory,
} from "./service";
import type { CaseStatus } from "./types";
import type { Scenario } from "../types/simulation";
const simulationMutationKey = ["simulation-control"];
export const useWorkspace = (days: number = 30) => {
  const changing = useIsMutating({ mutationKey: simulationMutationKey }) > 0;
  return useQuery({
    queryKey: ["workspace", days],
    queryFn: ({ signal }) => operationsService.snapshot(days, signal),
    refetchInterval: 5000,
    retry: 1,
    enabled: !changing,
  });
};
export function useCaseActions() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (
      action:
        | { anomaly: string }
        | { id: string; status: CaseStatus }
        | { id: string; note: string },
    ) =>
      "anomaly" in action
        ? operationsService.createCase(action.anomaly)
        : "status" in action
          ? operationsService.status(action.id, action.status)
          : operationsService.note(action.id, action.note),
    onSuccess: () => client.invalidateQueries({ queryKey: ["workspace"] }),
  });
}

export const useSimulationState = (poll = false) => {
  const changing = useIsMutating({ mutationKey: simulationMutationKey }) > 0;
  return useQuery({
    queryKey: ["simulation"],
    queryFn: ({ signal }) => simulationService.status(signal),
    refetchInterval: poll ? 3000 : false,
    enabled: !changing,
  });
};

export function useSimulationControls(
  ids: string[],
  scenario: Scenario,
) {
  const cache = useQueryClient();
  return useMutation({
    mutationKey: simulationMutationKey,
    scope: { id: "simulation-control" },
    onMutate: async () => {
      await Promise.all([
        cache.cancelQueries({ queryKey: ["workspace"] }),
        cache.cancelQueries({ queryKey: ["simulation"] }),
      ]);
    },
    mutationFn: (action: "start" | "stop" | "reset") => {
      if (action === "start")
        return simulationService.start(
          ids.map((consumer_id) => ({ consumer_id, scenario })),
          "fast",
        );
      // Resolve all owned streams on the server, even if this tab's cache is stale.
      return simulationService.control(action);
    },
    onSuccess: async (state) => {
      await Promise.all([
        cache.cancelQueries({ queryKey: ["workspace"] }),
        cache.cancelQueries({ queryKey: ["simulation"] }),
      ]);
      cache.setQueryData(["simulation"], state);
      // Clear every date-window projection before polling the new run or baseline.
      await cache.resetQueries({ queryKey: ["workspace"] });
    },
    onSettled: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["workspace"] }),
        cache.invalidateQueries({ queryKey: ["simulation"] }),
      ]);
    },
  });
}

export function useStoredScore(id: string | null) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!id) throw new Error("No stored meter history");
      return scoreStoredHistory(id);
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ["workspace"] }),
  });
}
