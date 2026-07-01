import { useRouter } from "expo-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Disclaimer } from "@/components/Disclaimer";

// ─── Types and pure calculation ───────────────────────────────────────────────

type Cycle = "Weekly" | "Monthly" | "Yearly";

type Subscription = {
  id: string;
  name: string;
  cost: string;
  cycle: Cycle;
};

const CYCLES: Cycle[] = ["Weekly", "Monthly", "Yearly"];

function toMonthly(cost: number, cycle: Cycle): number {
  switch (cycle) {
    case "Weekly":
      return cost * (52 / 12);
    case "Monthly":
      return cost;
    case "Yearly":
      return cost / 12;
  }
}

type Totals = {
  monthlyTotal: number;
  yearlyTotal: number;
  dailyTotal: number;
  items: { id: string; name: string; monthly: number; annual: number }[];
};

function calcTotals(subs: Subscription[]): Totals {
  const items = subs
    .map((s) => {
      const cost = parseFloat(s.cost) || 0;
      const monthly = toMonthly(cost, s.cycle);
      return { id: s.id, name: s.name || "Unnamed", monthly, annual: monthly * 12 };
    })
    .filter((s) => s.monthly > 0);

  const monthlyTotal = items.reduce((sum, s) => sum + s.monthly, 0);
  return {
    monthlyTotal,
    yearlyTotal: monthlyTotal * 12,
    dailyTotal: monthlyTotal / 30.44,
    items,
  };
}

function fmt(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function nextId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Component ────────────────────────────────────────────────────────────────

const EMPTY_FORM: Omit<Subscription, "id"> = {
  name: "",
  cost: "",
  cycle: "Monthly",
};

export default function SubscriptionTrackerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [form, setForm] = useState<Omit<Subscription, "id">>(EMPTY_FORM);

  function addSubscription() {
    if (!form.name.trim() && !form.cost) return;
    setSubscriptions((prev) => [
      ...prev,
      { id: nextId(), ...form },
    ]);
    setForm(EMPTY_FORM);
  }

  function deleteSubscription(id: string) {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  }

  function updateSubscription(id: string, patch: Partial<Omit<Subscription, "id">>) {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }

  const totals = calcTotals(subscriptions);

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
          Subscription Tracker
        </Text>
      </View>

      <View className="px-4">
        {/* Subscription list */}
        {subscriptions.length > 0 && (
          <View className="mb-4 gap-2">
            {subscriptions.map((sub) => (
              <View
                key={sub.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <View className="flex-row items-center gap-2">
                  {/* Name */}
                  <TextInput
                    value={sub.name}
                    onChangeText={(v) => updateSubscription(sub.id, { name: v })}
                    placeholder="Name"
                    placeholderTextColor="#a1a1aa"
                    className="flex-1 text-sm font-semibold text-zinc-900 dark:text-white"
                  />
                  {/* Delete */}
                  <Pressable
                    onPress={() => deleteSubscription(sub.id)}
                    hitSlop={8}
                    className="rounded-lg p-1"
                  >
                    <Trash2 size={16} color="#f87171" />
                  </Pressable>
                </View>

                <View className="mt-2 flex-row items-center gap-2">
                  {/* Cost */}
                  <View className="flex-row items-center rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900">
                    <Text className="mr-1 text-sm text-zinc-400">$</Text>
                    <TextInput
                      value={sub.cost}
                      onChangeText={(v) => updateSubscription(sub.id, { cost: v })}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#a1a1aa"
                      className="w-20 text-sm text-zinc-900 dark:text-white"
                    />
                  </View>

                  {/* Cycle selector */}
                  <View className="flex-1 flex-row gap-1">
                    {CYCLES.map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => updateSubscription(sub.id, { cycle: c })}
                        className={`flex-1 items-center rounded-xl py-2 ${
                          sub.cycle === c
                            ? "bg-violet-600"
                            : "border border-zinc-200 bg-white dark:border-zinc-600 dark:bg-zinc-900"
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-semibold ${
                            sub.cycle === c
                              ? "text-white"
                              : "text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          {c === "Weekly" ? "Wkly" : c === "Monthly" ? "Mo" : "Yr"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Per-subscription monthly cost */}
                {parseFloat(sub.cost) > 0 && (
                  <Text className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                    {fmt(toMonthly(parseFloat(sub.cost), sub.cycle))} / month
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Add form */}
        <View className="mb-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-600 dark:bg-zinc-800">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Add Subscription
          </Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Name (e.g. Netflix)"
              placeholderTextColor="#a1a1aa"
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
            />
            <View className="flex-row items-center rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900">
              <Text className="mr-1 text-sm text-zinc-400">$</Text>
              <TextInput
                value={form.cost}
                onChangeText={(v) => setForm((f) => ({ ...f, cost: v }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#a1a1aa"
                className="w-16 text-sm text-zinc-900 dark:text-white"
              />
            </View>
          </View>
          <View className="mt-2 flex-row gap-1">
            {CYCLES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setForm((f) => ({ ...f, cycle: c }))}
                className={`flex-1 items-center rounded-xl py-2 ${
                  form.cycle === c
                    ? "bg-violet-600"
                    : "border border-zinc-200 bg-white dark:border-zinc-600 dark:bg-zinc-900"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    form.cycle === c
                      ? "text-white"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={addSubscription}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-violet-600 py-3"
          >
            <Plus size={16} color="#fff" />
            <Text className="font-semibold text-white">Add Subscription</Text>
          </Pressable>
        </View>

        {/* Totals */}
        {totals.items.length > 0 ? (
          <View className="gap-3">
            <View className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
              <Text className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Monthly Total
              </Text>
              <Text className="mt-1 text-3xl font-bold text-violet-700 dark:text-violet-200">
                {fmt(totals.monthlyTotal)}
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Annual Total
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(totals.yearlyTotal)}
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Cost Per Day
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(totals.dailyTotal)}
              </Text>
            </View>

            {/* Per-subscription breakdown */}
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Breakdown
              </Text>
              <View className="gap-2">
                {totals.items.map((item) => (
                  <View key={item.id} className="flex-row justify-between">
                    <Text
                      className="flex-1 text-sm text-zinc-600 dark:text-zinc-400"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {fmt(item.monthly)} / mo
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              Add your first subscription above to track your spending
            </Text>
          </View>
        )}

        <Disclaimer variant="finance" />
      </View>
    </ScrollView>
  );
}
