import {
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Film,
  ShoppingBag,
  Heart,
  Scissors,
  GraduationCap,
  Plane,
  CreditCard,
  DollarSign,
  Tag,
  Coffee,
  Music,
  Smartphone,
  Wifi,
  Baby,
  Dog,
  Dumbbell,
  Gift,
  Briefcase,
  Building2,
  Fuel,
  PiggyBank,
  Banknote,
  Receipt,
  Landmark,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Film,
  ShoppingBag,
  Heart,
  Scissors,
  GraduationCap,
  Plane,
  CreditCard,
  DollarSign,
  Tag,
  Coffee,
  Music,
  Smartphone,
  Wifi,
  Baby,
  Dog,
  Dumbbell,
  Gift,
  Briefcase,
  Building2,
  Fuel,
  PiggyBank,
  Banknote,
  Receipt,
  Landmark,
  CircleDollarSign,
};

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
}

export function CategoryIcon({ name, className = "h-4 w-4", size }: CategoryIconProps) {
  const Icon = iconMap[name] || Tag;
  return <Icon className={className} size={size} />;
}

/** All available icon names for picker UI */
export const availableIcons = Object.keys(iconMap);
