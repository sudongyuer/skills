import AVFoundation
import CoreMediaIO
import Foundation

// Usage: screencap <out.mov> <seconds> [device-name-substring]
// Records a USB-connected iPhone's screen (variable frame rate, up to 120fps).
// Prints "RECORDING" once frames are being written, then "done ok" or "done <error>".

// iOS devices only appear as capture devices after this opt-in.
var prop = CMIOObjectPropertyAddress(
  mSelector: CMIOObjectPropertySelector(kCMIOHardwarePropertyAllowScreenCaptureDevices),
  mScope: CMIOObjectPropertyScope(kCMIOObjectPropertyScopeGlobal),
  mElement: CMIOObjectPropertyElement(kCMIOObjectPropertyElementMain))
var allow: UInt32 = 1
CMIOObjectSetPropertyData(
  CMIOObjectID(kCMIOObjectSystemObject), &prop, 0, nil, UInt32(MemoryLayout<UInt32>.size), &allow)

let args = CommandLine.arguments
guard args.count >= 3 else {
  print("usage: screencap <out.mov> <seconds> [device-name-substring]"); exit(64)
}
let out = URL(fileURLWithPath: args[1])
let seconds = Double(args[2]) ?? 10
let wanted = args.count > 3 ? args[3] : ""

func candidates() -> [AVCaptureDevice] {
  AVCaptureDevice.DiscoverySession(
    deviceTypes: [.external], mediaType: .muxed, position: .unspecified
  ).devices
}

// The device list fills in asynchronously; it is empty unless the run loop spins.
var device: AVCaptureDevice?
for _ in 0..<60 {
  let ds = candidates()
  device = wanted.isEmpty ? ds.first : ds.first { $0.localizedName.contains(wanted) }
  if device != nil { break }
  RunLoop.current.run(until: Date().addingTimeInterval(0.25))
}
guard let device else {
  for d in candidates() { print("seen:", d.localizedName) }
  print("NO_DEVICE"); exit(2)
}
print("device:", device.localizedName)

let session = AVCaptureSession()
session.addInput(try AVCaptureDeviceInput(device: device))
let output = AVCaptureMovieFileOutput()
session.addOutput(output)

final class Delegate: NSObject, AVCaptureFileOutputRecordingDelegate {
  func fileOutput(
    _ o: AVCaptureFileOutput, didFinishRecordingTo u: URL, from c: [AVCaptureConnection],
    error: Error?
  ) {
    print("done", error?.localizedDescription ?? "ok"); exit(0)
  }
}
let delegate = Delegate()
session.startRunning()
// Starting to record right after startRunning fails with "Cannot Record".
RunLoop.current.run(until: Date().addingTimeInterval(1.0))
try? FileManager.default.removeItem(at: out)
output.startRecording(to: out, recordingDelegate: delegate)
print("RECORDING")
fflush(stdout)
DispatchQueue.main.asyncAfter(deadline: .now() + seconds) { output.stopRecording() }
RunLoop.main.run()
