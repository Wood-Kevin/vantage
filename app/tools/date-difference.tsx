import { useRouter } from "expo-router";
import { ArrowLeft, ArrowLeftRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Date helpers ─────────────────────────────────────────────────────────────

type DateFields = { month: string; day: string; year: string };

function parseFields(f: DateFields): Date | null {
  const m = parseInt(f.month, 10);
  const d = parseInt(f.day, 10);
  const y = parseInt(f.year, 10);
  if (!m || !d || !y || y < 1 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31)
    return null;
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

type DiffResult = {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  remainingDaysAfterWeeks: number;
  totalMonths: number;
  remainingDaysAfterMonths: number;
  weekdays: number;
  weekends: number;
  isNegative: boolean;
};

function countWeekdaysWeekends(
  start: Date,
  end: Date
): { weekdays: number; weekends: number } {
  let weekdays = 0;
  let weekends = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    const dow = cursor.getDay();
    if (dow === 0 || dow === 6) {
      weekends++;
    } else {
      weekdays++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { weekdays, weekends };
}

function calcDiff(a: Date, b: Date): DiffResult {
  const isNegative = a > b;
  const start = isNegative ? b : a;
  const end = isNegative ? a : b;

  const totalDays = Math.floor(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalWeeks = Math.floor(totalDays / 7);
  const remainingDaysAfterWeeks = totalDays % 7;

  const totalMonths =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) -
    (end.getDate() < start.getDate() ? 1 : 0);

  const afterMonths = new Date(
    start.getFullYear(),
    start.getMonth() + totalMonths,
    start.getDate()
  );
  const remainingDaysAfterMonths = Math.floor(
    (end.getTime() - afterMonths.getTime()) / (1000 * 60 * 60 * 24)
  );

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const afterYearsMonths = new Date(
    start.getFullYear(),
    start.getMonth() + years * 12 + months,
    start.getDate()
  );
  const days = Math.floor(
    (end.getTime() - afterYearsMonths.getTime()) / (1000 * 60 * 60 * 24)
  );

  const { weekdays, weekends } = countWeekdaysWeekends(start, end);

  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks,
    remainingDaysAfterWeeks,
    totalMonths,
    remainingDaysAfterMonths,
    weekdays,
    weekends,
    isNegative,
  };
}

// ─── Sub-component: compact date input ───────────────────────────────────────

function DateInputRow({
  label,
  fields,
  onChange,
}: {
  label: string;
  fields: DateFields;
  onChange: (f: DateFields) => void;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {label}
      </Text>
      <View className="flex-row gap-1">
        <View
          className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-2 dark:border-zinc-700 dark:bg-zinc-800"
          style={{ flex: 1 }}
        >
          <TextInput
            value={fields.month}
            onChangeText={(v) => onChange({ ...fields, month: v })}
            keyboardType="number-pad"
            placeholder="MM"
            placeholderTextColor="#a1a1aa"
            maxLength={2}
            className="flex-1 py-3 text-base text-zinc-900 dark:text-white"
          />
        </View>
        <View
          className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-2 dark:border-zinc-700 dark:bg-zinc-800"
          style={{ flex: 1 }}
        >
          <TextInput
            value={fields.day}
            onChangeText={(v) => onChange({ ...fields, day: v })}
            keyboardType="number-pad"
            placeholder="DD"
            placeholderTextColor="#a1a1aa"
            maxLength={2}
            className="flex-1 py-3 text-base text-zinc-900 dark:text-white"
          />
        </View>
        <View
          className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-2 dark:border-zinc-700 dark:bg-zinc-800"
          style={{ flex: 1.6 }}
        >
          <TextInput
            value={fields.year}
            onChangeText={(v) => onChange({ ...fields, year: v })}
            keyboardType="number-pad"
            placeholder="YYYY"
            placeholderTextColor="#a1a1aa"
            maxLength={4}
            className="flex-1 py-3 text-base text-zinc-900 dark:text-white"
          />
        </View>
      </View>
      <Text className="mt-1 text-xs text-zinc-400">Mo · Day · Year</Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DateDifferenceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [startDate, setStartDate] = useState<DateFields>({
    month: "",
    day: "",
    year: "",
  });
  const [endDate, setEndDate] = useState<DateFields>({
    month: "",
    day: "",
    year: "",
  });

  const startParsed = parseFields(startDate);
  const endParsed = parseFields(endDate);
  const result =
    startParsed && endParsed && startParsed.getTime() !== endParsed.getTime()
      ? calcDiff(startParsed, endParsed)
      : null;

  function swapDates() {
    setStartDate(endDate);
    setEndDate(startDate);
  }

  function humanDiff(r: DiffResult): string {
    const parts: string[] = [];
    if (r.years > 0) parts.push(`${r.years} yr${r.years !== 1 ? "s" : ""}`);
    if (r.months > 0) parts.push(`${r.months} mo`);
    if (r.days > 0) parts.push(`${r.days} day${r.days !== 1 ? "s" : ""}`);
    return parts.join(", ") || "Same day";
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-900"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="flex-row items-center gap-3 px-4 pb-4"
      >
        <Pressable onPress={() => router.back()} hitSlop={8} className="rounded-full p-1">
          <ArrowLeft size={22} color="#7c3aed" />
        </Pressable>
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">
          Date Difference
        </Text>
      </View>

      <View className="px-4">
        {/* Date inputs side by side */}
        <View className="mb-2 flex-row items-end gap-3">
          <DateInputRow
            label="Start Date"
            fields={startDate}
            onChange={setStartDate}
          />
          <DateInputRow
            label="End Date"
            fields={endDate}
            onChange={setEndDate}
          />
        </View>

        {/* Swap button */}
        <Pressable
          onPress={swapDates}
          className="mb-6 flex-row items-center justify-center gap-2 rounded-2xl border border-zinc-200 py-3 dark:border-zinc-700"
        >
          <ArrowLeftRight size={16} color="#7c3aed" />
          <Text className="text-sm font-semibold text-violet-600">
            Swap dates
          </Text>
        </Pressable>

        {/* Results */}
        {result === null ? (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              Enter two valid dates above to see the difference
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {result.isNegative && (
              <View className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-800 dark:bg-amber-950">
                <Text className="text-xs text-amber-600 dark:text-amber-400">
                  End date is before start date — showing absolute difference
                </Text>
              </View>
            )}

            <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Difference
              </Text>
              <Text className="mt-1 text-2xl font-bold text-violet-700 dark:text-violet-200">
                {humanDiff(result)}
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Total Days
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {result.totalDays.toLocaleString()}
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Total Weeks
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {result.totalWeeks.toLocaleString()}
              </Text>
              {result.remainingDaysAfterWeeks > 0 && (
                <Text className="mt-0.5 text-sm text-zinc-400">
                  + {result.remainingDaysAfterWeeks} day
                  {result.remainingDaysAfterWeeks !== 1 ? "s" : ""}
                </Text>
              )}
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Total Months
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {result.totalMonths.toLocaleString()}
              </Text>
              {result.remainingDaysAfterMonths > 0 && (
                <Text className="mt-0.5 text-sm text-zinc-400">
                  + {result.remainingDaysAfterMonths} day
                  {result.remainingDaysAfterMonths !== 1 ? "s" : ""}
                </Text>
              )}
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Weekdays
                </Text>
                <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {result.weekdays.toLocaleString()}
                </Text>
              </View>
              <View className="flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Weekends
                </Text>
                <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {result.weekends.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
