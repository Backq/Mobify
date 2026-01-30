import SwiftUI

struct LibraryView: View {
    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Playlists").foregroundColor(.gray)) {
                    NavigationLink(destination: Text("Liked Songs")) {
                        Label("Liked Songs", systemImage: "heart.fill")
                            .foregroundColor(.red)
                    }
                    
                    // TODO: Fetch playlists from API
                    Text("No custom playlists yet")
                        .foregroundColor(.gray)
                }
                
                Section(header: Text("Import").foregroundColor(.gray)) {
                    Button(action: {}) {
                        Label("Import from Spotify", systemImage: "arrow.down.circle")
                    }
                    Button(action: {}) {
                        Label("Import from YouTube", systemImage: "play.rectangle")
                    }
                }
            }
            .listStyle(InsetGroupedListStyle())
            .navigationTitle("Library")
        }
        .preferredColorScheme(.dark)
    }
}
