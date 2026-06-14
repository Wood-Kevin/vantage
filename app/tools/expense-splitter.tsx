import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, Trash2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSetting, setSetting } from "@/lib/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

type Person = { id: string; name: string };

type Expense = {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
};

type Transaction = { fromId: string; toId: string; amount: number };

// ─── Pure functions ───────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function fmt(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function computeShares(
  people: Person[],
  expenses: Expense[]
): Record<string, number> {
  const validIds = new Set(people.map((p) => p.id));
  const shares: Record<string, number> = {};
  people.forEach((p) => {
    shares[p.id] = 0;
  });
  for (const expense of expenses) {
    const split = expense.splitBetween.filter((id) => validIds.has(id));
    if (split.length === 0) continue;
    const share = expense.amount / split.length;
    split.forEach((id) => {
      shares[id] += share;
    });
  }
  return shares;
}

function computeSettlement(
  people: Person[],
  expenses: Expense[]
): Transaction[] {
  if (people.length < 2 || expenses.length === 0) return [];
  const validIds = new Set(people.map((p) => p.id));
  const balance: Record<string, number> = {};
  people.forEach((p) => {
    balance[p.id] = 0;
  });

  for (const expense of expenses) {
    const split = expense.splitBetween.filter((id) => validIds.has(id));
    if (split.length === 0) continue;
    const share = expense.amount / split.length;
    if (validIds.has(expense.paidBy)) balance[expense.paidBy] += expense.amount;
    split.forEach((id) => {
      balance[id] -= share;
    });
  }

  // Greedy minimum-transactions algorithm
  const debtors = Object.entries(balance)
    .filter(([, v]) => v < -0.005)
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => a.amount - b.amount);
  const creditors = Object.entries(balance)
    .filter(([, v]) => v > 0.005)
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const payment = Math.min(
      Math.abs(debtors[i].amount),
      creditors[j].amount
    );
    if (payment > 0.005) {
      transactions.push({
        fromId: debtors[i].id,
        toId: creditors[j].id,
        amount: payment,
      });
    }
    debtors[i].amount += payment;
    creditors[j].amount -= payment;
    if (Math.abs(debtors[i].amount) < 0.005) i++;
    if (Math.abs(creditors[j].amount) < 0.005) j++;
  }
  return transactions;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PEOPLE = 10;

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExpenseSplitterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Persisted state
  const [loaded, setLoaded] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Form state
  const [newName, setNewName] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPaidBy, setExpPaidBy] = useState("");
  const [expSplit, setExpSplit] = useState<string[]>([]);

  // Load from storage on mount
  useEffect(() => {
    async function load() {
      const pRaw = await getSetting("splitter_people");
      const eRaw = await getSetting("splitter_expenses");
      if (pRaw) setPeople(JSON.parse(pRaw) as Person[]);
      if (eRaw) setExpenses(JSON.parse(eRaw) as Expense[]);
      setLoaded(true);
    }
    load();
  }, []);

  // Persist whenever state changes (after initial load)
  useEffect(() => {
    if (!loaded) return;
    setSetting("splitter_people", JSON.stringify(people));
  }, [people, loaded]);

  useEffect(() => {
    if (!loaded) return;
    setSetting("splitter_expenses", JSON.stringify(expenses));
  }, [expenses, loaded]);

  // Keep form fields in sync when people list changes
  useEffect(() => {
    // Ensure paidBy still points to a valid person
    if (people.length > 0 && !people.find((p) => p.id === expPaidBy)) {
      setExpPaidBy(people[0].id);
    } else if (people.length === 0) {
      setExpPaidBy("");
    }
    // Add new people to split, remove deleted ones
    setExpSplit((prev) => {
      const validIds = new Set(people.map((p) => p.id));
      const kept = prev.filter((id) => validIds.has(id));
      const added = people
        .filter((p) => !prev.includes(p.id))
        .map((p) => p.id);
      return [...kept, ...added];
    });
  }, [people]); // eslint-disable-line react-hooks/exhaustive-deps

  function getName(id: string): string {
    return people.find((p) => p.id === id)?.name ?? "Unknown";
  }

  function addPerson() {
    const name = newName.trim();
    if (!name || people.length >= MAX_PEOPLE) return;
    if (people.some((p) => p.name.toLowerCase() === name.toLowerCase())) return;
    setPeople((prev) => [...prev, { id: uid(), name }]);
    setNewName("");
  }

  function removePerson(id: string) {
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }

  function addExpense() {
    const desc = expDesc.trim();
    const amount = parseFloat(expAmount);
    if (!desc || !amount || amount <= 0 || !expPaidBy || expSplit.length === 0)
      return;
    setExpenses((prev) => [
      ...prev,
      { id: uid(), description: desc, amount, paidBy: expPaidBy, splitBetween: expSplit },
    ]);
    setExpDesc("");
    setExpAmount("");
  }

  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function toggleSplit(id: string) {
    setExpSplit((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function clearAll() {
    Alert.alert(
      "Clear Everything",
      "This will delete all people and expenses. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            setPeople([]);
            setExpenses([]);
            setNewName("");
            setExpDesc("");
            setExpAmount("");
            setExpPaidBy("");
            setExpSplit([]);
          },
        },
      ]
    );
  }

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const shares = computeShares(people, expenses);
  const settlement = computeSettlement(people, expenses);
  const canAddExpense =
    expDesc.trim().length > 0 &&
    parseFloat(expAmount) > 0 &&
    !!expPaidBy &&
    expSplit.length > 0;

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-900"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      {/* ── Header ── */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="flex-row items-center gap-3 px-4 pb-4"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="rounded-full p-1"
        >
          <ArrowLeft size={22} color="#7c3aed" />
        </Pressable>
        <Text className="flex-1 text-xl font-bold text-zinc-900 dark:text-white">
          Expense Splitter
        </Text>
        {(people.length > 0 || expenses.length > 0) && (
          <Pressable onPress={clearAll} hitSlop={8} className="rounded-full p-1">
            <Trash2 size={20} color="#ef4444" />
          </Pressable>
        )}
      </View>

      <View className="px-4">
        {/* ── People ── */}
        <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          People
          {people.length > 0 ? ` (${people.length}/${MAX_PEOPLE})` : ""}
        </Text>
        <View className="mb-3 flex-row gap-2">
          <View className="flex-1 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Name"
              placeholderTextColor="#a1a1aa"
              returnKeyType="done"
              onSubmitEditing={addPerson}
              className="flex-1 py-3 text-base text-zinc-900 dark:text-white"
            />
          </View>
          <Pressable
            onPress={addPerson}
            disabled={!newName.trim() || people.length >= MAX_PEOPLE}
            className={`items-center justify-center rounded-2xl px-4 ${
              newName.trim() && people.length < MAX_PEOPLE
                ? "bg-violet-600"
                : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          >
            <Text
              className={`font-semibold ${
                newName.trim() && people.length < MAX_PEOPLE
                  ? "text-white"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              Add Person
            </Text>
          </Pressable>
        </View>

        {people.length > 0 && (
          <View className="mb-6 flex-row flex-wrap gap-2">
            {people.map((person) => (
              <View
                key={person.id}
                className="flex-row items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 dark:bg-violet-950"
              >
                <Text className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  {person.name}
                </Text>
                <Pressable onPress={() => removePerson(person.id)} hitSlop={8}>
                  <X size={14} color="#7c3aed" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* ── Empty state ── */}
        {people.length < 2 && expenses.length === 0 && (
          <View className="mb-6 items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-center text-sm text-zinc-400 dark:text-zinc-500">
              Add at least 2 people to get started
            </Text>
          </View>
        )}

        {/* ── Add Expense ── */}
        {people.length >= 2 && (
          <View className="mb-6">
            <Text className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Add Expense
            </Text>

            {/* Description */}
            <Text className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Description
            </Text>
            <View className="mb-3 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
              <TextInput
                value={expDesc}
                onChangeText={setExpDesc}
                placeholder="e.g. Dinner, Hotel, Taxi"
                placeholderTextColor="#a1a1aa"
                className="flex-1 py-3.5 text-base text-zinc-900 dark:text-white"
              />
            </View>

            {/* Amount */}
            <Text className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Amount
            </Text>
            <View className="mb-3 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="mr-1 text-base text-zinc-400">$</Text>
              <TextInput
                value={expAmount}
                onChangeText={setExpAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#a1a1aa"
                className="flex-1 py-3.5 text-base text-zinc-900 dark:text-white"
              />
            </View>

            {/* Paid By */}
            <Text className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Paid By
            </Text>
            <View className="mb-3 flex-row flex-wrap gap-2">
              {people.map((person) => {
                const active = expPaidBy === person.id;
                return (
                  <Pressable
                    key={person.id}
                    onPress={() => setExpPaidBy(person.id)}
                    className={
                      active
                        ? "rounded-xl bg-violet-600 px-4 py-2"
                        : "rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                    }
                  >
                    <Text
                      className={
                        active
                          ? "font-semibold text-white"
                          : "font-semibold text-zinc-700 dark:text-zinc-300"
                      }
                    >
                      {person.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Split Between */}
            <Text className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Split Between
            </Text>
            <View className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800">
              {people.map((person, idx) => (
                <Pressable
                  key={person.id}
                  onPress={() => toggleSplit(person.id)}
                  className={`flex-row items-center gap-3 py-3 ${
                    idx < people.length - 1
                      ? "border-b border-zinc-200 dark:border-zinc-700"
                      : ""
                  }`}
                >
                  <View
                    className={`h-5 w-5 items-center justify-center rounded ${
                      expSplit.includes(person.id)
                        ? "bg-violet-600"
                        : "border-2 border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {expSplit.includes(person.id) && (
                      <Check size={12} color="white" strokeWidth={3} />
                    )}
                  </View>
                  <Text className="flex-1 text-base text-zinc-900 dark:text-white">
                    {person.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={addExpense}
              disabled={!canAddExpense}
              className={`items-center rounded-2xl py-4 ${
                canAddExpense
                  ? "bg-violet-600"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            >
              <Text
                className={`text-base font-bold ${
                  canAddExpense
                    ? "text-white"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                Add Expense
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── Expense List ── */}
        {expenses.length > 0 && (
          <View className="mb-6">
            <Text className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Expenses
            </Text>
            <View className="gap-2">
              {expenses.map((expense) => (
                <View
                  key={expense.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <View className="flex-row items-start gap-3">
                    <View className="flex-1">
                      <View className="flex-row items-baseline justify-between gap-2">
                        <Text
                          className="flex-1 font-semibold text-zinc-900 dark:text-white"
                          numberOfLines={1}
                        >
                          {expense.description}
                        </Text>
                        <Text className="font-bold text-zinc-900 dark:text-white">
                          {fmt(expense.amount)}
                        </Text>
                      </View>
                      <Text className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        Paid by {getName(expense.paidBy)}
                      </Text>
                      <Text
                        className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500"
                        numberOfLines={1}
                      >
                        Split: {expense.splitBetween.map(getName).join(", ")}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => removeExpense(expense.id)}
                      hitSlop={8}
                    >
                      <X size={16} color="#a1a1aa" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Summary ── */}
        {expenses.length > 0 && people.length > 0 && (
          <View className="gap-3">
            <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Summary
            </Text>

            {/* Total */}
            <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Total Expenses
              </Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmt(totalAmount)}
              </Text>
            </View>

            {/* Per-person share */}
            {people.map((person) => (
              <View
                key={person.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {person.name}&apos;s Share
                </Text>
                <Text className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {fmt(shares[person.id] ?? 0)}
                </Text>
              </View>
            ))}

            {/* Settlement */}
            {settlement.length === 0 ? (
              <View className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                <Text className="font-semibold text-green-700 dark:text-green-300">
                  All settled up!
                </Text>
              </View>
            ) : (
              <View>
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Settle Up
                </Text>
                <View className="gap-2">
                  {settlement.map((tx, idx) => (
                    <View
                      key={idx}
                      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
                    >
                      <Text className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                        {getName(tx.fromId)} owes {getName(tx.toId)}{" "}
                        <Text className="text-amber-900 dark:text-amber-100">
                          {fmt(tx.amount)}
                        </Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
