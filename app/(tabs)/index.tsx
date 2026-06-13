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
  Lock,
  LucideIcon,
  Map,
  Percent,
  Receipt,
  Ruler,
  Scale,
  Tag,
  User,
  Waves,
  Zap,
} from "lucide-react-native";
import { Dimensions, FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import ToolCard from "@/components/ToolCard";
import { usePremium } from "@/lib/entitlements";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = (screenWidth - 56) / 2;

type ToolItem = {
  type?: "tool";
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
  tier: "free" | "premium";
};

type DividerItem = {
  type: "divider";
  id: string;
  title: string;
};

type ListItem = ToolItem | DividerItem;

const TOOLS: ListItem[] = [
  {
    id: "tip-calculator",
    title: "Tip Calculator",
    description: "Split bills and calculate tips instantly",
    icon: Calculator,
    route: "/tools/tip-calculator",
    tier: "free",
  },
  {
    id: "tip-from-total",
    title: "Tip from Total",
    description: "Work back to the original bill from total paid",
    icon: Receipt,
    route: "/tools/tip-from-total",
    tier: "free",
  },
  {
    id: "percentage-calculator",
    title: "Percentage",
    description: "Three modes for any percentage problem",
    icon: Percent,
    route: "/tools/percentage-calculator",
    tier: "free",
  },
  {
    id: "unit-converter",
    title: "Unit Converter",
    description: "Length, weight, temp and volume",
    icon: Ruler,
    route: "/tools/unit-converter",
    tier: "free",
  },
  {
    id: "sleep-calculator",
    title: "Sleep Calculator",
    description: "Find your optimal bedtime and wake time",
    icon: BedDouble,
    route: "/tools/sleep-calculator",
    tier: "free",
  },
  {
    id: "password-generator",
    title: "Password Generator",
    description: "Create strong, secure passwords",
    icon: KeyRound,
    route: "/tools/password-generator",
    tier: "free",
  },
  {
    id: "bmi-calculator",
    title: "BMI Calculator",
    description: "Calculate and understand your BMI",
    icon: Scale,
    route: "/tools/bmi-calculator",
    tier: "free",
  },
  {
    id: "age-calculator",
    title: "Age Calculator",
    description: "Exact age in days, weeks, and months",
    icon: CalendarDays,
    route: "/tools/age-calculator",
    tier: "free",
  },
  {
    id: "date-difference",
    title: "Date Difference",
    description: "Days, weekdays, and weeks between dates",
    icon: CalendarRange,
    route: "/tools/date-difference",
    tier: "free",
  },
  {
    id: "tax-estimator",
    title: "Tax Estimator",
    description: "Freelance and contract tax breakdown",
    icon: Receipt,
    route: "/tools/tax-estimator",
    tier: "free",
  },
  {
    type: "divider",
    id: "divider-premium",
    title: "Premium Tools",
  },
  {
    id: "loan-payoff",
    title: "Loan Payoff",
    description: "See when your debt is gone",
    icon: CreditCard,
    route: "/tools/loan-payoff",
    tier: "premium",
  },
  {
    id: "mortgage-affordability",
    title: "Mortgage",
    description: "How much home can you afford?",
    icon: Landmark,
    route: "/tools/mortgage-affordability",
    tier: "premium",
  },
  {
    id: "hourly-salary",
    title: "Hourly ↔ Salary",
    description: "Convert any pay rate instantly",
    icon: Clock,
    route: "/tools/hourly-salary",
    tier: "premium",
  },
  {
    id: "subscription-tracker",
    title: "Subscriptions",
    description: "Track monthly spending on services",
    icon: LayoutList,
    route: "/tools/subscription-tracker",
    tier: "premium",
  },
  {
    id: "water-intake",
    title: "Water Intake",
    description: "Track your daily hydration goal",
    icon: Waves,
    route: "/tools/water-intake",
    tier: "premium",
  },
  {
    id: "calorie-deficit",
    title: "Calorie Deficit",
    description: "BMR, TDEE, and calorie targets",
    icon: Flame,
    route: "/tools/calorie-deficit",
    tier: "premium",
  },
  {
    id: "body-fat",
    title: "Body Fat %",
    description: "Estimate body fat with US Navy method",
    icon: User,
    route: "/tools/body-fat",
    tier: "premium",
  },
  {
    id: "study-timer",
    title: "Study Timer",
    description: "Pomodoro timer with custom intervals",
    icon: BookOpen,
    route: "/tools/study-timer",
    tier: "premium",
  },
  {
    id: "gpa-calculator",
    title: "GPA Calculator",
    description: "Calculate GPA or find the grade you need",
    icon: GraduationCap,
    route: "/tools/gpa-calculator",
    tier: "premium",
  },
  {
    id: "fuel-cost",
    title: "Fuel Cost",
    description: "Estimate fuel cost for any trip",
    icon: Fuel,
    route: "/tools/fuel-cost",
    tier: "premium",
  },
  {
    id: "ev-charging",
    title: "EV Charging",
    description: "Charging time, cost, and range added",
    icon: Zap,
    route: "/tools/ev-charging",
    tier: "premium",
  },
  {
    id: "road-trip",
    title: "Road Trip",
    description: "Full trip budget: fuel, food, and lodging",
    icon: Map,
    route: "/tools/road-trip",
    tier: "premium",
  },
  {
    id: "discount-markup",
    title: "Discount & Markup",
    description: "Discounts, markups, and reverse pricing",
    icon: Tag,
    route: "/tools/discount-markup",
    tier: "premium",
  },
  {
    id: "ratio-proportion",
    title: "Ratio & Proportion",
    description: "Simplify, scale, or solve missing values",
    icon: Divide,
    route: "/tools/ratio-proportion",
    tier: "premium",
  },
];

function Header({ topInset }: { topInset: number }) {
  return (
    <View style={{ paddingTop: topInset + 16 }} className="px-4 pb-4">
      <Text className="text-3xl font-bold text-zinc-900 dark:text-white">
        Vantage
      </Text>
      <Text className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
        One app. 25+ tools. Zero fluff.
      </Text>
    </View>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <View className="flex-row items-center px-4 pt-4 pb-2">
      <View className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
      <View className="flex-row items-center mx-3 gap-1.5">
        <Lock size={11} color="#a1a1aa" />
        <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {title}
        </Text>
      </View>
      <View className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
    </View>
  );
}

function groupItemsIntoRows(items: ListItem[]): (ListItem | [ToolItem, ToolItem | null])[] {
  const rows: (ListItem | [ToolItem, ToolItem | null])[] = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (item.type === "divider") {
      rows.push(item);
      i++;
    } else {
      const next = items[i + 1];
      if (next && next.type !== "divider") {
        rows.push([item as ToolItem, next as ToolItem]);
        i += 2;
      } else {
        rows.push([item as ToolItem, null]);
        i++;
      }
    }
  }
  return rows;
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();
  const rows = groupItemsIntoRows(TOOLS);

  return (
    <View className="flex-1 bg-white dark:bg-zinc-900">
      <FlatList
        data={rows}
        keyExtractor={(item) =>
          Array.isArray(item) ? item[0].id : item.id
        }
        ListHeaderComponent={<Header topInset={insets.top} />}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          if (Array.isArray(item)) {
            return (
              <View style={{ flexDirection: "row", gap: 12 }}>
                <ToolCard
                  title={item[0].title}
                  description={item[0].description}
                  icon={item[0].icon}
                  tier={item[0].tier}
                  isLocked={item[0].tier === "premium" && !isPremium}
                  onPress={() => router.push(item[0].route as never)}
                />
                {item[1] ? (
                  <ToolCard
                    title={item[1].title}
                    description={item[1].description}
                    icon={item[1].icon}
                    tier={item[1].tier}
                    isLocked={item[1].tier === "premium" && !isPremium}
                    onPress={() => router.push(item[1]!.route as never)}
                  />
                ) : (
                  <View style={{ width: CARD_WIDTH }} />
                )}
              </View>
            );
          }
          return <SectionDivider title={item.title} />;
        }}
      />
    </View>
  );
}
