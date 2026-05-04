import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Users, Plus } from "lucide-react";
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
  onRangeSelect?: (userIds: string[], days: Date[]) => void;
  onAssignmentClick?: (assignment: Assignment) => void;
}

type DragPoint = { userIdx: number; dayIdx: number };

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
  const [dragStart, setDragStart] = useState<DragPoint | null>(null);
  const [dragEnd, setDragEnd] = useState<DragPoint | null>(null);

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const editorMode = !!(onCellClick || onRangeSelect);

  useEffect(() => {
    const onMouseUp = () => {
      if (dragStart && dragEnd) {
        const userLo = Math.min(dragStart.userIdx, dragEnd.userIdx);
        const userHi = Math.max(dragStart.userIdx, dragEnd.userIdx);
        const dayLo = Math.min(dragStart.dayIdx, dragEnd.dayIdx);
        const dayHi = Math.max(dragStart.dayIdx, dragEnd.dayIdx);
        const selectedUsers = profiles.slice(userLo, userHi + 1).map((p) => p.id);
        const selectedDays = days.slice(dayLo, dayHi + 1);

        if (selectedUsers.length === 1 && selectedDays.length === 1 && onCellClick) {
          onCellClick(selectedUsers[0], selectedDays[0]);
        } else if (onRangeSelect) {
          onRangeSelect(selectedUsers, selectedDays);
        }
      }
      setDragStart(null);
      setDragEnd(null);
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [dragStart, dragEnd, days, profiles, onCellClick, onRangeSelect]);

  const isInDragRect = (userIdx: number, dayIdx: number) => {
    if (!dragStart || !dragEnd) return false;
    const userLo = Math.min(dragStart.userIdx, dragEnd.userIdx);
    const userHi = Math.max(dragStart.userIdx, dragEnd.userIdx);
    const dayLo = Math.min(dragStart.dayIdx, dragEnd.dayIdx);
    const dayHi = Math.max(dragStart.dayIdx, dragEnd.dayIdx);
    return userIdx >= userLo && userIdx <= userHi && dayIdx >= dayLo && dayIdx <= dayHi;
  };

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
        profiles.map((profile, userIdx) => {
          const empColor = getEmployeeColor(profile.id, profiles.map((p) => p.id));
          return (
            <div
              key={profile.id}
              className="grid border-t"
              style={{
                gridTemplateColumns: `minmax(140px, 200px) repeat(${days.length}, minmax(40px, 1fr))`,
              }}
            >
              {/* Label */}
              <div
                className={`p-2 border-r text-sm font-medium truncate sticky left-0 z-10 flex items-center ${empColor.bg} ${empColor.text}`}
              >
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
                const isDragSelected = isInDragRect(userIdx, dayIdx) && !holiday && !leave;
                const canAddHere = editorMode && !holiday && !leave;

                return (
                  <div
                    key={day.toISOString()}
                    className={`group p-0.5 border-r min-h-[40px] select-none ${
                      holiday ? "bg-gray-100" : ""
                    } ${
                      isDragSelected
                        ? "bg-blue-100 ring-1 ring-inset ring-blue-400"
                        : ""
                    }`}
                    onMouseDown={(e) => {
                      if ((e.target as HTMLElement).closest("[data-assignment-id]")) return;
                      if ((e.target as HTMLElement).closest("[data-add-button]")) return;
                      if (canAddHere) {
                        setDragStart({ userIdx, dayIdx });
                        setDragEnd({ userIdx, dayIdx });
                      }
                    }}
                    onMouseEnter={() => {
                      if (dragStart) setDragEnd({ userIdx, dayIdx });
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
                        {canAddHere && onCellClick && (
                          <button
                            type="button"
                            data-add-button="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCellClick(profile.id, day);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-5 rounded-md border border-dashed border-muted-foreground/40 text-xs text-muted-foreground hover:bg-muted/40 flex items-center justify-center"
                            title="Weiteren Auftrag hinzufügen"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`min-h-[32px] rounded-md border border-dashed border-muted-foreground/20 ${
                          canAddHere ? "cursor-pointer hover:bg-muted/30" : ""
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
