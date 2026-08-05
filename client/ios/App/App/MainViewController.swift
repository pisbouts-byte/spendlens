import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override open var capacitorPlugins: [CAPPlugin.Type] {
        [BudgetPlugin.self]
    }
}
