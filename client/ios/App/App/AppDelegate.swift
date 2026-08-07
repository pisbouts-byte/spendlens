import UIKit
import Capacitor
import BackgroundTasks
import WidgetKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    private let suiteName  = "group.com.pisbouts.budgetwisely"
    private let syncTaskId = "com.pisbouts.budgetwisely.sync"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: syncTaskId, using: nil) { task in
            self.handleBackgroundSync(task: task as! BGAppRefreshTask)
        }
        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        scheduleBackgroundSync()
    }

    // MARK: - Background sync

    private func scheduleBackgroundSync() {
        let request = BGAppRefreshTaskRequest(identifier: syncTaskId)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }

    private func handleBackgroundSync(task: BGAppRefreshTask) {
        scheduleBackgroundSync() // reschedule immediately so next wakeup is already queued

        guard let defaults = UserDefaults(suiteName: suiteName),
              let token  = defaults.string(forKey: "bw_authToken"), !token.isEmpty,
              let apiUrl = defaults.string(forKey: "bw_apiUrl"),    !apiUrl.isEmpty,
              let url    = URL(string: "\(apiUrl)/plaid/sync-all") else {
            task.setTaskCompleted(success: false)
            return
        }

        var request = URLRequest(url: url, timeoutInterval: 25)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let urlTask = URLSession.shared.dataTask(with: request) { _, _, error in
            WidgetCenter.shared.reloadAllTimelines()
            task.setTaskCompleted(success: error == nil)
        }

        task.expirationHandler = {
            urlTask.cancel()
            task.setTaskCompleted(success: false)
        }

        urlTask.resume()
    }

    // MARK: - Capacitor passthrough

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
