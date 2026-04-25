import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

@immutable
class NeonThemeTokens extends ThemeExtension<NeonThemeTokens> {
  const NeonThemeTokens({
    required this.glassOpacity,
    required this.backdropBlur,
    required this.cornerRadius,
    required this.blockGap,
    required this.sectionGap,
    required this.neonGlowOpacity,
    required this.ghostBorderOpacity,
  });

  final double glassOpacity;
  final double backdropBlur;
  final double cornerRadius;
  final double blockGap;
  final double sectionGap;
  final double neonGlowOpacity;
  final double ghostBorderOpacity;

  @override
  NeonThemeTokens copyWith({
    double? glassOpacity,
    double? backdropBlur,
    double? cornerRadius,
    double? blockGap,
    double? sectionGap,
    double? neonGlowOpacity,
    double? ghostBorderOpacity,
  }) {
    return NeonThemeTokens(
      glassOpacity: glassOpacity ?? this.glassOpacity,
      backdropBlur: backdropBlur ?? this.backdropBlur,
      cornerRadius: cornerRadius ?? this.cornerRadius,
      blockGap: blockGap ?? this.blockGap,
      sectionGap: sectionGap ?? this.sectionGap,
      neonGlowOpacity: neonGlowOpacity ?? this.neonGlowOpacity,
      ghostBorderOpacity: ghostBorderOpacity ?? this.ghostBorderOpacity,
    );
  }

  @override
  ThemeExtension<NeonThemeTokens> lerp(
    covariant ThemeExtension<NeonThemeTokens>? other,
    double t,
  ) {
    if (other is! NeonThemeTokens) {
      return this;
    }

    return NeonThemeTokens(
      glassOpacity: lerpDouble(glassOpacity, other.glassOpacity, t),
      backdropBlur: lerpDouble(backdropBlur, other.backdropBlur, t),
      cornerRadius: lerpDouble(cornerRadius, other.cornerRadius, t),
      blockGap: lerpDouble(blockGap, other.blockGap, t),
      sectionGap: lerpDouble(sectionGap, other.sectionGap, t),
      neonGlowOpacity: lerpDouble(neonGlowOpacity, other.neonGlowOpacity, t),
      ghostBorderOpacity: lerpDouble(
        ghostBorderOpacity,
        other.ghostBorderOpacity,
        t,
      ),
    );
  }

  static double lerpDouble(double a, double b, double t) => a + (b - a) * t;
}

class AppTheme {
  static const Color background = Color(0xFF050505);
  static const Color surface = Color(0xFF121214);
  static const Color surfaceLow = Color(0xFF0D0F12);
  static const Color surfaceHigh = Color(0xFF171A1F);
  static const Color surfaceHighest = Color(0xFF1D2128);
  static const Color primaryColor = Color(0xFF00F0FF);
  static const Color secondaryColor = Color(0xFFFF003C);
  static const Color accentColor = Color(0xFF5BFFB6);
  static const Color muted = Color(0xFF8A8A93);
  static const Color textPrimaryDark = Color(0xFFE5E2E1);
  static const Color textSecondaryDark = Color(0xFFB2B3BA);
  static const Color ghostOutline = Color(0xFF7B8496);

  static const Color backgroundLight = Color(0xFFF5FAFC);
  static const Color surfaceLight = Color(0xFFEAF8FB);
  static const Color surfaceLightHigh = Color(0xFFF8FDFF);
  static const Color textPrimaryLight = Color(0xFF06181C);
  static const Color textSecondaryLight = Color(0xFF48616B);
  static const Color borderLight = Color(0xFFB6D5DB);

  static const Color safetyHigh = primaryColor;
  static const Color safetyMedium = Color(0xFFFFB347);
  static const Color safetyLow = secondaryColor;

  static const Color likeColor = primaryColor;
  static const Color passColor = muted;
  static const Color waveColor = accentColor;
  static const Color success = primaryColor;
  static const Color error = secondaryColor;
  static const Color warning = Color(0xFFFF6A3D);

  static const NeonThemeTokens _darkTokens = NeonThemeTokens(
    glassOpacity: 0.6,
    backdropBlur: 28,
    cornerRadius: 4,
    blockGap: 16,
    sectionGap: 20,
    neonGlowOpacity: 0.22,
    ghostBorderOpacity: 0.15,
  );

  static const NeonThemeTokens _lightTokens = NeonThemeTokens(
    glassOpacity: 0.78,
    backdropBlur: 20,
    cornerRadius: 4,
    blockGap: 16,
    sectionGap: 20,
    neonGlowOpacity: 0.12,
    ghostBorderOpacity: 0.1,
  );

  static NeonThemeTokens tokens(BuildContext context) {
    return Theme.of(context).extension<NeonThemeTokens>() ?? _darkTokens;
  }

  static ThemeData get lightTheme => _buildTheme(Brightness.light);

  static ThemeData get darkTheme => _buildTheme(Brightness.dark);

  static ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final baseScheme = isDark ? _darkScheme : _lightScheme;
    final bodyText = _spaceGroteskTextTheme(baseScheme.onSurface);
    final textTheme = _buildTextTheme(bodyText, baseScheme.onSurface, isDark);
    final glowBase =
        isDark ? primaryColor : primaryColor.withValues(alpha: 0.7);
    final radius = BorderRadius.circular(4);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      primaryColor: baseScheme.primary,
      scaffoldBackgroundColor: baseScheme.surface,
      colorScheme: baseScheme,
      textTheme: textTheme,
      extensions: [isDark ? _darkTokens : _lightTokens],
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: baseScheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: _clashDisplay(
          color: baseScheme.onSurface,
          fontSize: 24,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.8,
        ),
        iconTheme: IconThemeData(color: baseScheme.onSurface, size: 22),
        actionsIconTheme: IconThemeData(color: baseScheme.onSurface, size: 22),
        systemOverlayStyle:
            isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      ),
      cardTheme: CardThemeData(
        color: baseScheme.surfaceContainerHigh,
        elevation: 0,
        margin: EdgeInsets.zero,
        shadowColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: radius),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: baseScheme.surface.withValues(
          alpha: isDark ? _darkTokens.glassOpacity : _lightTokens.glassOpacity,
        ),
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: radius),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: baseScheme.surface.withValues(
          alpha: isDark ? _darkTokens.glassOpacity : _lightTokens.glassOpacity,
        ),
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(4)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          shadowColor: Colors.transparent,
          backgroundColor: baseScheme.primary,
          foregroundColor: baseScheme.onPrimary,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: radius),
          textStyle: _spaceGrotesk(
            color: baseScheme.onPrimary,
            fontSize: 15,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.2,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          elevation: 0,
          shadowColor: Colors.transparent,
          foregroundColor: baseScheme.onSurface,
          side: BorderSide(
            color: baseScheme.outline.withValues(alpha: isDark ? 0.15 : 0.1),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: radius),
          textStyle: _spaceGrotesk(
            color: baseScheme.onSurface,
            fontSize: 15,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: baseScheme.primary,
          textStyle: _spaceGrotesk(
            color: baseScheme.primary,
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: false,
        contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 14),
        hintStyle: _spaceGrotesk(
          color: baseScheme.onSurfaceVariant,
          fontSize: 15,
          fontWeight: FontWeight.w400,
        ),
        labelStyle: _spaceGrotesk(
          color: baseScheme.onSurfaceVariant,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        enabledBorder: UnderlineInputBorder(
          borderSide: BorderSide(
            color: baseScheme.outline.withValues(alpha: isDark ? 0.25 : 0.4),
            width: 1,
          ),
        ),
        focusedBorder: UnderlineInputBorder(
          borderSide: BorderSide(color: baseScheme.primary, width: 1.8),
        ),
        errorBorder: UnderlineInputBorder(
          borderSide: BorderSide(color: baseScheme.error, width: 1.4),
        ),
        focusedErrorBorder: UnderlineInputBorder(
          borderSide: BorderSide(color: baseScheme.error, width: 1.8),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: baseScheme.surfaceContainerLow,
        elevation: 0,
        height: 68,
        shadowColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        indicatorColor:
            baseScheme.primary.withValues(alpha: isDark ? 0.18 : 0.12),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? baseScheme.primary : baseScheme.onSurfaceVariant,
            size: 22,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return _spaceGrotesk(
            color: selected ? baseScheme.primary : baseScheme.onSurfaceVariant,
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            letterSpacing: 1.1,
          );
        }),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: baseScheme.surfaceContainerHigh,
        selectedColor:
            baseScheme.primary.withValues(alpha: isDark ? 0.16 : 0.12),
        disabledColor: baseScheme.surfaceContainerLow,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        side: BorderSide.none,
        shape: RoundedRectangleBorder(borderRadius: radius),
        labelStyle: _spaceGrotesk(
          color: baseScheme.onSurface,
          fontSize: 12,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.8,
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: baseScheme.surfaceContainerHigh,
        contentTextStyle: _spaceGrotesk(
          color: baseScheme.onSurface,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        actionTextColor: baseScheme.primary,
        shape: RoundedRectangleBorder(borderRadius: radius),
        behavior: SnackBarBehavior.floating,
      ),
      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        tileColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: radius),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: baseScheme.primary,
        linearTrackColor: baseScheme.surfaceContainerHighest,
      ),
      dividerTheme: const DividerThemeData(
        color: Colors.transparent,
        thickness: 0,
        space: 0,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          return states.contains(WidgetState.selected)
              ? baseScheme.primary
              : baseScheme.onSurfaceVariant;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          return states.contains(WidgetState.selected)
              ? baseScheme.primary.withValues(alpha: 0.35)
              : baseScheme.surfaceContainerHighest;
        }),
      ),
      iconTheme: IconThemeData(color: baseScheme.onSurface),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: baseScheme.secondary,
        foregroundColor: baseScheme.onSecondary,
        elevation: 0,
        focusElevation: 0,
        hoverElevation: 0,
        splashColor: baseScheme.primary.withValues(alpha: 0.18),
      ),
      shadowColor: glowBase.withValues(alpha: isDark ? 0.2 : 0.1),
    );
  }

  static ColorScheme get _darkScheme => const ColorScheme.dark(
        primary: primaryColor,
        onPrimary: Color(0xFF00363A),
        primaryContainer: Color(0xFF00F0FF),
        onPrimaryContainer: Color(0xFF00363A),
        secondary: secondaryColor,
        onSecondary: Colors.white,
        secondaryContainer: Color(0xFFFF003C),
        onSecondaryContainer: Colors.white,
        tertiary: accentColor,
        onTertiary: Color(0xFF062B1F),
        surface: background,
        onSurface: textPrimaryDark,
        onSurfaceVariant: textSecondaryDark,
        surfaceContainerLowest: surfaceLow,
        surfaceContainerLow: surface,
        surfaceContainer: surfaceHigh,
        surfaceContainerHigh: surfaceHighest,
        surfaceContainerHighest: Color(0xFF252A33),
        outline: ghostOutline,
        error: secondaryColor,
        onError: Colors.white,
      );

  static ColorScheme get _lightScheme => const ColorScheme.light(
        primary: primaryColor,
        onPrimary: Color(0xFF00363A),
        primaryContainer: Color(0xFFB6FBFF),
        onPrimaryContainer: Color(0xFF00363A),
        secondary: secondaryColor,
        onSecondary: Colors.white,
        secondaryContainer: Color(0xFFFFD7E0),
        onSecondaryContainer: Color(0xFF4A0016),
        tertiary: accentColor,
        onTertiary: Color(0xFF062B1F),
        surface: backgroundLight,
        onSurface: textPrimaryLight,
        onSurfaceVariant: textSecondaryLight,
        surfaceContainerLowest: Color(0xFFF9FEFF),
        surfaceContainerLow: surfaceLight,
        surfaceContainer: Color(0xFFE0F3F8),
        surfaceContainerHigh: surfaceLightHigh,
        surfaceContainerHighest: Color(0xFFD8EDF3),
        outline: borderLight,
        error: secondaryColor,
        onError: Colors.white,
      );

  static TextTheme _spaceGroteskTextTheme(Color bodyColor) {
    return GoogleFonts.getTextTheme(
      'Space Grotesk',
      ThemeData(brightness: Brightness.dark).textTheme,
    ).apply(
      bodyColor: bodyColor,
      displayColor: bodyColor,
    );
  }

  static TextTheme _buildTextTheme(
    TextTheme base,
    Color bodyColor,
    bool isDark,
  ) {
    final metaColor = isDark ? textSecondaryDark : textSecondaryLight;

    return base.copyWith(
      displayLarge: _clashDisplay(
        color: bodyColor,
        fontSize: 56,
        fontWeight: FontWeight.w700,
        height: 0.95,
        letterSpacing: -1.6,
      ),
      displayMedium: _clashDisplay(
        color: bodyColor,
        fontSize: 44,
        fontWeight: FontWeight.w700,
        height: 0.98,
        letterSpacing: -1.1,
      ),
      headlineLarge: _clashDisplay(
        color: bodyColor,
        fontSize: 32,
        fontWeight: FontWeight.w700,
        height: 1,
        letterSpacing: -0.8,
      ),
      headlineMedium: _clashDisplay(
        color: bodyColor,
        fontSize: 24,
        fontWeight: FontWeight.w700,
        height: 1.05,
        letterSpacing: -0.5,
      ),
      titleLarge: _spaceGrotesk(
        color: bodyColor,
        fontSize: 18,
        fontWeight: FontWeight.w700,
      ),
      titleMedium: _spaceGrotesk(
        color: bodyColor,
        fontSize: 15,
        fontWeight: FontWeight.w600,
      ),
      bodyLarge: _spaceGrotesk(
        color: bodyColor,
        fontSize: 16,
        fontWeight: FontWeight.w400,
        height: 1.55,
      ),
      bodyMedium: _spaceGrotesk(
        color: bodyColor,
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.5,
      ),
      bodySmall: _spaceGrotesk(
        color: metaColor,
        fontSize: 12,
        fontWeight: FontWeight.w400,
        height: 1.45,
      ),
      labelLarge: _spaceGrotesk(
        color: bodyColor,
        fontSize: 13,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.0,
      ),
      labelMedium: _spaceGrotesk(
        color: metaColor,
        fontSize: 11,
        fontWeight: FontWeight.w600,
        letterSpacing: 1.1,
      ),
      labelSmall: _spaceGrotesk(
        color: metaColor,
        fontSize: 10,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.4,
      ),
    );
  }

  static TextStyle _clashDisplay({
    required Color color,
    required double fontSize,
    required FontWeight fontWeight,
    double? height,
    double? letterSpacing,
  }) {
    return GoogleFonts.getFont(
      'Chakra Petch',
      color: color,
      fontSize: fontSize,
      fontWeight: fontWeight,
      height: height,
      letterSpacing: letterSpacing,
    );
  }

  static TextStyle _spaceGrotesk({
    required Color color,
    required double fontSize,
    required FontWeight fontWeight,
    double? height,
    double? letterSpacing,
  }) {
    return GoogleFonts.getFont(
      'Space Grotesk',
      color: color,
      fontSize: fontSize,
      fontWeight: fontWeight,
      height: height,
      letterSpacing: letterSpacing,
    );
  }

  static List<BoxShadow> neonGlow(
    Color color, {
    double blur = 20,
    double spread = 0,
    double opacity = 0.22,
  }) {
    return [
      BoxShadow(
        color: color.withValues(alpha: opacity),
        blurRadius: blur,
        spreadRadius: spread,
        offset: const Offset(0, 0),
      ),
    ];
  }

  static LinearGradient get profileCardGradient => LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          Colors.transparent,
          Colors.transparent,
          background.withValues(alpha: 0.7),
          surface,
        ],
        stops: const [0, 0.45, 0.78, 1],
      );
}
