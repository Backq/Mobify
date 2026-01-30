import SwiftUI
import WebKit

struct WebViewWrapper: UIViewRepresentable {
    let url: URL
    
    func makeUIView(context: Context) -> WKWebView {
        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences = prefs
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        // Essential for background playback
        config.allowsAirPlayForMediaPlayback = true
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true
        
        // Custom User Agent to avoid mobile redirects and get full layout
        webView.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        
        let request = URLRequest(url: url)
        webView.load(request)
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct ContentView: View {
    @State private var selection = 0
    
    var body: some View {
        TabView(selection: $selection) {
            // HOME - Mobify Site
            WebViewWrapper(url: URL(string: "https://music.mobware.xyz")!)
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
                .tag(0)
            
            // CARPLAY STREAM - YouTube
            WebViewWrapper(url: URL(string: "https://www.youtube.com")!)
                .tabItem {
                    Image(systemName: "play.tv.fill")
                    Text("Carplay Stream")
                }
                .tag(1)
        }
        .accentColor(.red)
        .preferredColorScheme(.dark)
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
