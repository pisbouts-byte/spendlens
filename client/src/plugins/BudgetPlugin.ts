import { registerPlugin } from "@capacitor/core";

export interface BudgetPluginInterface {
  updateWidgetData(data: {
    type: "MONTHLY" | "WEEKLY";
    totalBudgeted: number;
    totalSpent: number;
    periodLabel: string;
  }): Promise<void>;
}

const BudgetPlugin = registerPlugin<BudgetPluginInterface>("Budget");

export default BudgetPlugin;
