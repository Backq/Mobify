import SwiftUI

struct AuthView: View {
    @State private var isLogin = true
    @State private var username = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var showAlert = false
    @State private var errorMsg: String? = nil
    @ObservedObject var auth = AuthManager.shared
    
    var body: some View {
        VStack(spacing: 25) {
            Image(systemName: "music.note")
                .resizable()
                .frame(width: 80, height: 80)
                .foregroundColor(Theme.primaryBlue)
                .padding(.bottom, 10)
            
            Text(isLogin ? "Login to Mobify" : "Create Account")
                .font(.largeTitle)
                .bold()
            
            VStack(spacing: 15) {
                TextField("Username", text: $username)
                    .padding()
                    .glassStyle()
                    .autocapitalization(.none)
                
                SecureField("Password", text: $password)
                    .padding()
                    .glassStyle()
            }
            
            Button(action: submit) {
                if isLoading {
                    ProgressView().tint(.black)
                } else {
                    Text(isLogin ? "Login" : "Register")
                        .bold()
                        .frame(maxWidth: .infinity)
                }
            }
            .padding()
            .background(Theme.primaryBlue)
            .foregroundColor(.black)
            .cornerRadius(12)
            .disabled(isLoading || username.isEmpty || password.isEmpty)
            
            Button(isLogin ? "Don't have an account? Register" : "Already have an account? Login") {
                withAnimation { isLogin.toggle() }
            }
            .font(.caption)
            .foregroundColor(.gray)
        }
        .padding(40)
        .background(Theme.bgDark.ignoresSafeArea())
        .foregroundColor(.white)
        .alert(isPresented: $showAlert) {
            Alert(title: Text("Error"), message: Text(errorMsg ?? "Unknown error"), dismissButton: .default(Text("OK")))
        }
    }
    
    private func submit() {
        isLoading = true
        errorMsg = nil
        Task {
            do {
                if isLogin {
                    try await auth.login(username: username, password: password)
                } else {
                    try await auth.register(username: username, password: password)
                }
                // On success, isAuthenticated changes and view should swap
                await MainActor.run {
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.errorMsg = isLogin ? "Login failed. Check credentials." : "Registration failed. Username might be taken."
                    self.isLoading = false
                    self.showAlert = true
                }
            }
        }
    }
}
