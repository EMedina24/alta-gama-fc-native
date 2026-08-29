#
# The app target's ONLY native code (ADR 0056).
#
# ⚠ `@bacons/apple-targets` builds EXTENSIONS. It has no way to put Swift in the
# app itself, and `Activity.pushToStartTokenUpdates` has to run in the app
# process — which is the entire reason this module exists.
#
# ⚠ Autolinked from `./modules`, which is `expo-modules-autolinking`'s default
# `nativeModulesDir`. Nothing in `package.json` points at it and nothing needs to.
#
# ⚠ **Swift here does NOT violate ADR 0025.** That decision forbids committing a
# prebuilt `ios/`; a local module is an INPUT to prebuild, like `targets/`, and
# CNG regenerates around it.
#
Pod::Spec.new do |s|
  s.name           = 'LiveActivity'
  s.version        = '1.0.0'
  s.summary        = 'Push-to-start token plumbing for the match Live Activity'
  s.license        = 'MIT'
  s.author         = ''
  s.homepage       = 'https://altagamafc.com'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # ⚠⚠ **`MatchAttributes.swift` in this folder is a SYMLINK, not a file.**
  # The type must be identical here and in the widget extension — the extension
  # gets it because the plugin links `targets/_shared/` into every target, and
  # this pod gets the very same file through the link, so there is ONE
  # declaration rather than two that drift silently (trap 15).
  #
  # ⚠ **CocoaPods DID refuse the escape**, silently — a `source_files` entry that
  # points outside the pod root is dropped with no warning, and the symptom is
  # `cannot find type 'MatchAttributes' in scope` at LiveActivityModule.swift:73,
  # not a pod error. Verified: `grep -c MatchAttributes
  # ios/Pods/Pods.xcodeproj/project.pbxproj` returned 0.
  #
  # The fix is `MatchAttributes.swift` in this folder as a SYMLINK to
  # `targets/_shared/`, picked up by the `**/*.swift` glob below like any real
  # file. Deliberately NOT the copy this comment used to nominate: a copy is the
  # fourth source of truth of a type whose whole contract is being identical in
  # both processes. The symlink keeps ONE declaration, which is what this pod
  # wanted in the first place.
  #
  # ⚠ Do not "tidy" the symlink into a file, and do not re-add the `../../../`
  # path — it reads as though it works and compiles to nothing.
  s.source_files = '**/*.{h,m,mm,swift}'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
