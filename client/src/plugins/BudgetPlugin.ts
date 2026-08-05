import { registerPlugin } from "@capacitor/core";

export interface BudgetItem {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
  type: "MONTHLY" | "WEEKLY";
  periodLabel: string;
}

export interface BudgetPluginInterface {
  updateWidgetData(data: {
    type: "MONTHLY" | "WEEKLY";
    totalBudgeted: number;
    totalSpent: number;
    periodLabel: string;
    budgets: BudgetItem[];
  }): Promise<void>;
}

const BudgetPlugin = registerPlugin<BudgetPluginInterface>("Budget");

export default BudgetPlugin;
