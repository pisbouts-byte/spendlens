import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Budget item model (matches what BudgetPlugin writes)

struct BudgetWidgetItem: Codable {
    let id: String
    let name: String
    let budgeted: Double
    let spent: Double
    let type: String
    let periodLabel: String
}

// MARK: - AppEntity for budget picker

struct BudgetEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Budget"
    static var defaultQuery = BudgetEntityQuery()

    var id: String
    var name: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

struct BudgetEntityQuery: EntityQuery {
    private let suiteName = "group.com.pisbouts.budgetwisely"

    func entities(for identifiers: [String]) async throws -> [BudgetEntity] {
        allEntities().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [BudgetEntity] {
        allEntities()
    }

    private func allEntities() -> [BudgetEntity] {
        var results = [BudgetEntity(id: "__all__", name: "All Budgets")]
        guard let defaults = UserDefaults(suiteName: suiteName),
              let data = defaults.data(forKey: "bw_budgets"),
              let items = try? JSONDecoder().decode([BudgetWidgetItem].self, from: data) else {
            return results
        }
        results += items.map { BudgetEntity(id: $0.id, name: $0.name) }
        return results
    }
}

// MARK: - Configuration intent

struct SelectBudgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Budget"
    static var description = IntentDescription("Choose which budget to display.")

    @Parameter(title: "Budget")
    var budget: BudgetEntity?
}

// MARK: - Timeline entry

struct BudgetEntry: TimelineEntry {
    let date: Date
    let totalBudgeted: Double
    let totalSpent: Double
    let periodLabel: String
    let type: String
    let budgetName: String
}

// MARK: - Timeline provider

struct BudgetProvider: AppIntentTimelineProvider {
    private let suiteName = "group.com.pisbouts.budgetwisely"

    func placeholder(in context: Context) -> BudgetEntry {
        BudgetEntry(date: Date(), totalBudgeted: 2000, totalSpent: 1240,
                    periodLabel: "August 2026", type: "MONTHLY", budgetName: "All Budgets")
    }

    func snapshot(for configuration: SelectBudgetIntent, in context: Context) async -> BudgetEntry {
        loadEntry(for: configuration)
    }

    func timeline(for configuration: SelectBudgetIntent, in context: Context) async -> Timeline<BudgetEntry> {
        let entry = loadEntry(for: configuration)
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        return Timeline(entries: [entry], policy: .after(next))
    }

    private func loadEntry(for configuration: SelectBudgetIntent) -> BudgetEntry {
        let defaults = UserDefaults(suiteName: suiteName)
        let selectedId = configuration.budget?.id

        if let selectedId, selectedId != "__all__",
           let data = defaults?.data(forKey: "bw_budgets"),
           let items = try? JSONDecoder().decode([BudgetWidgetItem].self, from: data),
           let item = items.first(where: { $0.id == selectedId }) {
            return BudgetEntry(
                date: Date(),
                totalBudgeted: item.budgeted,
                totalSpent:    item.spent,
                periodLabel:   item.periodLabel,
                type:          item.type,
                budgetName:    item.name
            )
        }

        return BudgetEntry(
            date: Date(),
            totalBudgeted: defaults?.double(forKey: "bw_totalBudgeted") ?? 0,
            totalSpent:    defaults?.double(forKey: "bw_totalSpent")    ?? 0,
            periodLabel:   defaults?.string(forKey: "bw_periodLabel")   ?? "—",
            type:          defaults?.string(forKey: "bw_type")          ?? "MONTHLY",
            budgetName:    "All Budgets"
        )
    }
}

// MARK: - Helpers

private func formatCurrency(_ value: Double) -> String {
    let fmt = NumberFormatter()
    fmt.numberStyle = .currency
    fmt.currencyCode = "USD"
    fmt.maximumFractionDigits = 0
    return fmt.string(from: NSNumber(value: value)) ?? "$0"
}

private let brandBlue     = Color(red: 0.149, green: 0.388, blue: 0.922)
private let brandBlueDark = Color(red: 0.114, green: 0.306, blue: 0.757)
private let dangerRed     = Color(red: 0.937, green: 0.267, blue: 0.267)
private let warningAmber  = Color(red: 0.953, green: 0.612, blue: 0.071)

// MARK: - Small widget view

struct SmallBudgetView: View {
    let entry: BudgetEntry

    var progress: Double {
        guard entry.totalBudgeted > 0 else { return 0 }
        return min(entry.totalSpent / entry.totalBudgeted, 1.0)
    }
    var isOver: Bool { entry.totalSpent > entry.totalBudgeted }
    var barColor: Color { isOver ? dangerRed : progress > 0.8 ? warningAmber : .white }

    var body: some View {
        ZStack {
            if entry.totalBudgeted == 0 {
                VStack(spacing: 6) {
                    Image(systemName: "chart.bar.fill")
                        .font(.title2).foregroundColor(.white.opacity(0.5))
                    Text("Open app to\nset a budget")
                        .font(.caption2).multilineTextAlignment(.center)
                        .foregroundColor(.white.opacity(0.7))
                }
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        Text(entry.budgetName)
                            .font(.caption2).fontWeight(.semibold)
                            .foregroundColor(.white.opacity(0.65))
                            .lineLimit(1)
                        Spacer()
                        Text(entry.type == "MONTHLY" ? "Monthly" : "Weekly")
                            .font(.caption2).foregroundColor(.white.opacity(0.65))
                    }

                    Spacer()

                    Text(formatCurrency(entry.totalSpent))
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .minimumScaleFactor(0.6)
                    Text("of \(formatCurrency(entry.totalBudgeted))")
                        .font(.caption).foregroundColor(.white.opacity(0.75))

                    Spacer()

                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color.white.opacity(0.25)).frame(height: 6)
                            Capsule().fill(barColor)
                                .frame(width: geo.size.width * CGFloat(progress), height: 6)
                        }
                    }.frame(height: 6)

                    HStack {
                        Text(entry.periodLabel)
                            .font(.caption2).foregroundColor(.white.opacity(0.6))
                        Spacer()
                        Text(isOver ? "Over budget" : "\(Int(progress * 100))%")
                            .font(.caption2).fontWeight(.medium)
                            .foregroundColor(isOver ? dangerRed : .white.opacity(0.75))
                    }.padding(.top, 5)
                }
                .padding(14)
            }
        }
    }
}

// MARK: - Medium widget view

struct MediumBudgetView: View {
    let entry: BudgetEntry

    var progress: Double {
        guard entry.totalBudgeted > 0 else { return 0 }
        return min(entry.totalSpent / entry.totalBudgeted, 1.0)
    }
    var isOver: Bool { entry.totalSpent > entry.totalBudgeted }
    var remaining: Double { max(entry.totalBudgeted - entry.totalSpent, 0) }
    var overAmount: Double { max(entry.totalSpent - entry.totalBudgeted, 0) }
    var barColor: Color { isOver ? dangerRed : progress > 0.8 ? warningAmber : Color(red: 0.133, green: 0.773, blue: 0.369) }

    var body: some View {
        ZStack {
            if entry.totalBudgeted == 0 {
                VStack(spacing: 8) {
                    Image(systemName: "chart.bar.fill")
                        .font(.title).foregroundColor(.white.opacity(0.5))
                    Text("Open Budget Wisely to set a budget")
                        .font(.caption).multilineTextAlignment(.center)
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding()
            } else {
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(entry.budgetName)
                            .font(.caption2).fontWeight(.semibold)
                            .foregroundColor(.white.opacity(0.65))
                            .lineLimit(1)

                        Spacer()

                        Text(formatCurrency(entry.totalSpent))
                            .font(.system(size: 30, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .minimumScaleFactor(0.5)
                        Text("spent of \(formatCurrency(entry.totalBudgeted))")
                            .font(.caption).foregroundColor(.white.opacity(0.75))

                        Spacer()

                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.white.opacity(0.25)).frame(height: 7)
                                Capsule().fill(barColor)
                                    .frame(width: geo.size.width * CGFloat(progress), height: 7)
                            }
                        }.frame(height: 7)

                        Text(entry.periodLabel)
                            .font(.caption2).foregroundColor(.white.opacity(0.6))
                            .padding(.top, 5)
                    }

                    Rectangle()
                        .fill(Color.white.opacity(0.2))
                        .frame(width: 1)
                        .padding(.vertical, 8)

                    VStack(alignment: .leading, spacing: 10) {
                        statRow(
                            icon: isOver ? "exclamationmark.circle.fill" : "checkmark.circle.fill",
                            label: isOver ? "Over by" : "Remaining",
                            value: formatCurrency(isOver ? overAmount : remaining),
                            valueColor: isOver ? dangerRed : .white
                        )
                        statRow(
                            icon: "percent",
                            label: "Used",
                            value: "\(Int(progress * 100))%",
                            valueColor: barColor
                        )
                        statRow(
                            icon: entry.type == "MONTHLY" ? "calendar" : "calendar.badge.clock",
                            label: entry.type == "MONTHLY" ? "Monthly" : "Weekly",
                            value: "",
                            valueColor: .white
                        )
                    }
                    .frame(maxWidth: 110, alignment: .leading)
                }
                .padding(16)
            }
        }
    }

    @ViewBuilder
    func statRow(icon: String, label: String, value: String, valueColor: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption2).foregroundColor(.white.opacity(0.65))
                .frame(width: 14)
            VStack(alignment: .leading, spacing: 1) {
                Text(label)
                    .font(.system(size: 9)).foregroundColor(.white.opacity(0.6))
                if !value.isEmpty {
                    Text(value)
                        .font(.system(size: 13, weight: .semibold)).foregroundColor(valueColor)
                }
            }
        }
    }
}

// MARK: - Entry view dispatcher

struct BudgetWidgetEntryView: View {
    var entry: BudgetEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemMedium:
            MediumBudgetView(entry: entry)
        default:
            SmallBudgetView(entry: entry)
        }
    }
}

// MARK: - Widget configuration

struct BudgetWidget: Widget {
    let kind = "BudgetWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectBudgetIntent.self, provider: BudgetProvider()) { entry in
            BudgetWidgetEntryView(entry: entry)
                .containerBackground(for: .widget) {
                    LinearGradient(colors: [brandBlue, brandBlueDark],
                                   startPoint: .topLeading, endPoint: .bottomTrailing)
                }
        }
        .configurationDisplayName("Budget Tracker")
        .description("See your budget progress at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
