import Foundation
import Capacitor
import WidgetKit

@objc(BudgetPlugin)
public class BudgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BudgetPlugin"
    public let jsName = "Budget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateWidgetData", returnType: CAPPluginReturnPromise),
    ]

    private let suiteName = "group.com.pisbouts.budgetwisely"

    @objc func updateWidgetData(_ call: CAPPluginCall) {
        let type         = call.getString("type") ?? "MONTHLY"
        let totalBudgeted = call.getDouble("totalBudgeted") ?? 0
        let totalSpent   = call.getDouble("totalSpent") ?? 0
        let periodLabel  = call.getString("periodLabel") ?? ""

        guard let defaults = UserDefaults(suiteName: suiteName) else {
            call.reject("App Group not configured")
            return
        }

        defaults.set(type, forKey: "bw_type")
        defaults.set(totalBudgeted, forKey: "bw_totalBudgeted")
        defaults.set(totalSpent, forKey: "bw_totalSpent")
        defaults.set(periodLabel, forKey: "bw_periodLabel")
        defaults.set(ISO8601DateFormatter().string(from: Date()), forKey: "bw_updatedAt")

        if let budgets = call.getArray("budgets") as? [[String: Any]],
           let data = try? JSONSerialization.data(withJSONObject: budgets) {
            defaults.set(data, forKey: "bw_budgets")
        }

        defaults.synchronize()

        WidgetCenter.shared.reloadAllTimelines()

        call.resolve()
    }
}
