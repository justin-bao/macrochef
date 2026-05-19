import SwiftUI

// MARK: - Brand colour

extension Color {
    /// MacroChef sage-green: #7d9b76
    static let brand = Color(red: 125 / 255, green: 155 / 255, blue: 118 / 255)
}

// MARK: - Salad icon shape

/// Lucide "Salad" icon paths drawn in SwiftUI.
/// The paths live on a 24 × 24 viewBox and are scaled to fit `rect`.
private struct SaladShape: Shape {
    func path(in rect: CGRect) -> Path {
        let s = rect.width / 24          // scale factor
        var p = Path()

        // ── Path 1: stem   M7 21h10 ───────────────────────────────────────
        p.move(to: CGPoint(x: 7 * s, y: 21 * s))
        p.addLine(to: CGPoint(x: 17 * s, y: 21 * s))

        // ── Path 2: bowl   M12 21 arc to 21,12  H3  arc back to 12,21 ────
        // Bowl rim is a horizontal line at y=12; the lower half is the
        // two quarter-circle arcs below it.
        p.move(to: CGPoint(x: 12 * s, y: 21 * s))
        // Right arc: (12,21)→(21,12) CCW = clockwise:false in SwiftUI y-down
        p.addArc(
            center: CGPoint(x: 12 * s, y: 12 * s),
            radius: 9 * s,
            startAngle: .degrees(90),
            endAngle: .degrees(0),
            clockwise: false
        )
        // Horizontal rim
        p.addLine(to: CGPoint(x: 3 * s, y: 12 * s))
        // Left arc: (3,12)→(12,21) CCW
        p.addArc(
            center: CGPoint(x: 12 * s, y: 12 * s),
            radius: 9 * s,
            startAngle: .degrees(180),
            endAngle: .degrees(90),
            clockwise: false
        )
        p.closeSubpath()

        // ── Path 3: salad greens (simplified circles above rim) ───────────
        // Lucide draws overlapping 2.4-radius circles; approximate with arcs.
        let gr: CGFloat = 2.4 * s
        for cx in [CGFloat(9.5), 12.0, 15.0] {
            let cy: CGFloat = (cx == 12 ? 7.5 : 8.5)
            p.move(to: CGPoint(x: (cx + gr) * s, y: cy * s))
            p.addArc(
                center: CGPoint(x: cx * s, y: cy * s),
                radius: gr,
                startAngle: .degrees(0),
                endAngle: .degrees(360),
                clockwise: false
            )
        }

        // ── Path 4: diagonal  M13 12 L17 8 ───────────────────────────────
        p.move(to: CGPoint(x: 13 * s, y: 12 * s))
        p.addLine(to: CGPoint(x: 17 * s, y: 8 * s))

        // ── Path 5: leaf arc  M10.9 7.25 A3.99… to (4,10) c… to (4.54,12)
        p.move(to: CGPoint(x: 10.9 * s, y: 7.25 * s))
        p.addArc(
            center: CGPoint(x: 7.45 * s, y: 10 * s),
            radius: 3.99 * s,
            startAngle: .degrees(-42),
            endAngle: .degrees(180),
            clockwise: false
        )
        // Approximate the cubic bezier with a quad curve
        p.addQuadCurve(
            to: CGPoint(x: 4.54 * s, y: 12 * s),
            control: CGPoint(x: 4.1 * s, y: 11.2 * s)
        )

        return p
    }
}

// MARK: - Brand icon view

/// Rounded-square icon matching the MacroChef app icon:
/// sage-green background + white Lucide Salad strokes.
struct BrandIconView: View {
    var size: CGFloat = 72

    private var cornerRadius: CGFloat { size * 0.20 }
    private var strokeWidth: CGFloat  { max(1, size * 0.055) }
    private var padding: CGFloat      { size * 0.20 }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(Color.brand)
                .frame(width: size, height: size)

            SaladShape()
                .stroke(
                    Color.white,
                    style: StrokeStyle(
                        lineWidth: strokeWidth,
                        lineCap: .round,
                        lineJoin: .round
                    )
                )
                .frame(width: size - padding * 2,
                       height: size - padding * 2)
        }
        .frame(width: size, height: size)
    }
}

#Preview {
    VStack(spacing: 24) {
        BrandIconView(size: 120)
        BrandIconView(size: 72)
        BrandIconView(size: 44)
    }
    .padding()
    .background(.gray.opacity(0.1))
}
