import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Building2, Hammer, Pencil, Trash2, AlertTriangle, Calendar, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getTotalWorkingHours } from "@/lib/workingHours";
import { PageHeader } from "@/components/PageHeader";

const ABSENCE_TYPES = ["Urlaub", "Krankenstand", "Weiterbildung", "Arztbesuch", "Zeitausgleich"];

type TimeEntry = {
  id: string;
  datum: string;
  taetigkeit: string;
  stunden: number;
  start_time: string | null;
  end_time: string | null;
  pause_minutes: number | null;
  location_type: string;
  notizen: string | null;
  projects: { name: string; plz: string } | null;
  project_id: string | null;
};

const MyHours = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalHours, setTotalHours] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [zaSaldo, setZaSaldo] = useState({ earned: 0, adjustments: 0, used: 0, balance: 0 });
  const [vacationSaldo, setVacationSaldo] = useState({ granted: 0, used: 0, balance: 0 });

  useEffect(() => {
    fetchEntries();
    fetchBalances();
  }, [selectedMonth]);

  const fetchEntries = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data } = await supabase
      .from("time_entries")
      .select("*, projects(name, plz)")
      .eq("user_id", user.id)
      .gte("datum", startDate)
      .lte("datum", endDate)
      .order("datum", { ascending: false });

    if (data) {
      setEntries(data as any);
      const sum = data.reduce((acc, entry) => acc + entry.stunden, 0);
      setTotalHours(sum);
    }
    setLoading(false);
  };

  const fetchBalances = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch all data in parallel
    const [zaAdj, vacAdj, zaUsed, vacUsed, fridayEntries] = await Promise.all([
      supabase.from("za_adjustments").select("hours").eq("user_id", user.id),
      supabase.from("vacation_adjustments").select("days").eq("user_id", user.id),
      supabase.from("time_entries").select("stunden").eq("user_id", user.id).eq("taetigkeit", "Zeitausgleich"),
      supabase.from("time_entries").select("datum").eq("user_id", user.id).eq("taetigkeit", "Urlaub"),
      supabase.from("time_entries").select("datum").eq("user_id", user.id).neq("taetigkeit", "Urlaub").neq("taetigkeit", "Krankenstand").neq("taetigkeit", "Zeitausgleich").neq("taetigkeit", "Weiterbildung").neq("taetigkeit", "Arztbesuch"),
    ]);

    // ZA: Freitags-Bonus
    const fridayCount = (fridayEntries.data || []).filter(e => new Date(e.datum).getDay() === 5).length;
    const uniqueFridays = new Set((fridayEntries.data || []).filter(e => new Date(e.datum).getDay() === 5).map(e => e.datum));
    const earned = uniqueFridays.size * 0.5;
    const adjustments = (zaAdj.data || []).reduce((s, r) => s + Number(r.hours), 0);
    const zaUsedHours = (zaUsed.data || []).reduce((s, r) => s + Number(r.stunden), 0);
    setZaSaldo({ earned, adjustments, used: zaUsedHours, balance: earned + adjustments - zaUsedHours });

    // Urlaub
    const granted = (vacAdj.data || []).reduce((s, r) => s + Number(r.days), 0);
    const uniqueVacDays = new Set((vacUsed.data || []).map(e => e.datum));
    const vacUsedDays = uniqueVacDays.size;
    setVacationSaldo({ granted, used: vacUsedDays, balance: granted - vacUsedDays });
  };

  const isAbsenceEntry = (entry: TimeEntry) => ABSENCE_TYPES.includes(entry.taetigkeit);

  const calculateMorningEnd = (entry: TimeEntry) => {
    if (!entry.start_time || !entry.end_time) return "Alte Buchung";
    if (!entry.pause_minutes || entry.pause_minutes === 0) return entry.end_time?.substring(0, 5) || '-';
    return "12:00";
  };

  const calculateAfternoonStart = (entry: TimeEntry) => {
    if (!entry.start_time || !entry.end_time) return '-';
    if (!entry.pause_minutes || entry.pause_minutes === 0) return '-';
    const morningEnd = calculateMorningEnd(entry);
    if (morningEnd === '-' || morningEnd === "Alte Buchung") return '-';
    const [hours, minutes] = morningEnd.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + entry.pause_minutes;
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  };

  const formatPauseTime = (entry: TimeEntry) => {
    if (!entry.start_time || !entry.end_time) return '-';
    if (!entry.pause_minutes || entry.pause_minutes === 0) return '-';
    const morningEnd = calculateMorningEnd(entry);
    const afternoonStart = calculateAfternoonStart(entry);
    if (morningEnd === '-' || morningEnd === "Alte Buchung" || afternoonStart === '-') return '-';
    return `${morningEnd} - ${afternoonStart}`;
  };

  const isCurrentMonth = (datum: string) => {
    const entryDate = new Date(datum);
    const [year, month] = selectedMonth.split('-').map(Number);
    return entryDate.getFullYear() === year && entryDate.getMonth() + 1 === month;
  };

  const validateDayHours = async (entryId: string, datum: string, newHours: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: dayEntries } = await supabase
      .from("time_entries")
      .select("id, stunden")
      .eq("user_id", user.id)
      .eq("datum", datum);

    if (!dayEntries) return null;

    const otherHours = dayEntries
      .filter(e => e.id !== entryId)
      .reduce((sum, e) => sum + Number(e.stunden), 0);
    
    const totalDayHours = otherHours + newHours;
    const dailyTarget = getTotalWorkingHours(new Date(datum));

    return { totalDayHours, dailyTarget, otherHours };
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry || savingEdit) return;
    setSavingEdit(true);

    if (isAbsenceEntry(editingEntry)) {
      // For absence entries, just update the hours directly
      const validation = await validateDayHours(editingEntry.id, editingEntry.datum, editingEntry.stunden);
      
      if (validation && validation.totalDayHours > validation.dailyTarget + 0.01) {
        toast({
          variant: "destructive",
          title: "Stunden überschritten",
          description: `Tagessumme würde ${validation.totalDayHours.toFixed(1)}h betragen (Soll: ${validation.dailyTarget}h).`,
        });
        setSavingEdit(false);
        return;
      }

      const { error } = await supabase
        .from("time_entries")
        .update({
          stunden: editingEntry.stunden,
        })
        .eq("id", editingEntry.id);

      if (error) {
        toast({ variant: "destructive", title: "Fehler", description: "Eintrag konnte nicht aktualisiert werden" });
      } else {
        // Show warning if daily hours are under target
        if (validation && validation.totalDayHours < validation.dailyTarget - 0.01) {
          toast({
            title: "Aktualisiert",
            description: `⚠️ Tagessumme (${validation.totalDayHours.toFixed(1)}h) liegt unter dem Soll (${validation.dailyTarget}h).`,
          });
        } else {
          toast({ title: "Erfolg", description: "Eintrag wurde aktualisiert" });
        }
        setShowEditDialog(false);
        setEditingEntry(null);
        fetchEntries();
      }
      setSavingEdit(false);
      return;
    }

    // Regular entry: calculate hours from times
    const morningStart = editingEntry.start_time ? new Date(`2000-01-01T${editingEntry.start_time}`) : null;
    const morningEndTime = "12:00";
    const morningEnd = new Date(`2000-01-01T${morningEndTime}`);
    
    let calculatedHours = 0;
    
    if (morningStart) {
      const morningMs = morningEnd.getTime() - morningStart.getTime();
      const morningMinutes = morningMs / (1000 * 60);
      calculatedHours += morningMinutes / 60;
      
      if (editingEntry.end_time) {
        const afternoonEnd = new Date(`2000-01-01T${editingEntry.end_time}`);
        const pauseMinutes = editingEntry.pause_minutes || 0;
        const afternoonStartTime = new Date(morningEnd.getTime() + pauseMinutes * 60 * 1000);
        const afternoonMs = afternoonEnd.getTime() - afternoonStartTime.getTime();
        const afternoonMinutes = Math.max(0, afternoonMs / (1000 * 60));
        calculatedHours += afternoonMinutes / 60;
      }
    }

    const finalHours = Math.max(0, calculatedHours);
    const validation = await validateDayHours(editingEntry.id, editingEntry.datum, finalHours);

    const { error } = await supabase
      .from("time_entries")
      .update({
        taetigkeit: editingEntry.taetigkeit,
        start_time: editingEntry.start_time,
        end_time: editingEntry.end_time,
        pause_minutes: editingEntry.pause_minutes || 0,
        notizen: editingEntry.notizen,
        stunden: finalHours,
      })
      .eq("id", editingEntry.id);

    if (error) {
      toast({ variant: "destructive", title: "Fehler", description: "Eintrag konnte nicht aktualisiert werden" });
    } else {
      if (validation && validation.totalDayHours < validation.dailyTarget - 0.01) {
        toast({
          title: "Aktualisiert",
          description: `⚠️ Tagessumme (${validation.totalDayHours.toFixed(1)}h) liegt unter dem Soll (${validation.dailyTarget}h).`,
        });
      } else {
        toast({ title: "Erfolg", description: "Eintrag wurde aktualisiert" });
      }
      setShowEditDialog(false);
      setEditingEntry(null);
      fetchEntries();
    }
    setSavingEdit(false);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Möchtest du diesen Eintrag wirklich löschen?")) return;

    const { error } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ variant: "destructive", title: "Fehler", description: "Eintrag konnte nicht gelöscht werden" });
    } else {
      toast({ title: "Erfolg", description: "Eintrag wurde gelöscht" });
      setShowEditDialog(false);
      setEditingEntry(null);
      fetchEntries();
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Lädt...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Meine Stunden" backPath="/" />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Meine Stunden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b">
              <div className="flex items-center gap-2">
                <Label htmlFor="month-select" className="text-sm font-medium">Monat:</Label>
                <Input
                  id="month-select"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-44"
                />
              </div>
              <div className="text-sm sm:text-base">
                <span className="text-muted-foreground">Gesamt: </span>
                <span className="font-bold text-lg text-primary">{totalHours.toFixed(2)} Std.</span>
              </div>
            </div>

            {entries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Keine Einträge für {new Date(selectedMonth + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
              </p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Ort</TableHead>
                      <TableHead>Projekt</TableHead>
                      <TableHead>Tätigkeit</TableHead>
                      <TableHead colSpan={2} className="text-center">Vormittag</TableHead>
                      <TableHead className="text-center">Pause</TableHead>
                      <TableHead colSpan={2} className="text-center">Nachmittag</TableHead>
                      <TableHead className="text-right">Stunden</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      <TableHead className="text-center">Beginn</TableHead>
                      <TableHead className="text-center">Ende</TableHead>
                      <TableHead className="text-center">von - bis</TableHead>
                      <TableHead className="text-center">Beginn</TableHead>
                      <TableHead className="text-center">Ende</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id} className={isAbsenceEntry(entry) ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {new Date(entry.datum).toLocaleDateString("de-DE")}
                        </TableCell>
                        <TableCell>
                          {isAbsenceEntry(entry) ? (
                            <Badge variant="secondary" className="text-xs">
                              {entry.taetigkeit}
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              {entry.location_type === 'werkstatt' ? (
                                <>
                                  <Hammer className="w-4 h-4 text-muted-foreground" />
                                  <span>Werkstatt</span>
                                </>
                              ) : entry.location_type === 'regie' ? (
                                <>
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                  <span>Regie</span>
                                </>
                              ) : (
                                <>
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                  <span>Baustelle</span>
                                </>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{isAbsenceEntry(entry) ? '-' : (entry.location_type === 'regie' ? 'Regie' : (entry.projects?.name || '-'))}</TableCell>
                        <TableCell>{entry.taetigkeit}</TableCell>
                        <TableCell className="text-center">
                          {isAbsenceEntry(entry) ? '-' : (entry.start_time?.substring(0, 5) || '-')}
                        </TableCell>
                        <TableCell className="text-center">
                          {isAbsenceEntry(entry) ? '-' : calculateMorningEnd(entry)}
                        </TableCell>
                        <TableCell className="text-center">
                          {isAbsenceEntry(entry) ? '-' : formatPauseTime(entry)}
                        </TableCell>
                        <TableCell className="text-center">
                          {isAbsenceEntry(entry) ? '-' : calculateAfternoonStart(entry)}
                        </TableCell>
                        <TableCell className="text-center">
                          {isAbsenceEntry(entry) ? '-' : (
                            entry.pause_minutes && entry.pause_minutes > 0 
                              ? entry.end_time?.substring(0, 5) || '-'
                              : '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {entry.stunden.toFixed(2)} h
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingEntry(entry);
                              setShowEditDialog(true);
                            }}
                            disabled={!isCurrentMonth(entry.datum)}
                            className="h-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={10} className="text-right font-semibold">
                        Gesamtstunden:
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {totalHours.toFixed(2)} h
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ZA & Urlaubssaldo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Timer className="h-5 w-5" />
                Zeitausgleich (ZA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Angesammelt (Freitage)</span>
                <span>+{zaSaldo.earned.toFixed(1)} h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Korrekturen</span>
                <span>{zaSaldo.adjustments >= 0 ? '+' : ''}{zaSaldo.adjustments.toFixed(1)} h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Verbraucht</span>
                <span>−{zaSaldo.used.toFixed(1)} h</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Saldo</span>
                <span className={zaSaldo.balance >= 0 ? "text-green-600" : "text-destructive"}>
                  {zaSaldo.balance >= 0 ? '+' : ''}{zaSaldo.balance.toFixed(1)} h
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5" />
                Urlaubskonto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Guthaben</span>
                <span>{vacationSaldo.granted.toFixed(0)} Tage</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Verbraucht</span>
                <span>−{vacationSaldo.used} Tage</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Saldo</span>
                <span className={vacationSaldo.balance >= 0 ? "text-green-600" : "text-destructive"}>
                  {vacationSaldo.balance.toFixed(0)} Tage
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) setEditingEntry(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry && isAbsenceEntry(editingEntry) 
                ? `${editingEntry.taetigkeit} bearbeiten` 
                : "Stundeneintrag bearbeiten"}
            </DialogTitle>
            <DialogDescription>
              {editingEntry && (
                <>
                  Datum: {new Date(editingEntry.datum).toLocaleDateString('de-DE', { 
                    weekday: 'long', 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {editingEntry && isAbsenceEntry(editingEntry) ? (
            /* Absence edit: simple hours field */
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">{editingEntry.taetigkeit}</Badge>
                </div>
                <div>
                  <Label htmlFor="edit-absence-hours">Stunden</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="edit-absence-hours"
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={editingEntry.stunden}
                      onChange={(e) => setEditingEntry({...editingEntry, stunden: parseFloat(e.target.value) || 0})}
                      className="w-24 text-center"
                    />
                    <span className="text-sm text-muted-foreground">Stunden</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tagessoll: {getTotalWorkingHours(new Date(editingEntry.datum))}h
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdateEntry} className="flex-1" disabled={savingEdit}>
                  {savingEdit ? 'Wird gespeichert...' : 'Speichern'}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => editingEntry && handleDeleteEntry(editingEntry.id)}
                  className="flex-1"
                  disabled={savingEdit}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              </div>
            </div>
          ) : editingEntry && (
            /* Regular entry edit */
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-taetigkeit">Tätigkeit</Label>
                <Input
                  id="edit-taetigkeit"
                  value={editingEntry.taetigkeit}
                  onChange={(e) => setEditingEntry({...editingEntry, taetigkeit: e.target.value})}
                  placeholder="z.B. Dachstuhl montieren"
                />
              </div>

              {/* Vormittag */}
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold text-sm">Vormittag</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-morning-start">Beginn</Label>
                    <Input
                      id="edit-morning-start"
                      type="time"
                      value={editingEntry.start_time || '07:30'}
                      onChange={(e) => setEditingEntry({...editingEntry, start_time: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-morning-end">Ende</Label>
                    <Input
                      id="edit-morning-end"
                      type="time"
                      value="12:00"
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              </div>

              {/* Unterbrechung */}
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold text-sm">Unterbrechung</h3>
                <div>
                  <Label htmlFor="edit-pause">Dauer (Minuten)</Label>
                  <Input
                    id="edit-pause"
                    type="number"
                    min="0"
                    value={editingEntry.pause_minutes || 0}
                    onChange={(e) => setEditingEntry({...editingEntry, pause_minutes: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              {/* Nachmittag */}
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold text-sm">Nachmittag</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-afternoon-start">Beginn</Label>
                    <Input
                      id="edit-afternoon-start"
                      type="time"
                      value={(() => {
                        const dayOfWeek = new Date(editingEntry.datum).getDay();
                        const isFriday = dayOfWeek === 5;
                        const morningEnd = isFriday ? "12:30" : "12:00";
                        const [hours, minutes] = morningEnd.split(':').map(Number);
                        const pauseMinutes = editingEntry.pause_minutes || 0;
                        const totalMinutes = hours * 60 + minutes + pauseMinutes;
                        return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
                      })()}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-afternoon-end">Ende</Label>
                    <Input
                      id="edit-afternoon-end"
                      type="time"
                      value={editingEntry.end_time || ''}
                      onChange={(e) => setEditingEntry({...editingEntry, end_time: e.target.value})}
                    />
                  </div>
                </div>
                {new Date(editingEntry.datum).getDay() === 5 && (
                  <p className="text-xs text-muted-foreground">
                    Freitags ist die Normalarbeitszeit 7:30-12:30 Uhr. Nachmittag nur bei Überstunden.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdateEntry} className="flex-1" disabled={savingEdit}>
                  {savingEdit ? 'Wird gespeichert...' : 'Speichern'}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => editingEntry && handleDeleteEntry(editingEntry.id)}
                  className="flex-1"
                  disabled={savingEdit}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyHours;
