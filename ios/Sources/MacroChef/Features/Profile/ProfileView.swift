import SwiftUI
internal import Auth

struct ProfileView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(TrackingStore.self) private var store
    @State private var settings: TrackingSettings = TrackingSettings()
    @State private var showSignOutConfirm = false
    @State private var savedConfirmation = false

    var body: some View {
        NavigationStack {
            Form {
                // User section
                Section {
                    if let user = auth.user {
                        HStack(spacing: 14) {
                            ZStack {
                                Circle().fill(.green.opacity(0.15)).frame(width: 52, height: 52)
                                Text(user.email?.prefix(1).uppercased() ?? "U")
                                    .font(.title2.weight(.bold))
                                    .foregroundStyle(.green)
                            }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(user.email ?? "No email")
                                    .font(.subheadline.weight(.medium))
                                Text("Member")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }

                // Daily targets
                Section {
                    LabeledContent("Calories") {
                        HStack {
                            TextField("2500", value: $settings.dailyCalorieTarget, format: .number)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 70)
                            Text("kcal").foregroundStyle(.secondary)
                        }
                    }
                    LabeledContent("Protein") {
                        HStack {
                            TextField("180", value: $settings.dailyProteinTarget, format: .number)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 70)
                            Text("g").foregroundStyle(.secondary)
                        }
                    }
                    LabeledContent("Carbs") {
                        HStack {
                            TextField("280", value: $settings.dailyCarbsTarget, format: .number)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 70)
                            Text("g").foregroundStyle(.secondary)
                        }
                    }
                    LabeledContent("Fat") {
                        HStack {
                            TextField("80", value: $settings.dailyFatTarget, format: .number)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 70)
                            Text("g").foregroundStyle(.secondary)
                        }
                    }
                } header: {
                    Text("Daily Targets")
                } footer: {
                    Text("These targets appear on your diary progress bar.")
                }

                // Body info
                Section("Body Info") {
                    LabeledContent("Age") {
                        HStack {
                            TextField("35", value: $settings.age, format: .number)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 60)
                            Text("years").foregroundStyle(.secondary)
                        }
                    }
                    LabeledContent("Weight") {
                        HStack {
                            TextField("180", value: $settings.weight, format: .number)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 70)
                            Text(settings.unitSystem == "imperial" ? "lb" : "kg").foregroundStyle(.secondary)
                        }
                    }
                    Picker("Sex", selection: $settings.sex) {
                        ForEach(Sex.allCases, id: \.self) { Text($0.label).tag($0) }
                    }
                    Picker("Units", selection: $settings.unitSystem) {
                        Text("Imperial (lb/in)").tag("imperial")
                        Text("Metric (kg/cm)").tag("metric")
                    }
                }

                // Goal
                Section("Nutrition Goal") {
                    Picker("Goal", selection: $settings.goal) {
                        ForEach(ProfileGoal.allCases, id: \.self) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.navigationLink)
                }

                // Save button
                Section {
                    Button {
                        store.updateSettings(settings)
                        withAnimation {
                            savedConfirmation = true
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            withAnimation { savedConfirmation = false }
                        }
                    } label: {
                        HStack {
                            Spacer()
                            if savedConfirmation {
                                Label("Saved!", systemImage: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                            } else {
                                Text("Save Changes")
                                    .foregroundStyle(.green)
                            }
                            Spacer()
                        }
                    }
                }

                // Sign out
                Section {
                    Button(role: .destructive) {
                        showSignOutConfirm = true
                    } label: {
                        HStack {
                            Spacer()
                            Text("Sign Out")
                            Spacer()
                        }
                    }
                }
            }
            .scrollDismissesKeyboard(.immediately)
            .navigationTitle("Profile")
            .onAppear {
                settings = store.settings
            }
            .confirmationDialog("Sign out?", isPresented: $showSignOutConfirm) {
                Button("Sign Out", role: .destructive) {
                    Task { try? await auth.signOut() }
                }
                Button("Cancel", role: .cancel) {}
            }
        }
    }
}
