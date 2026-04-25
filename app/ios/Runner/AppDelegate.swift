import Flutter
import GoogleMaps
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    if let apiKey = loadGoogleMapsApiKey(), !apiKey.isEmpty {
      GMSServices.provideAPIKey(apiKey)
    }

    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  private func loadGoogleMapsApiKey() -> String? {
    guard let envPath = Bundle.main.path(forResource: ".env", ofType: nil, inDirectory: "flutter_assets"),
          let envContents = try? String(contentsOfFile: envPath, encoding: .utf8) else {
      return nil
    }

    for rawLine in envContents.components(separatedBy: .newlines) {
      let line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)

      if line.isEmpty || line.hasPrefix("#") {
        continue
      }

      let segments = line.split(separator: "=", maxSplits: 1).map(String.init)
      if segments.count == 2 && segments[0].trimmingCharacters(in: .whitespaces) == "GOOGLE_MAPS_API_KEY" {
        return segments[1].trimmingCharacters(in: CharacterSet(charactersIn: " \"'"))
      }
    }

    return nil
  }
}
