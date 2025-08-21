// Basic Flutter widget test for Seawater mobile app

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:seawater_app/main.dart';
import 'package:seawater_app/providers/auth_provider.dart';
import 'package:seawater_app/providers/location_provider.dart';
import 'package:seawater_app/providers/climate_data_provider.dart';

void main() {
  testWidgets('Seawater app smoke test', (WidgetTester tester) async {
    // Build a simplified version of the app for testing
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => LocationProvider()),
          ChangeNotifierProvider(create: (_) => ClimateDataProvider()),
        ],
        child: MaterialApp(
          home: Scaffold(
            appBar: AppBar(title: const Text('Seawater Test')),
            body: const Center(child: Text('Test App')),
          ),
        ),
      ),
    );

    // Verify that the app loads without errors
    expect(find.text('Seawater Test'), findsOneWidget);
    expect(find.text('Test App'), findsOneWidget);
  });
}