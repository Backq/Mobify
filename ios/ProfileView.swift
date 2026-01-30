import SwiftUI

struct ProfileView: View {
    @ObservedObject var auth = AuthManager.shared
    
    var body: some View {
        NavigationView {
            ZStack {
                Theme.bgDark.ignoresSafeArea()
                
                VStack(spacing: 30) {
                    Image(systemName: "person.circle.fill")
                        .resizable()
                        .frame(width: 100, height: 100)
                        .foregroundColor(Theme.primaryBlue)
                        .padding(.top, 40)
                    
                    if let user = auth.currentUser {
                        Text(user.username)
                            .font(.title)
                            .bold()
                            .foregroundColor(.white)
                        
                        Text("Mobify Member")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    
                    Spacer()
                    
                    VStack(spacing: 15) {
                        Button(action: { /* App Info */ }) {
                            ProfileRow(icon: "info.circle", title: "App Version", value: "2.0.0 Native")
                        }
                        
                        Button(action: { /* Server Info */ }) {
                            ProfileRow(icon: "server.rack", title: "Server", value: "Default")
                        }
                        
                        Button(action: { auth.logout() }) {
                            HStack {
                                Image(systemName: "power")
                                Text("Logout")
                                Spacer()
                            }
                            .padding()
                            .glassStyle()
                            .foregroundColor(.red)
                        }
                    }
                    .padding(.horizontal)
                    
                    Spacer()
                }
            }
            .navigationTitle("Profile")
        }
    }
}

struct ProfileRow: View {
    let icon: String
    let title: String
    let value: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
            Text(title)
            Spacer()
            Text(value).foregroundColor(.gray)
        }
        .padding()
        .glassStyle()
        .foregroundColor(.white)
    }
}
