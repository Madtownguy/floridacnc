import UIKit
import WebKit
import Capacitor

// Full-screen shell around the bundled game. Pinch-zoom and double-tap zoom
// stay off so the app does not feel like Safari. Saves stay in the web view's
// persistent store (localStorage) and survive relaunch.
class AppViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.0706, green: 0.0902, blue: 0.1176, alpha: 1)
        lockBrowserGestures()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        lockBrowserGestures()
    }

    private func lockBrowserGestures() {
        guard let scroll = webView?.scrollView else { return }
        scroll.bounces = false
        scroll.alwaysBounceVertical = false
        scroll.alwaysBounceHorizontal = false
        scroll.minimumZoomScale = 1
        scroll.maximumZoomScale = 1
        scroll.pinchGestureRecognizer?.isEnabled = false
        for gesture in scroll.gestureRecognizers ?? [] {
            if let tap = gesture as? UITapGestureRecognizer, tap.numberOfTapsRequired >= 2 {
                tap.isEnabled = false
            }
        }
    }
}
