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
    let isPrimary: Bool
}

// MARK: - AppEntity for budget picker

struct BudgetEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Budget"
    static var defaultQuery = BudgetEntityQuery()

    var id: String
    var name: String
    var type: String // "MONTHLY", "WEEKLY", or "" for the all-budgets sentinel

    var displayRepresentation: DisplayRepresentation {
        if type.isEmpty {
            return DisplayRepresentation(title: "\(name)")
        }
        let label = type == "WEEKLY" ? "Weekly" : "Monthly"
        return DisplayRepresentation(title: "\(name)", subtitle: "\(label)")
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
        var results = [BudgetEntity(id: "__all__", name: "All Budgets", type: "")]
        guard let defaults = UserDefaults(suiteName: suiteName),
              let data = defaults.data(forKey: "bw_budgets"),
              let items = try? JSONDecoder().decode([BudgetWidgetItem].self, from: data) else {
            return results
        }
        results += items.map { BudgetEntity(id: $0.id, name: $0.name, type: $0.type) }
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

// MARK: - API response decoders (mirrors BudgetProgress from shared types)

private struct ApiResponse<T: Decodable>: Decodable {
    let data: T
}

private struct ApiCategory: Decodable {
    let name: String
}

private struct ApiBudget: Decodable {
    let id: String
    let type: String
    let amount: String
    let isPrimary: Bool
    let category: ApiCategory?
}

private struct ApiProgress: Decodable {
    let budget: ApiBudget
    let spent: String
    let periodStart: String
}

private func periodLabel(from start: String, type budgetType: String) -> String {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM-dd"
    guard let date = df.date(from: start) else { return "—" }
    if budgetType == "WEEKLY" {
        let end = Calendar.current.date(byAdding: .day, value: 6, to: date) ?? date
        let s = DateFormatter(); s.dateFormat = "MMM d"
        let e = DateFormatter(); e.dateFormat = "MMM d, yyyy"
        return "\(s.string(from: date)) – \(e.string(from: end))"
    }
    let fmt = DateFormatter(); fmt.dateFormat = "MMMM yyyy"
    return fmt.string(from: date)
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
        await refreshCache(for: configuration)
        let entry = loadEntry(for: configuration)
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        return Timeline(entries: [entry], policy: .after(next))
    }

    // Fetches fresh data from the API and updates the App Group cache.
    // Silently does nothing on network failure so stale cache is used instead.
    private func refreshCache(for configuration: SelectBudgetIntent) async {
        let defaults = UserDefaults(suiteName: suiteName)
        guard let token = defaults?.string(forKey: "bw_authToken"), !token.isEmpty,
              let apiUrl = defaults?.string(forKey: "bw_apiUrl"), !apiUrl.isEmpty else { return }

        let budgetType: String
        if let selected = configuration.budget, selected.id != "__all__", !selected.type.isEmpty {
            budgetType = selected.type
        } else {
            budgetType = "MONTHLY"
        }

        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        let today = df.string(from: Date())

        func fetchItems(type: String) async -> [BudgetWidgetItem] {
            guard let url = URL(string: "\(apiUrl)/budgets/progress?type=\(type)&date=\(today)"),
                  url.scheme == "http" || url.scheme == "https" else { return [] }
            var request = URLRequest(url: url, timeoutInterval: 10)
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            guard let (data, response) = try? await URLSession.shared.data(for: request),
                  (response as? HTTPURLResponse)?.statusCode == 200,
                  let result = try? JSONDecoder().decode(ApiResponse<[ApiProgress]>.self, from: data) else {
                return []
            }
            return result.data.map { p in
                BudgetWidgetItem(
                    id: p.budget.id,
                    name: p.budget.category?.name ?? "Overall Spending",
                    budgeted: Double(p.budget.amount) ?? 0,
                    spent: Double(p.spent) ?? 0,
                    type: p.budget.type,
                    periodLabel: periodLabel(from: p.periodStart, type: p.budget.type),
                    isPrimary: p.budget.isPrimary
                )
            }
        }

        // Fetch both types so the config picker always offers Monthly and
        // Weekly budgets, regardless of which type this widget instance shows.
        async let monthlyItems = fetchItems(type: "MONTHLY")
        async let weeklyItems = fetchItems(type: "WEEKLY")
        let allItems = await monthlyItems + weeklyItems
        guard !allItems.isEmpty else { return }

        let items = allItems.filter { $0.type == budgetType }
        let totalBudgeted = items.reduce(0.0) { $0 + $1.budgeted }
        let totalSpent    = items.reduce(0.0) { $0 + $1.spent }
        let label         = items.first?.periodLabel ?? "—"

        if let encoded = try? JSONEncoder().encode(allItems) {
            defaults?.set(encoded, forKey: "bw_budgets")
        }
        defaults?.set(totalBudgeted, forKey: "bw_totalBudgeted")
        defaults?.set(totalSpent,    forKey: "bw_totalSpent")
        defaults?.set(label,         forKey: "bw_periodLabel")
        defaults?.set(budgetType,    forKey: "bw_type")
        defaults?.synchronize()
    }

    private func loadEntry(for configuration: SelectBudgetIntent) -> BudgetEntry {
        let defaults = UserDefaults(suiteName: suiteName)
        let selectedId = configuration.budget?.id
        let cachedItems: [BudgetWidgetItem]? = {
            guard let data = defaults?.data(forKey: "bw_budgets") else { return nil }
            return try? JSONDecoder().decode([BudgetWidgetItem].self, from: data)
        }()

        if let selectedId, selectedId != "__all__",
           let item = cachedItems?.first(where: { $0.id == selectedId }) {
            return BudgetEntry(
                date: Date(),
                totalBudgeted: item.budgeted,
                totalSpent:    item.spent,
                periodLabel:   item.periodLabel,
                type:          item.type,
                budgetName:    item.name
            )
        }

        // No selection has been made yet (widget just added, unconfigured) —
        // default to the user's primary budget instead of the all-budgets total.
        if selectedId == nil, let primary = cachedItems?.first(where: { $0.isPrimary }) {
            return BudgetEntry(
                date: Date(),
                totalBudgeted: primary.budgeted,
                totalSpent:    primary.spent,
                periodLabel:   primary.periodLabel,
                type:          primary.type,
                budgetName:    primary.name
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
