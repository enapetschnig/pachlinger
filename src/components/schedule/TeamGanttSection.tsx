import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { GanttBar } from "./GanttBar";
import {
  getAssignmentsForDay,
  isOnLeave,
  isCompanyHoliday,
  getEmployeeColor,
} from "./scheduleUtils";
import type {
  Profile,
  Project,
  Assignment,
  LeaveRequest,
  CompanyHoliday,
} from "./scheduleTypes";

interface Props {
  profiles: Profile[];
  projects: Project[];
  assignments: Assignment[];
  leaveRequests: LeaveRequest[];
  holidays: CompanyHoliday[];
  days: Date[];
  canEditProject: (projectId: string) => boolean;
  onCellClick?: (userId: string, date: Date) => void;
  onRangeSelect?: (userId: string, days: Date[]) => void;
  onAssignmentClick?: (assignment: Assignment) => void;
}

export function TeamGanttSection({
  profiles,
  projects,
  assignments,
  leaveRequests,
  holidays,
  days,
  canEditProject,
  onCellClick,
  onRangeSelect,
  onAssignmentClick,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [dragUserId, setDragUserId] = useState<string | null>(null);
  const [dragStartIdx, setDragStartIdx] = useState<number | null>(null);
  const [dragEndIdx, setDragEndIdx] = useState<number | null>(null);

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  useEffect(() => {
    const onMouseUp = () => {
      if (dragUserId !== null && dragStartIdx !== null && dragEndIdx !== null) {
        const lo = Math.min(dragStartIdx, dragEndIdx);
        const hi = Math.max(dragStartIdx, dragEndIdx);
        const selectedDays = days.slice(lo, hi + 1);
        if (selectedDays.length === 1 && onCellClick) {
          onCellClick(dragUserId, selectedDays[0]);
        } else if (selectedDays.length > 1 && onRangeSelect) {
          onRangeSelect(dragUserId, selectedDays);
        }
      }
      setDragUserId(null);
      setDragStartIdx(null);
      setDragEndIdx(null);
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [dragUserId, dragStartIdx, dragEndIdx, days, onCellClick, onRangeSelect]);

  return (
    <div className="border-b">
      {/* Section header */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" />
        )}
        <Users className="h-4 w-4 shrink-0" />
        <span className="font-semibold text-sm">Teammitglieder</span>
        <span className="text-xs text-muted-foreground">
          {profiles.length} Mitarbeiter
        </span>
      </button>

      {!collapsed &&
        profiles.map((profile) => {
          const empColor = getEmployeeColor(profile.id, profiles.map(p => p.id));
          return (
          <div
            key={profile.id}
            className="grid border-t"
            style={{
              gridTemplateColumns: `minmax(140px, 200px) repeat(${days.length}, minmax(40px, 1fr))`,
            }}
          >
            {/* Label */}
            <div className={`p-2 border-r text-sm font-medium truncate sticky left-0 z-10 flex items-center ${empColor.bg} ${empColor.text}`}>
              {profile.vorname} {profile.nachname}
            </div>

            {/* Day cells */}
            {days.map((day, dayIdx) => {
              const holiday = isCompanyHoliday(holidays, day);
              const leave = isOnLeave(leaveRequests, profile.id, day);
              const dayAssignments = getAssignmentsForDay(
                assignments,
                profile.id,
                day
              );
              // Cell-Klick darf nur, wenn kein Assignment editiert werden muss
              // (für neue Aufträge); editable=true heißt: Empty-Cell-Click erlaubt
              const editable = true;

              const isDragSelected =
                dragUserId === profile.id &&
                dragStartIdx !== null &&
                dragEndIdx !== null &&
                dayIdx >= Math.min(dragStartIdx, dragEndIdx) &&
                dayIdx <= Math.max(dragStartIdx, dragEndIdx);

              return (
                <div
                  key={day.toISOString()}
                  className={`p-0.5 border-r min-h-[40px] select-none ${
                    holiday ? "bg-gray-100" : ""
                  } ${
                    isDragSelected && !holiday && !leave
                      ? "bg-blue-100 ring-1 ring-inset ring-blue-400"
                      : ""
                  }`}
                  onMouseDown={(e) => {
                    // Wenn auf einen Bar-Eintrag geklickt → nicht den Drag starten
                    if ((e.target as HTMLElement).closest("[data-assignment-id]")) return;
                    if (!holiday && !leave && (onCellClick || onRangeSelect)) {
                      setDragUserId(profile.id);
                      setDragStartIdx(dayIdx);
                      setDragEndIdx(dayIdx);
                    }
                  }}
                  onMouseEnter={() => {
                    if (dragUserId === profile.id) {
                      setDragEndIdx(dayIdx);
                    }
                  }}
                >
                  {holiday ? (
                    <GanttBar
                      label={holiday.bezeichnung || "Feiertag"}
                      variant="holiday"
                    />
                  ) : leave ? (
                    <GanttBar
                      label={
                        leave.type === "urlaub"
                          ? "Urlaub"
                          : leave.type === "krankenstand"
                          ? "Krank"
                          : leave.type === "za"
                          ? "ZA"
                          : leave.type
                      }
                      variant="leave"
                    />
                  ) : dayAssignments.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {dayAssignments.map((a) => {
                        const isEditable = canEditProject(a.project_id);
                        const projectName = projectMap[a.project_id] || "–";
                        const timeLabel = a.start_time && a.end_time
                          ? ` ${a.start_time.slice(0, 5)}–${a.end_time.slice(0, 5)}`
                          : "";
                        return (
                          <div
                            key={a.id}
                            data-assignment-id={a.id}
                            className={`${onAssignmentClick && isEditable ? "cursor-pointer" : ""} ${!isEditable ? "opacity-60" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onAssignmentClick && isEditable) onAssignmentClick(a);
                            }}
                            title={`${projectName}${timeLabel}${a.notizen ? ` · ${a.notizen}` : ""}`}
                          >
                            <GanttBar
                              projectId={a.project_id}
                              label={`${projectName}${timeLabel}`}
                              colorOverride={empColor}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      className={`min-h-[32px] rounded-md border border-dashed border-muted-foreground/20 ${
                        (onCellClick || onRangeSelect) && editable
                          ? "cursor-pointer hover:bg-muted/30"
                          : ""
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
        })}

      {!collapsed && profiles.length === 0 && (
        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
          Keine aktiven Mitarbeiter
        </div>
      )}
    </div>
  );
}
