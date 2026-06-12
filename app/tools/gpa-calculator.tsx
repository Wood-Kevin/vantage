import { useRouter } from "expo-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PremiumGate from "@/components/PremiumGate";
import { usePremium } from "@/lib/entitlements";

// ─── Grade data ───────────────────────────────────────────────────────────────

type Grade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D" | "F";

const GRADE_POINTS: Record<Grade, number> = {
  "A+": 4.0, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0, "F": 0.0,
};

const GRADES: Grade[] = [
  "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F",
];

function gradeColor(g: Grade): string {
  if (g.startsWith("A")) return "#16a34a";
  if (g.startsWith("B")) return "#0369a1";
  if (g.startsWith("C")) return "#d97706";
  if (g.startsWith("D")) return "#dc2626";
  return "#6b7280";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "calculate" | "needed";

type Course = {
  id: string;
  name: string;
  grade: Grade;
  credits: string;
};

// ─── Pure calculations ────────────────────────────────────────────────────────

type GpaResult = {
  gpa: number;
  totalCredits: number;
  totalQualityPoints: number;
  distribution: Record<string, number>;
};

function calcGpa(courses: Course[]): GpaResult | null {
  const valid = courses.filter((c) => {
    const cr = parseFloat(c.credits);
    return !isNaN(cr) && cr > 0;
  });
  if (valid.length === 0) return null;

  let totalCredits = 0;
  let totalQualityPoints = 0;
  const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };

  for (const c of valid) {
    const cr = parseFloat(c.credits);
    const pts = GRADE_POINTS[c.grade];
    totalCredits += cr;
    totalQualityPoints += pts * cr;
    const letter = c.grade[0];
    if (letter in distribution) distribution[letter]++;
  }

  return {
    gpa: totalQualityPoints / totalCredits,
    totalCredits,
    totalQualityPoints,
    distribution,
  };
}

type NeededResult =
  | { possible: false; message: string }
  | { possible: true; grade: Grade; gradePoints: number };

function calcNeeded(
  currentGpaStr: string,
  currentCreditsStr: string,
  nextCreditsStr: string,
  targetGpaStr: string
): NeededResult | null {
  const currentGpa = parseFloat(currentGpaStr);
  const currentCredits = parseFloat(currentCreditsStr);
  const nextCredits = parseFloat(nextCreditsStr);
  const targetGpa = parseFloat(targetGpaStr);

  if (
    isNaN(currentGpa) || isNaN(currentCredits) ||
    isNaN(nextCredits) || isNaN(targetGpa)
  ) return null;
  if (
    currentGpa < 0 || currentGpa > 4 || targetGpa < 0 || targetGpa > 4 ||
    currentCredits <= 0 || nextCredits <= 0
  ) return null;

  const totalCredits = currentCredits + nextCredits;
  const currentQualityPoints = currentGpa * currentCredits;
  const targetQualityPoints = targetGpa * totalCredits;
  const neededPoints = (targetQualityPoints - currentQualityPoints) / nextCredits;

  if (neededPoints > 4.0) {
    return {
      possible: false,
      message: `You'd need ${neededPoints.toFixed(2)} GPA points in this course, which exceeds the maximum of 4.0.`,
    };
  }
  if (neededPoints <= 0) {
    return { possible: true, grade: "F", gradePoints: 0 };
  }

  // Find lowest grade that satisfies requirement
  const grade =
    [...GRADES].reverse().find((g) => GRADE_POINTS[g] >= neededPoints) ??
    GRADES[0];

  return { possible: true, grade, gradePoints: GRADE_POINTS[grade] };
}

function nextId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// ─── Component ────────────────────────────────────────────────────────────────

function GradeSelector({
  selected,
  onSelect,
}: {
  selected: Grade;
  onSelect: (g: Grade) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-1">
      {GRADES.map((g) => (
        <Pressable
          key={g}
          onPress={() => onSelect(g)}
          className={`items-center rounded-lg px-2.5 py-1.5 ${
            selected === g
              ? ""
              : "border border-zinc-200 bg-white dark:border-zinc-600 dark:bg-zinc-900"
          }`}
          style={selected === g ? { backgroundColor: gradeColor(g) } : {}}
        >
          <Text
            className={`text-xs font-bold ${selected === g ? "text-white" : "text-zinc-600 dark:text-zinc-400"}`}
          >
            {g}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function GpaCalculatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = usePremium();

  const [mode, setMode] = useState<Mode>("calculate");

  // Mode 1 — courses
  const [courses, setCourses] = useState<Course[]>([
    { id: nextId(), name: "", grade: "A", credits: "3" },
  ]);

  // Mode 2 — grade needed
  const [currentGpa, setCurrentGpa] = useState("");
  const [currentCredits, setCurrentCredits] = useState("");
  const [nextCredits, setNextCredits] = useState("3");
  const [targetGpa, setTargetGpa] = useState("");

  if (isLoading) return null;
  if (!isPremium) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-900">
        <PremiumGate toolName="GPA Calculator" onClose={() => router.back()} />
      </View>
    );
  }

  function addCourse() {
    setCourses((prev) => [
      ...prev,
      { id: nextId(), name: "", grade: "A", credits: "3" },
    ]);
  }

  function removeCourse(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  function updateCourse(id: string, patch: Partial<Omit<Course, "id">>) {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  const gpaResult = mode === "calculate" ? calcGpa(courses) : null;
  const neededResult =
    mode === "needed"
      ? calcNeeded(currentGpa, currentCredits, nextCredits, targetGpa)
      : null;

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-900"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center gap-3 px-4 pb-4">
        <Pressable onPress={() => router.back()} hitSlop={8} className="rounded-full p-1">
          <ArrowLeft size={22} color="#7c3aed" />
        </Pressable>
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">GPA Calculator</Text>
      </View>

      <View className="px-4">
        {/* Mode toggle */}
        <View className="mb-5 flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {([
            { value: "calculate" as Mode, label: "Calculate GPA" },
            { value: "needed" as Mode, label: "Grade Needed" },
          ]).map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              className={`flex-1 rounded-xl py-2.5 ${mode === value ? "bg-violet-600" : ""}`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  mode === value ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── MODE 1: Calculate GPA ── */}
        {mode === "calculate" && (
          <View>
            {courses.map((course, idx) => (
              <View
                key={course.id}
                className="mb-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <View className="mb-2 flex-row items-center gap-2">
                  <TextInput
                    value={course.name}
                    onChangeText={(v) => updateCourse(course.id, { name: v })}
                    placeholder={`Course ${idx + 1}`}
                    placeholderTextColor="#a1a1aa"
                    className="flex-1 text-sm font-semibold text-zinc-900 dark:text-white"
                  />
                  <View className="flex-row items-center rounded-xl border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900">
                    <TextInput
                      value={course.credits}
                      onChangeText={(v) => updateCourse(course.id, { credits: v })}
                      keyboardType="decimal-pad"
                      placeholder="3"
                      placeholderTextColor="#a1a1aa"
                      className="w-8 text-center text-sm text-zinc-900 dark:text-white"
                    />
                    <Text className="text-xs text-zinc-400">cr</Text>
                  </View>
                  {courses.length > 1 && (
                    <Pressable onPress={() => removeCourse(course.id)} hitSlop={8}>
                      <Trash2 size={15} color="#f87171" />
                    </Pressable>
                  )}
                </View>
                <GradeSelector
                  selected={course.grade}
                  onSelect={(g) => updateCourse(course.id, { grade: g })}
                />
              </View>
            ))}

            <Pressable
              onPress={addCourse}
              className="mb-5 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-300 py-3 dark:border-violet-700"
            >
              <Plus size={16} color="#7c3aed" />
              <Text className="text-sm font-semibold text-violet-600">Add Course</Text>
            </Pressable>

            {gpaResult === null ? (
              <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
                <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
                  Add courses with valid credit hours to calculate your GPA
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                    Cumulative GPA
                  </Text>
                  <Text className="mt-1 text-4xl font-bold text-violet-700 dark:text-violet-200">
                    {gpaResult.gpa.toFixed(2)}
                  </Text>
                  <Text className="mt-0.5 text-xs text-violet-500 dark:text-violet-400">
                    {gpaResult.totalCredits.toFixed(1)} total credit hours
                  </Text>
                </View>

                {/* Grade distribution */}
                <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Grade Distribution
                  </Text>
                  <View className="flex-row gap-2">
                    {Object.entries(gpaResult.distribution).map(([letter, count]) => (
                      <View key={letter} className="flex-1 items-center">
                        <Text className="text-lg font-bold text-zinc-900 dark:text-white">
                          {count}
                        </Text>
                        <Text className="text-xs text-zinc-400">{letter}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── MODE 2: Grade Needed ── */}
        {mode === "needed" && (
          <View className="gap-4">
            {[
              {
                label: "Current GPA",
                value: currentGpa,
                set: setCurrentGpa,
                placeholder: "0.00",
                suffix: "/ 4.0",
              },
              {
                label: "Credit Hours Completed",
                value: currentCredits,
                set: setCurrentCredits,
                placeholder: "0",
                suffix: "cr",
              },
              {
                label: "Next Course Credit Hours",
                value: nextCredits,
                set: setNextCredits,
                placeholder: "3",
                suffix: "cr",
              },
              {
                label: "Target GPA",
                value: targetGpa,
                set: setTargetGpa,
                placeholder: "0.00",
                suffix: "/ 4.0",
              },
            ].map(({ label, value, set, placeholder, suffix }) => (
              <View key={label}>
                <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {label}
                </Text>
                <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <TextInput
                    value={value}
                    onChangeText={set}
                    keyboardType="decimal-pad"
                    placeholder={placeholder}
                    placeholderTextColor="#a1a1aa"
                    className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
                  />
                  <Text className="text-sm text-zinc-400">{suffix}</Text>
                </View>
              </View>
            ))}

            {neededResult === null ? (
              <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
                <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
                  Fill in your current GPA and target to see the required grade
                </Text>
              </View>
            ) : !neededResult.possible ? (
              <View className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <Text className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Not achievable
                </Text>
                <Text className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {neededResult.message}
                </Text>
              </View>
            ) : (
              <View
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: gradeColor(neededResult.grade) + "18",
                  borderWidth: 1,
                  borderColor: gradeColor(neededResult.grade) + "50",
                }}
              >
                <Text
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: gradeColor(neededResult.grade) }}
                >
                  Minimum Grade Needed
                </Text>
                <Text
                  className="mt-1 text-5xl font-bold"
                  style={{ color: gradeColor(neededResult.grade) }}
                >
                  {neededResult.grade}
                </Text>
                <Text
                  className="mt-1 text-sm"
                  style={{ color: gradeColor(neededResult.grade) }}
                >
                  {neededResult.gradePoints.toFixed(1)} quality points
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
