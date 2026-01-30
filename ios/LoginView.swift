import SwiftUI

struct LoginView: View {
    @State private var username = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMsg: String? = nil
    @ObservedObject var auth = AuthManager.shared
    
    var body: some View {
        VStack(spacing: 25) {
            Image(systemName: "music.note")
                .resizable()
                .frame(width: 80, height: 80)
                .foregroundColor(Theme.primaryBlue)
                .padding(.bottom, 20)
            
            Text("Login to Mobify")
                .font(.largeTitle)
                .bold()
            
            VStack(spacing: 15) {
                TextField("Username", text: $username)
                    .padding()
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(10)
                    .autocapitalization(.none)
                
                SecureField("Password", text: $password)
                    .padding()
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(10)
            }
            
            if let error = errorMsg {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
            }
            
            Button(action: login) {
                if isLoading {
                    ProgressView().tint(.black)
                } else {
                    Text("Login")
                        .bold()
                        .frame(maxWidth: .infinity)
                }
            }
            .padding()
            .background(Theme.primaryBlue)
            .foregroundColor(.black)
            .cornerRadius(10)
            .disabled(isLoading || username.isEmpty || password.isEmpty)
            
            Button("Don't have an account? Register") {
                // Toggle to Register mode if needed
            }
            .font(.caption)
            .foregroundColor(.gray)
        }
        .padding(40)
        .background(Theme.bgDark.ignoresSafeArea())
        .foregroundColor(.white)
    }
    
    private func login() {
        isLoading = true
        errorMsg = nil
        Task {
            do {
                try await auth.login(username: username, password: password)
                // AuthManager will update @Published property and UI will react
            } catch {
                await MainActor.run {
                    self.errorMsg = "Login failed. Please check credentials."
                    self.isLoading = false
                }
            }
        }
    }
}
