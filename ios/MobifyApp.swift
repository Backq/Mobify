import SwiftUI

@main
struct MobifyApp: App {
    init() {
        // Setup global appearance
        let appearance = UITabBarAppearance()
        appearance.configureWithDefaultBackground()
        appearance.backgroundColor = UIColor(Theme.bgDark.opacity(0.8))
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
    
    var body: some Scene {
        WindowGroup {
            Group {
                if AuthManager.shared.isAuthenticated {
                    MainTabView()
                } else {
                    AuthView()
                }
            }
            .preferredColorScheme(.dark)
        }
    }
}
