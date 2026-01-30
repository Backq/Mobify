import Foundation

class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published var isAuthenticated: Bool = false
    @Published var currentUser: User?
    
    private init() {
        checkAuth()
    }
    
    func checkAuth() {
        if let _ = UserDefaults.standard.string(forKey: "mobify_token"),
           let userData = UserDefaults.standard.data(forKey: "mobify_user") {
            do {
                self.currentUser = try JSONDecoder().decode(User.self, from: userData)
                self.isAuthenticated = true
            } catch {
                logout()
            }
        }
    }
    
    func login(username: String, password: String) async throws {
        let resp = try await APIService.shared.login(username: username, password: Array(password))
        await MainActor.run {
            saveSession(token: resp.token, user: resp.user)
        }
    }
    
    func register(username: String, password: String) async throws {
        let resp = try await APIService.shared.register(username: username, password: Array(password))
        await MainActor.run {
            saveSession(token: resp.token, user: resp.user)
        }
    }
    
    private func saveSession(token: String, user: User) {
        UserDefaults.standard.set(token, forKey: "mobify_token")
        if let encodedUser = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(encodedUser, forKey: "mobify_user")
        }
        self.currentUser = user
        self.isAuthenticated = true
    }
    
    func logout() {
        UserDefaults.standard.removeObject(forKey: "mobify_token")
        UserDefaults.standard.removeObject(forKey: "mobify_user")
        self.currentUser = nil
        self.isAuthenticated = false
    }
}
