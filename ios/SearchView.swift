import SwiftUI

struct SearchView: View {
    @State private var query = ""
    @State private var results: [Track] = []
    @State private var isLoading = false
    @State private var currentPage = 1
    @State private var hasMore = false
    @State private var isLoadingMore = false
    @State private var showAlert = false
    @State private var errorMsg = ""
    
    var onTrackSelect: (Track) -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Native Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                TextField("Search (limit 5 + load more)...", text: $query)
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
            } else if results.isEmpty && !query.isEmpty && !isLoading {
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
                        
                        if hasMore {
                            Button(action: loadMore) {
                                if isLoadingMore {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Load More")
                                        .bold()
                                        .padding()
                                        .frame(maxWidth: .infinity)
                                        .background(Theme.primaryBlue.opacity(0.8))
                                        .cornerRadius(10)
                                }
                            }
                            .padding(.top, 10)
                            .disabled(isLoadingMore)
                        }
                    }
                    .padding()
                }
            }
        }
        .background(Theme.bgDark.ignoresSafeArea())
        .alert(isPresented: $showAlert) {
            Alert(title: Text("Search Error"), message: Text(errorMsg), dismissButton: .default(Text("OK")))
        }
    }
    
    @State private var searchTask: Task<Void, Never>? = nil

    private func debounceSearch() {
        searchTask?.cancel()
        
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
            results = []
            isLoading = false
            hasMore = false
            return
        }
        
        isLoading = true
        currentPage = 1
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 500_000_000)
            guard !Task.isCancelled else { return }
            
            do {
                let response = try await APIService.shared.search(query: query, page: 1, limit: 5)
                guard !Task.isCancelled else { return }
                
                await MainActor.run {
                    self.results = response.results
                    self.hasMore = response.has_more
                    self.isLoading = false
                }
            } catch {
                if !Task.isCancelled {
                    await MainActor.run {
                        self.errorMsg = "Search failed. Check your connection."
                        self.showAlert = true
                        self.isLoading = false
                    }
                }
            }
        }
    }
    
    private func loadMore() {
        isLoadingMore = true
        Task {
            do {
                let nextPage = currentPage + 1
                let response = try await APIService.shared.search(query: query, page: nextPage, limit: 5)
                await MainActor.run {
                    self.results.append(contentsOf: response.results)
                    self.hasMore = response.has_more
                    self.currentPage = nextPage
                    self.isLoadingMore = false
                }
            } catch {
                await MainActor.run {
                    self.errorMsg = "Could not load more results."
                    self.showAlert = true
                    self.isLoadingMore = false
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
