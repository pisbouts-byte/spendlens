import WidgetKit
import SwiftUI

// MARK: - Data model

struct BudgetEntry: TimelineEntry {
    let date: Date
    let totalBudgeted: Double
    let totalSpent: Double
    let periodLabel: String
    let type: String
}

// MARK: - Timeline provider

struct BudgetProvider: TimelineProvider {
    private let suiteName = "group.com.pisbouts.budgetwisely"

    func placeholder(in context: Context) -> BudgetEntry {
        BudgetEntry(date: Date(), totalBudgeted: 2000, totalSpent: 1240, periodLabel: "May 2026", type: "MONTHLY")
    }

    func getSnapshot(in context: Context, completion: @escaping (BudgetEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BudgetEntry>) -> Void) {
        let entry = loadEntry()
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }

    private func loadEntry() -> BudgetEntry {
        let defaults = UserDefaults(suiteName: suiteName)
        return BudgetEntry(
            date: Date(),
            totalBudgeted: defaults?.double(forKey: "bw_totalBudgeted") ?? 0,
            totalSpent:    defaults?.double(forKey: "bw_totalSpent")    ?? 0,
            periodLabel:   defaults?.string(forKey: "bw_periodLabel")   ?? "—",
            type:          defaults?.string(forKey: "bw_type")          ?? "MONTHLY"
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
            LinearGradient(colors: [brandBlue, brandBlueDark],
                           startPoint: .topLeading, endPoint: .bottomTrailing)

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
                        Text("Budget Wisely")
                            .font(.caption2).fontWeight(.semibold)
                            .foregroundColor(.white.opacity(0.65))
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
            LinearGradient(colors: [brandBlue, brandBlueDark],
                           startPoint: .topLeading, endPoint: .bottomTrailing)

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
                    // Left: amounts
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Budget Wisely")
                            .font(.caption2).fontWeight(.semibold)
                            .foregroundColor(.white.opacity(0.65))

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

                    // Divider
                    Rectangle()
                        .fill(Color.white.opacity(0.2))
                        .frame(width: 1)
                        .padding(.vertical, 8)

                    // Right: stats
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
        StaticConfiguration(kind: kind, provider: BudgetProvider()) { entry in
            if #available(iOS 17.0, *) {
                BudgetWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                BudgetWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Budget Tracker")
        .description("See your monthly or weekly budget progress at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
