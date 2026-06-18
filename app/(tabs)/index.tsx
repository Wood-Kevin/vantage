import {
  BedDouble,
  BookOpen,
  Calculator,
  CalendarDays,
  CalendarRange,
  Clock,
  CreditCard,
  Divide,
  Flame,
  Fuel,
  GraduationCap,
  KeyRound,
  Landmark,
  LayoutList,
  LucideIcon,
  Map,
  Percent,
  Receipt,
  Ruler,
  Scale,
  Tag,
  User,
  Users,
  Waves,
  Zap,
} from "lucide-react-native";
import { Dimensions, FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import ToolCard from "@/components/ToolCard";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = (screenWidth - 56) / 2;

type ToolItem = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
};

const TOOLS: ToolItem[] = [
  {
    id: "tip-calculator",
    title: "Tip Calculator",
    description: "Split bills and calculate tips instantly",
    icon: Calculator,
    route: "/tools/tip-calculator",
  },
  {
    id: "expense-splitter",
    title: "Expense Splitter",
    description: "Track group expenses and settle up fairly",
    icon: Users,
    route: "/tools/expense-splitter",
  },
  {
    id: "percentage-calculator",
    title: "Percentage",
    description: "Three modes for any percentage problem",
    icon: Percent,
    route: "/tools/percentage-calculator",
  },
  {
    id: "unit-converter",
    title: "Unit Converter",
    description: "Length, weight, temp and volume",
    icon: Ruler,
    route: "/tools/unit-converter",
  },
  {
    id: "sleep-calculator",
    title: "Sleep Calculator",
    description: "Find your optimal bedtime and wake time",
    icon: BedDouble,
    route: "/tools/sleep-calculator",
  },
  {
    id: "password-generator",
    title: "Password Generator",
    description: "Create strong, secure passwords",
    icon: KeyRound,
    route: "/tools/password-generator",
  },
  {
    id: "bmi-calculator",
    title: "BMI Calculator",
    description: "Calculate and understand your BMI",
    icon: Scale,
    route: "/tools/bmi-calculator",
  },
  {
    id: "age-calculator",
    title: "Age Calculator",
    description: "Exact age in days, weeks, and months",
    icon: CalendarDays,
    route: "/tools/age-calculator",
  },
  {
    id: "date-difference",
    title: "Date Difference",
    description: "Days, weekdays, and weeks between dates",
    icon: CalendarRange,
    route: "/tools/date-difference",
  },
  {
    id: "tax-estimator",
    title: "Tax Estimator",
    description: "Freelance and contract tax breakdown",
    icon: Receipt,
    route: "/tools/tax-estimator",
  },
  {
    id: "loan-payoff",
    title: "Loan Payoff",
    description: "See when your debt is gone",
    icon: CreditCard,
    route: "/tools/loan-payoff",
  },
  {
    id: "mortgage-affordability",
    title: "Mortgage",
    description: "How much home can you afford?",
    icon: Landmark,
    route: "/tools/mortgage-affordability",
  },
  {
    id: "hourly-salary",
    title: "Hourly ↔ Salary",
    description: "Convert any pay rate instantly",
    icon: Clock,
    route: "/tools/hourly-salary",
  },
  {
    id: "subscription-tracker",
    title: "Subscriptions",
    description: "Track monthly spending on services",
    icon: LayoutList,
    route: "/tools/subscription-tracker",
  },
  {
    id: "water-intake",
    title: "Water Intake",
    description: "Track your daily hydration goal",
    icon: Waves,
    route: "/tools/water-intake",
  },
  {
    id: "calorie-deficit",
    title: "Calorie Deficit",
    description: "BMR, TDEE, and calorie targets",
    icon: Flame,
    route: "/tools/calorie-deficit",
  },
  {
    id: "body-fat",
    title: "Body Fat %",
    description: "Estimate body fat with US Navy method",
    icon: User,
    route: "/tools/body-fat",
  },
  {
    id: "study-timer",
    title: "Study Timer",
    description: "Pomodoro timer with custom intervals",
    icon: BookOpen,
    route: "/tools/study-timer",
  },
  {
    id: "gpa-calculator",
    title: "GPA Calculator",
    description: "Calculate GPA or find the grade you need",
    icon: GraduationCap,
    route: "/tools/gpa-calculator",
  },
  {
    id: "fuel-cost",
    title: "Fuel Cost",
    description: "Estimate fuel cost for any trip",
    icon: Fuel,
    route: "/tools/fuel-cost",
  },
  {
    id: "ev-charging",
    title: "EV Charging",
    description: "Charging time, cost, and range added",
    icon: Zap,
    route: "/tools/ev-charging",
  },
  {
    id: "road-trip",
    title: "Road Trip",
    description: "Full trip budget: fuel, food, and lodging",
    icon: Map,
    route: "/tools/road-trip",
  },
  {
    id: "discount-markup",
    title: "Discount & Markup",
    description: "Discounts, markups, and reverse pricing",
    icon: Tag,
    route: "/tools/discount-markup",
  },
  {
    id: "ratio-proportion",
    title: "Ratio & Proportion",
    description: "Simplify, scale, or solve missing values",
    icon: Divide,
    route: "/tools/ratio-proportion",
  },
];

function Header({ topInset }: { topInset: number }) {
  return (
    <View style={{ paddingTop: topInset + 16 }} className="px-4 pb-4">
      <Text className="text-3xl font-bold text-zinc-900 dark:text-white">
        Vantage
      </Text>
      <Text className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
        One app. 30 tools. Zero fluff.
      </Text>
    </View>
  );
}

function groupIntoRows(items: ToolItem[]): [ToolItem, ToolItem | null][] {
  const rows: [ToolItem, ToolItem | null][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i], items[i + 1] ?? null]);
  }
  return rows;
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rows = groupIntoRows(TOOLS);

  return (
    <View className="flex-1 bg-white dark:bg-zinc-900">
      <FlatList
        data={rows}
        keyExtractor={(item) => item[0].id}
        ListHeaderComponent={<Header topInset={insets.top} />}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <ToolCard
              title={item[0].title}
              description={item[0].description}
              icon={item[0].icon}
              onPress={() => router.push(item[0].route as never)}
            />
            {item[1] ? (
              <ToolCard
                title={item[1].title}
                description={item[1].description}
                icon={item[1].icon}
                onPress={() => router.push(item[1]!.route as never)}
              />
            ) : (
              <View style={{ width: CARD_WIDTH }} />
            )}
          </View>
        )}
      />
    </View>
  );
}
