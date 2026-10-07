// Usage: label-strip <out.png> <frame.png|label> [<frame.png|label> ...]
// Lays frames side by side with a label under each. ffmpeg builds without drawtext
// and Python without PIL cannot draw text; AppKit ships with macOS.
import AppKit

let args = Array(CommandLine.arguments.dropFirst())
guard args.count >= 2 else {
  FileHandle.standardError.write("usage: label-strip <out.png> <frame.png|label>...\n".data(using: .utf8)!)
  exit(2)
}
let items = args.dropFirst().map { $0.split(separator: "|", maxSplits: 1).map(String.init) }
let images = items.map { item -> NSBitmapImageRep in
  guard let data = FileManager.default.contents(atPath: item[0]), let rep = NSBitmapImageRep(data: data) else {
    FileHandle.standardError.write("cannot read \(item[0])\n".data(using: .utf8)!)
    exit(1)
  }
  return rep
}
let width = images.map(\.pixelsWide).max()!
let height = images.map(\.pixelsHigh).max()!
let pad = 8, labelHeight = 34
let canvas = NSBitmapImageRep(
  bitmapDataPlanes: nil, pixelsWide: items.count * (width + pad) + pad, pixelsHigh: height + labelHeight + pad * 2,
  bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
  bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: canvas)
NSColor(white: 0.12, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: canvas.pixelsWide, height: canvas.pixelsHigh).fill()
let attributes: [NSAttributedString.Key: Any] = [
  .font: NSFont.monospacedSystemFont(ofSize: 20, weight: .semibold), .foregroundColor: NSColor.white,
]
for (index, image) in images.enumerated() {
  let x = pad + index * (width + pad)
  image.draw(in: NSRect(x: x, y: labelHeight + pad, width: image.pixelsWide, height: image.pixelsHigh))
  ((items[index].count > 1 ? items[index][1] : "") as NSString).draw(at: NSPoint(x: x + 4, y: 6), withAttributes: attributes)
}
NSGraphicsContext.restoreGraphicsState()
try canvas.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[0]))
