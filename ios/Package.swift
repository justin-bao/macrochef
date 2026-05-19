// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MacroChef",
    platforms: [.iOS(.v17)],
    dependencies: [
        .package(
            url: "https://github.com/supabase/supabase-swift.git",
            from: "2.0.0"
        ),
    ],
    targets: [
        .executableTarget(
            name: "MacroChef",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
                .product(name: "Auth", package: "supabase-swift"),
                .product(name: "PostgREST", package: "supabase-swift"),
            ],
            path: "Sources/MacroChef",
            swiftSettings: [
                .enableExperimentalFeature("StrictConcurrency"),
            ],
            linkerSettings: [
                .linkedFramework("HealthKit", .when(platforms: [.iOS])),
            ]
        ),
    ]
)
