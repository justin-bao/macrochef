import SwiftUI

@main
struct MacroChefApp: App {
    @State private var auth = AuthManager()
    @State private var store: TrackingStore

    init() {
        let auth = AuthManager()
        _auth = State(initialValue: auth)
        _store = State(initialValue: TrackingStore(authManager: auth))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(auth)
                .environment(store)
                .task {
                    await auth.start()
                }
        }
    }
}
