import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BreakStatus {
  breakfastTaken: boolean;
  lunchTaken: boolean;
  loading: boolean;
}

/**
 * Hook zur tagesübergreifenden Pausenvalidierung.
 * Prüft ob an einem Tag bereits Vormittags- oder Mittagspause
 * eingetragen ist (über time_entries UND disturbances).
 *
 * excludeEntryIds: IDs von Einträgen die ignoriert werden sollen
 * (z.B. beim Bearbeiten eines bestehenden Eintrags)
 */
export function useBreakValidation(
  userId: string | null,
  datum: string | null,
  excludeEntryIds: string[] = []
): BreakStatus & { refresh: () => void } {
  const [breakfastTaken, setBreakfastTaken] = useState(false);
  const [lunchTaken, setLunchTaken] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchBreakStatus = useCallback(async () => {
    if (!userId || !datum) {
      setBreakfastTaken(false);
      setLunchTaken(false);
      return;
    }

    setLoading(true);

    try {
      // Prüfe time_entries
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select("id, has_breakfast_break, has_lunch_break")
        .eq("user_id", userId)
        .eq("datum", datum);

      // Prüfe disturbances
      const { data: disturbances } = await supabase
        .from("disturbances")
        .select("id, has_breakfast_break, has_lunch_break")
        .eq("user_id", userId)
        .eq("datum", datum);

      const allEntries = [
        ...(timeEntries || []).filter((e) => !excludeEntryIds.includes(e.id)),
        ...(disturbances || []).filter((e) => !excludeEntryIds.includes(e.id)),
      ];

      setBreakfastTaken(allEntries.some((e) => e.has_breakfast_break));
      setLunchTaken(allEntries.some((e) => e.has_lunch_break));
    } catch (err) {
      console.error("Error fetching break status:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, datum, excludeEntryIds.join(",")]);

  useEffect(() => {
    fetchBreakStatus();
  }, [fetchBreakStatus]);

  return { breakfastTaken, lunchTaken, loading, refresh: fetchBreakStatus };
}
