import { useRouter } from "expo-router";
import { ArrowLeft, ArrowLeftRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Date helpers ─────────────────────────────────────────────────────────────

type DateFields = { month: string; day: string; year: string };

const DAYS_OF_WEEK = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

function parseFields(f: DateFields): Date | null {
  const m = parseInt(f.month, 10);
  const d = parseInt(f.day, 10);
  const y = parseInt(f.year, 10);
  if (!m || !d || !y || y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31)
    return null;
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function todayFields(): DateFields {
  const now = new Date();
  return {
    month: String(now.getMonth() + 1),
    day: String(now.getDate()),
    year: String(now.getFullYear()),
  };
}

type AgeResult = {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalWeeks: number;
  totalDays: number;
  nextBirthdayDays: number;
  dayOfWeek: string;
};

function calcAge(dob: Date, asOf: Date): AgeResult | null {
  if (dob >= asOf) return null;

  const totalDays = Math.floor(
    (asOf.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths =
    (asOf.getFullYear() - dob.getFullYear()) * 12 +
    (asOf.getMonth() - dob.getMonth()) -
    (asOf.getDate() < dob.getDate() ? 1 : 0);

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  // Days component
  const lastBirthday = new Date(
    asOf.getFullYear(),
    dob.getMonth(),
    dob.getDate()
  );
  if (lastBirthday > asOf) {
    lastBirthday.setFullYear(lastBirthday.getFullYear() - 1);
  }
  const days = Math.floor(
    (asOf.getTime() - lastBirthday.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Next birthday
  let nextBirthday = new Date(
    asOf.getFullYear(),
    dob.getMonth(),
    dob.getDate()
  );
  if (nextBirthday <= asOf) {
    nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
  }
  const nextBirthdayDays = Math.ceil(
    (nextBirthday.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    years,
    months,
    days,
    totalMonths,
    totalWeeks,
    totalDays,
    nextBirthdayDays,
    dayOfWeek: DAYS_OF_WEEK[dob.getDay()],
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
    <View className="mb-5">
      <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {label}
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-800" style={{ flex: 1.2 }}>
          <TextInput
            value={fields.month}
            onChangeText={(v) => onChange({ ...fields, month: v })}
            keyboardType="number-pad"
            placeholder="MM"
            placeholderTextColor="#a1a1aa"
            maxLength={2}
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
        </View>
        <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-800" style={{ flex: 1.2 }}>
          <TextInput
            value={fields.day}
            onChangeText={(v) => onChange({ ...fields, day: v })}
            keyboardType="number-pad"
            placeholder="DD"
            placeholderTextColor="#a1a1aa"
            maxLength={2}
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
        </View>
        <View className="flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-800" style={{ flex: 2 }}>
          <TextInput
            value={fields.year}
            onChangeText={(v) => onChange({ ...fields, year: v })}
            keyboardType="number-pad"
            placeholder="YYYY"
            placeholderTextColor="#a1a1aa"
            maxLength={4}
            className="flex-1 py-4 text-lg text-zinc-900 dark:text-white"
          />
        </View>
      </View>
      <Text className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
        Month · Day · Year
      </Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgeCalculatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [dob, setDob] = useState<DateFields>({ month: "", day: "", year: "" });
  const [asOfToday, setAsOfToday] = useState(true);
  const [asOf, setAsOf] = useState<DateFields>(todayFields());

  const dobDate = parseFields(dob);
  const asOfDate = asOfToday ? new Date() : parseFields(asOf);
  const result = dobDate && asOfDate ? calcAge(dobDate, asOfDate) : null;

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
          Age Calculator
        </Text>
      </View>

      <View className="px-4">
        <DateInputRow label="Date of Birth" fields={dob} onChange={setDob} />

        {/* As of toggle */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Calculate As Of
        </Text>
        <View className="mb-5 flex-row rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {(["Today", "Custom"] as const).map((opt) => {
            const isToday = opt === "Today";
            const active = asOfToday === isToday;
            return (
              <Pressable
                key={opt}
                onPress={() => setAsOfToday(isToday)}
                className={`flex-1 rounded-xl py-2.5 ${active ? "bg-violet-600" : ""}`}
              >
                <Text
                  className={`text-center text-sm font-semibold ${
                    active ? "text-white" : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!asOfToday && (
          <DateInputRow label="Custom Date" fields={asOf} onChange={setAsOf} />
        )}

        {/* Results */}
        {result === null ? (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              {dobDate === null
                ? "Enter a valid date of birth above"
                : "The date of birth must be before the 'as of' date"}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Age
              </Text>
              <Text className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200">
                {result.years} years
              </Text>
              <Text className="mt-0.5 text-sm text-violet-500 dark:text-violet-400">
                {result.months} months, {result.days} days
              </Text>
            </View>

            {[
              { label: "Total Days", value: result.totalDays.toLocaleString() },
              {
                label: "Total Weeks",
                value: result.totalWeeks.toLocaleString(),
              },
              {
                label: "Total Months",
                value: result.totalMonths.toLocaleString(),
              },
            ].map(({ label, value }) => (
              <View
                key={label}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {label}
                </Text>
                <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {value}
                </Text>
              </View>
            ))}

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Next Birthday
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {result.nextBirthdayDays === 0
                  ? "Today!"
                  : `${result.nextBirthdayDays} days`}
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Born On
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {result.dayOfWeek}
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
