import SwiftUI

@main
struct MobifyApp: App {
    init() {
        // Setup global appearance
        let appearance = UITabBarAppearance()
        appearance.configureWithDefaultBackground()
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)
        }
    }
}

struct ContentView: View {
    @StateObject private var auth = AuthManager.shared
    
    var body: some View {
        Group {
            if auth.isAuthenticated {
                MainTabView()
            } else {
                AuthView()
            }
        }
    }
}
