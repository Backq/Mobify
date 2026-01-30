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
        config.mediaTypesRequiringUserActionForPlayback = []
        
        // Essential for background playback in webview
        config.allowsAirPlayForMediaPlayback = true
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true
        
        // Ensure the background is black to match Mobify aesthetic
        webView.backgroundColor = .black
        webView.isOpaque = false
        
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        let request = URLRequest(url: url)
        webView.load(request)
    }
}

struct ContentView: View {
    @State private var selection = 0
    
    var body: some View {
        TabView(selection: $selection) {
            // HOME - Mobify Site
            WebView(url: URL(string: "https://music.mobware.xyz")!)
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
                .tag(0)
            
            // SEARCH - YouTube
            WebView(url: URL(string: "https://www.youtube.com")!)
                .tabItem {
                    Image(systemName: "magnifyingglass")
                    Text("Search")
                }
                .tag(1)
        }
        .accentColor(.red) // Match Mobify/YouTube branding
        .preferredColorScheme(.dark)
    }
}

@main
struct MobifyApp: App {
    init() {
        // Basic configuration for audio playback
        // In a real app we'd setup AVAudioSession here, 
        // but for a webview wrapper, the browser engine handles most of it.
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
