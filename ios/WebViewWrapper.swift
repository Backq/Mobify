import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences = prefs
        config.allowsInlineMediaPlayback = true
        config.requiresUserActionForMediaPlayback = false
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        let request = URLRequest(url: url)
        webView.load(request)
    }
}

struct ContentView: View {
    var body: some View {
        WebView(url: URL(string: "https://music.mobware.xyz")!)
            .edgesIgnoringSafeArea(.all)
            .background(Color.black)
    }
}

@main
struct MobifyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
