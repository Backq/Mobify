import SwiftUI

struct SearchView: View {
    @State private var query = ""
    @State private var results: [Track] = []
    @State private var isLoading = false
    
    var onTrackSelect: (Track) -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Native Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                TextField("Search for songs, artists...", text: $query)
                    .textFieldStyle(PlainTextFieldStyle())
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                    .onChange(of: query) { newValue in
                        debounceSearch()
                    }
            }
            .padding()
            .glassStyle()
            .padding()
            
            if isLoading && results.isEmpty {
                Spacer()
                ProgressView()
                    .tint(.white)
                Spacer()
            } else if results.isEmpty && !query.isEmpty {
                Spacer()
                Text("No results found")
                    .foregroundColor(.gray)
                Spacer()
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(results) { track in
                            TrackRow(track: track)
                                .onTapGesture {
                                    onTrackSelect(track)
                                }
                        }
                    }
                    .padding()
                }
            }
        }
        .background(Theme.bgDark.ignoresSafeArea())
    }
    
    private func debounceSearch() {
        guard !query.isEmpty else {
            results = []
            return
        }
        
        isLoading = true
        // Debounce logic using Task
        Task {
            try? await Task.sleep(nanoseconds: 600_000_000) // 0.6s
            guard !Task.isCancelled else { return }
            
            do {
                let response = try await APIService.shared.search(query: query)
                DispatchQueue.main.async {
                    self.results = response.results
                    self.isLoading = false
                }
            } catch {
                print("Search failed: \(error)")
                DispatchQueue.main.async {
                    self.isLoading = false
                }
            }
        }
    }
}

struct TrackRow: View {
    let track: Track
    
    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: track.thumbnail)) { image in
                image.resizable()
            } placeholder: {
                Color.gray.opacity(0.3)
            }
            .frame(width: 50, height: 50)
            .cornerRadius(8)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(track.title)
                    .font(.headline)
                    .lineLimit(1)
                Text(track.uploader)
                    .font(.subheadline)
                    .foregroundColor(.gray)
                    .lineLimit(1)
            }
            
            Spacer()
            
            Text(formatDuration(track.duration))
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding(8)
        .glassStyle()
    }
    
    func formatDuration(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", mins, secs)
    }
}
