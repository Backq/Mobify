import SwiftUI

struct Theme {
    static let bgDark = Color(red: 0.05, green: 0.05, blue: 0.1)
    static let primaryBlue = Color(red: 0.05, green: 0.65, blue: 0.91) // #0EA5E9 Sky-500
    static let textMain = Color.white
    static let textMuted = Color.gray
    
    static let glassGradient = LinearGradient(
        gradient: Gradient(colors: [
            Color.white.opacity(0.1),
            Color.white.opacity(0.05)
        ]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

struct GlassBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(
                Theme.glassGradient
                    .background(Color.black.opacity(0.2))
                    .blur(radius: 1)
            )
            .cornerRadius(20)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
    }
}

extension View {
    func glassStyle() -> some View {
        self.modifier(GlassBackground())
    }
}
